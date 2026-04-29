const BASE = 'https://api.github.com'
const CACHE_TTL = 60 * 60 * 1000
const FETCH_TIMEOUT = 12_000

function cacheKey(url) { return `gh_cache_${url}` }

function fromCache(url) {
  try {
    const raw = localStorage.getItem(cacheKey(url))
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(cacheKey(url)); return null }
    return data
  } catch { return null }
}

function toCache(url, data) {
  try {
    const serialized = JSON.stringify({ ts: Date.now(), data })
    if (serialized.length > 2_000_000) return
    localStorage.setItem(cacheKey(url), serialized)
  } catch {}
}

function headers(token) {
  const h = { Accept: 'application/vnd.github+json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function fetchWithTimeout(url, opts) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function get(url, token, retries = 2) {
  const cached = fromCache(url)
  if (cached) return cached

  const res = await fetchWithTimeout(url, { headers: headers(token) })

  if (res.status === 202) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 2500))
      return get(url, token, retries - 1)
    }
    // GitHub still computing stats — return empty rather than crash
    return null
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  const data = await res.json()
  toCache(url, data)
  return data
}

async function getPaginated(url, token, maxPages = 3) {
  let results = []
  let page = 1
  while (page <= maxPages) {
    const sep = url.includes('?') ? '&' : '?'
    const pageUrl = `${url}${sep}per_page=100&page=${page}`
    const data = await get(pageUrl, token)
    if (!Array.isArray(data) || data.length === 0) break
    results = results.concat(data)
    if (data.length < 100) break
    page++
  }
  return results
}

// Wraps a promise so it never rejects — returns { data, error }
export async function safe(promise, fallback = []) {
  try {
    const data = await promise
    return { data: data ?? fallback, error: null }
  } catch (e) {
    return { data: fallback, error: e.message || String(e) }
  }
}

export async function fetchRepoInfo(owner, repo, token) {
  return get(`${BASE}/repos/${owner}/${repo}`, token)
}

export async function fetchContributors(owner, repo, token) {
  return getPaginated(`${BASE}/repos/${owner}/${repo}/contributors`, token, 1)
}

export async function fetchCommits(owner, repo, token) {
  return getPaginated(`${BASE}/repos/${owner}/${repo}/commits`, token, 3)
}

export async function fetchPullRequests(owner, repo, token) {
  const [open, closed] = await Promise.all([
    getPaginated(`${BASE}/repos/${owner}/${repo}/pulls?state=open`, token, 2),
    getPaginated(`${BASE}/repos/${owner}/${repo}/pulls?state=closed`, token, 2),
  ])
  return { open, closed }
}

export async function fetchIssues(owner, repo, token) {
  const [open, closed] = await Promise.all([
    getPaginated(`${BASE}/repos/${owner}/${repo}/issues?state=open`, token, 1),
    getPaginated(`${BASE}/repos/${owner}/${repo}/issues?state=closed`, token, 1),
  ])
  return {
    open: open.filter(i => !i.pull_request),
    closed: closed.filter(i => !i.pull_request),
  }
}

export async function fetchLanguages(owner, repo, token) {
  return get(`${BASE}/repos/${owner}/${repo}/languages`, token)
}

export async function fetchBranches(owner, repo, token) {
  return getPaginated(`${BASE}/repos/${owner}/${repo}/branches`, token, 1)
}

export async function fetchCollaborators(owner, repo, token) {
  return getPaginated(`${BASE}/repos/${owner}/${repo}/collaborators`, token, 2)
}

export function clearCache() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('gh_cache_'))
    .forEach(k => localStorage.removeItem(k))
}

export function getRateLimit(token) {
  return get(`${BASE}/rate_limit`, token)
}

async function fetchContents(owner, repo, path, token) {
  const url = path
    ? `${BASE}/repos/${owner}/${repo}/contents/${path}`
    : `${BASE}/repos/${owner}/${repo}/contents`
  return get(url, token)
}

function decodeBase64(str) {
  try { return atob(str.replace(/\n/g, '')) } catch { return '' }
}

// Fetch workflow YAML via API (base64) — get() only handles JSON, so we use a dedicated fetch
async function fetchWorkflowText(owner, repo, filename, token) {
  try {
    const res = await fetchWithTimeout(
      `${BASE}/repos/${owner}/${repo}/contents/.github/workflows/${filename}`,
      { headers: headers(token) }
    )
    if (!res.ok) return ''
    const json = await res.json()
    return json?.content ? decodeBase64(json.content).toLowerCase() : ''
  } catch { return '' }
}

async function fetchPkgJson(owner, repo, path, token) {
  const res = await safe(fetchContents(owner, repo, path, token), null)
  if (!res.data?.content) return null
  try { return JSON.parse(decodeBase64(res.data.content)) } catch { return null }
}

export async function fetchQualitySignals(owner, repo, token) {
  // 1. Listing racine (fichiers + dossiers)
  const rootContents = await safe(fetchContents(owner, repo, '', token), [])
  const rootEntries  = Array.isArray(rootContents.data) ? rootContents.data : []
  const rootNames    = rootEntries.map(f => f.name.toLowerCase())
  const rootDirs     = rootEntries.filter(f => f.type === 'dir').map(f => f.name.toLowerCase())

  // 2. package.json racine
  const rootPkg = rootNames.includes('package.json')
    ? await fetchPkgJson(owner, repo, 'package.json', token)
    : null

  // 3. Monorepo : package.json des sous-dossiers courants
  const MONOREPO_DIRS = ['frontend', 'backend', 'client', 'server', 'app', 'web', 'api', 'packages', 'apps']
  const subDirsToCheck = MONOREPO_DIRS.filter(d => rootDirs.includes(d))

  const subPkgs = await Promise.all(
    subDirsToCheck.map(d => fetchPkgJson(owner, repo, `${d}/package.json`, token))
  )

  // Fusion de tous les package.json trouvés
  const allPkgJsons = [rootPkg, ...subPkgs].filter(Boolean)

  const mergedDeps = {}
  const mergedScripts = {}
  let mergedPkgKeys = {}
  allPkgJsons.forEach(pkg => {
    Object.assign(mergedDeps, pkg.dependencies || {}, pkg.devDependencies || {}, pkg.peerDependencies || {})
    Object.assign(mergedScripts, pkg.scripts || {})
    Object.assign(mergedPkgKeys, pkg)
  })

  // 4. Fichiers de config dans les sous-dossiers (vitest.config.ts en backend/, etc.)
  const subDirFiles = (await Promise.all(
    subDirsToCheck.map(d =>
      safe(fetchContents(owner, repo, d, token), [])
        .then(r => (Array.isArray(r.data) ? r.data.map(f => f.name.toLowerCase()) : []))
    )
  )).flat()

  const allFiles = [...rootNames, ...subDirFiles]

  // 5. Workflows listing
  const workflowsRaw  = await safe(fetchContents(owner, repo, '.github/workflows', token), [])
  const workflowFiles = Array.isArray(workflowsRaw.data) ? workflowsRaw.data.filter(f => /\.ya?ml$/i.test(f.name)) : []

  // 6. Contenu YAML des 4 premiers workflows
  const workflowTexts = (
    await Promise.all(workflowFiles.slice(0, 4).map(f => fetchWorkflowText(owner, repo, f.name, token)))
  ).join('\n')

  // ── Helpers ──────────────────────────────────────────────────
  const scriptText = Object.values(mergedScripts).join(' ').toLowerCase()

  const hasDep    = (...names) => names.some(n => n in mergedDeps)
  const hasFile   = (...names) => names.some(n => allFiles.includes(n.toLowerCase()))
  const hasDir    = (...names) => names.some(n => rootDirs.includes(n.toLowerCase()))
  const hasPkg    = (key)     => allPkgJsons.some(p => !!(p?.[key]))
  const hasScript = (...kws)  => kws.some(k => scriptText.includes(k))
  const ciHas     = (...kws)  => kws.some(k => workflowTexts.includes(k))

  // ── Détection ────────────────────────────────────────────────
  const signals = {
    // Tests
    jest:      hasDep('jest', '@jest/core') || hasFile('jest.config.js', 'jest.config.ts', 'jest.config.mjs', 'jest.config.cjs') || hasPkg('jest') || hasScript('jest'),
    vitest:    hasDep('vitest') || hasFile('vitest.config.js', 'vitest.config.ts', 'vitest.config.mjs', 'vitest.config.cjs') || hasScript('vitest'),
    mocha:     hasDep('mocha') || hasFile('.mocharc.js', '.mocharc.yml', '.mocharc.json', '.mocharc.cjs') || hasScript('mocha'),
    pytest:    hasFile('pytest.ini', 'setup.cfg', 'conftest.py', 'pyproject.toml') || hasDir('tests', 'test'),
    goTest:    hasFile('go.mod'),
    phpunit:   hasFile('phpunit.xml', 'phpunit.xml.dist'),
    rspec:     hasFile('spec') || hasDir('spec'),
    cypress:   hasDep('cypress') || hasFile('cypress.config.js', 'cypress.config.ts') || hasDir('cypress'),
    playwright:hasDep('@playwright/test') || hasFile('playwright.config.js', 'playwright.config.ts'),
    testDirs:  hasDir('__tests__', 'tests', 'test', 'spec', 'e2e', '__test__'),
    scriptTest:hasScript('jest', 'vitest', 'mocha', 'pytest', 'ava', 'jasmine', 'cypress run', 'playwright test'),

    // Qualité code
    prettier:    hasDep('prettier') || hasFile('.prettierrc', '.prettierrc.js', '.prettierrc.json', '.prettierrc.yml', '.prettierrc.yaml', '.prettierrc.cjs', '.prettierrc.mjs', 'prettier.config.js', 'prettier.config.mjs', 'prettier.config.cjs') || hasPkg('prettier'),
    eslint:      hasDep('eslint') || hasFile('.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.cjs', '.eslintrc.mjs', 'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs') || hasPkg('eslintConfig'),
    typescript:  hasDep('typescript') || hasFile('tsconfig.json', 'tsconfig.base.json', 'tsconfig.app.json') || subDirFiles.includes('tsconfig.json'),
    husky:       hasDep('husky') || hasDir('.husky') || hasPkg('husky'),
    lintStaged:  hasDep('lint-staged') || hasPkg('lint-staged'),
    editorconfig:hasFile('.editorconfig'),
    commitlint:  hasDep('@commitlint/cli', '@commitlint/config-conventional') || hasFile('commitlint.config.js', 'commitlint.config.ts', 'commitlint.config.cjs', 'commitlint.config.mjs', '.commitlintrc', '.commitlintrc.js', '.commitlintrc.json', '.commitlintrc.yml') || hasPkg('commitlint'),

    // CI
    ciHasTests:    ciHas('npm test', 'yarn test', 'pnpm test', 'npx vitest', 'jest', 'vitest', 'pytest', 'go test', 'phpunit', 'rspec', 'cypress', 'playwright'),
    ciHasLint:     ciHas('eslint', 'npm run lint', 'yarn lint', 'pnpm lint', 'flake8', 'golangci', 'rubocop'),
    ciHasPrettier: ciHas('prettier', 'npm run format', 'yarn format', 'pnpm format', 'format:check'),
    ciHasBuild:    ciHas('npm run build', 'yarn build', 'pnpm build', 'go build', 'cargo build', 'vite build'),
    ciHasTypecheck:ciHas('tsc --no', 'type-check', 'typecheck', 'vue-tsc'),

    // Méta
    hasWorkflows:   workflowFiles.length > 0,
    workflowCount:  workflowFiles.length,
    workflowNames:  workflowFiles.map(f => f.name.replace(/\.ya?ml$/, '')),
    pkgScripts:     mergedScripts,
    hasPackageJson: allPkgJsons.length > 0,
    isMonorepo:     subDirsToCheck.length > 0 && subPkgs.some(Boolean),
  }

  // ── Score ─────────────────────────────────────────────────────
  const hasTests = signals.jest || signals.vitest || signals.mocha || signals.pytest
    || signals.goTest || signals.phpunit || signals.rspec
    || signals.testDirs || signals.scriptTest

  const scoreItems = [
    { key: 'tests',       label: 'Tests configurés',         ok: hasTests,               weight: 20, category: 'tests' },
    { key: 'ciTests',     label: 'Tests lancés en CI',       ok: signals.ciHasTests,     weight: 20, category: 'ci' },
    { key: 'eslint',      label: 'Linter (ESLint)',           ok: signals.eslint,         weight: 12, category: 'quality' },
    { key: 'ciLint',      label: 'Lint en CI',               ok: signals.ciHasLint,      weight: 8,  category: 'ci' },
    { key: 'prettier',    label: 'Prettier',                  ok: signals.prettier,       weight: 8,  category: 'quality' },
    { key: 'typescript',  label: 'TypeScript',               ok: signals.typescript,     weight: 8,  category: 'quality' },
    { key: 'husky',       label: 'Pre-commit hooks (Husky)', ok: signals.husky,          weight: 6,  category: 'quality' },
    { key: 'lintStaged',  label: 'lint-staged',              ok: signals.lintStaged,     weight: 4,  category: 'quality' },
    { key: 'commitlint',  label: 'Commitlint',               ok: signals.commitlint,     weight: 6,  category: 'quality' },
    { key: 'editorconfig',label: 'EditorConfig',             ok: signals.editorconfig,   weight: 4,  category: 'quality' },
    { key: 'ciBuild',     label: 'Build vérifié en CI',      ok: signals.ciHasBuild,     weight: 2,  category: 'ci' },
    { key: 'ciTypecheck', label: 'Type-check en CI',         ok: signals.ciHasTypecheck, weight: 2,  category: 'ci' },
  ]

  const totalWeight  = scoreItems.reduce((s, i) => s + i.weight, 0)
  const earnedWeight = scoreItems.filter(i => i.ok).reduce((s, i) => s + i.weight, 0)
  const score = Math.round((earnedWeight / totalWeight) * 100)

  return { signals, scoreItems, score, hasTests }
}

export async function fetchTestFiles(owner, repo, token) {
  // Cherche des fichiers de test réels dans le repo via l'API code search
  const queries = [
    `repo:${owner}/${repo}+filename:.test.`,   // *.test.js / *.test.ts / etc.
    `repo:${owner}/${repo}+filename:.spec.`,    // *.spec.js / *.spec.ts / etc.
    `repo:${owner}/${repo}+filename:_test.go`,  // Go
    `repo:${owner}/${repo}+filename:test_.py`,  // Python
    `repo:${owner}/${repo}+filename:conftest.py`,
  ]

  const results = await Promise.all(
    queries.map(q =>
      safe(get(`${BASE}/search/code?q=${q}&per_page=1`, token), { total_count: 0 })
    )
  )

  const totalFiles = results.reduce((sum, r) => sum + (r.data?.total_count || 0), 0)

  // Récupère un échantillon de fichiers trouvés pour afficher des exemples
  const firstResult = results.find(r => (r.data?.total_count || 0) > 0)
  const examples = firstResult?.data?.items?.map(f => f.path) || []

  return {
    count: totalFiles,
    hasRealTests: totalFiles > 0,
    examples,
  }
}

export async function fetchMilestones(owner, repo, token) {
  const [open, closed] = await Promise.all([
    getPaginated(`${BASE}/repos/${owner}/${repo}/milestones?state=open&sort=due_on&direction=asc`, token, 1),
    getPaginated(`${BASE}/repos/${owner}/${repo}/milestones?state=closed&sort=due_on&direction=desc`, token, 1),
  ])
  return { open, closed }
}

export async function fetchWorkflowRuns(owner, repo, token) {
  const data = await get(`${BASE}/repos/${owner}/${repo}/actions/runs?per_page=30`, token)
  return data?.workflow_runs || []
}

export async function fetchPRReviewComments(owner, repo, token) {
  return getPaginated(`${BASE}/repos/${owner}/${repo}/pulls/comments?sort=created&direction=desc`, token, 1)
}

export async function searchRepos(query, token, perPage = 8) {
  if (!query || query.trim().length < 2) return []
  const url = `${BASE}/search/repositories?q=${encodeURIComponent(query.trim())}&sort=stars&order=desc&per_page=${perPage}`
  const data = await get(url, token)
  return data?.items || []
}

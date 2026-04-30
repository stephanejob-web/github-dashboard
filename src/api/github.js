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

// Fetch any file content as decoded lowercase text
async function fetchFileText(owner, repo, path, token) {
  try {
    const res = await fetchWithTimeout(
      `${BASE}/repos/${owner}/${repo}/contents/${path}`,
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
  allPkgJsons.forEach(pkg => {
    Object.assign(mergedDeps, pkg.dependencies || {}, pkg.devDependencies || {}, pkg.peerDependencies || {})
    Object.assign(mergedScripts, pkg.scripts || {})
  })

  // 4. Fichiers de config dans les sous-dossiers
  const subDirFiles = (await Promise.all(
    subDirsToCheck.map(d =>
      safe(fetchContents(owner, repo, d, token), [])
        .then(r => (Array.isArray(r.data) ? r.data.map(f => f.name.toLowerCase()) : []))
    )
  )).flat()

  const allFiles = [...rootNames, ...subDirFiles]

  // 5. Workflows listing + contenu YAML des 4 premiers
  const workflowsRaw  = await safe(fetchContents(owner, repo, '.github/workflows', token), [])
  const workflowFiles = Array.isArray(workflowsRaw.data) ? workflowsRaw.data.filter(f => /\.ya?ml$/i.test(f.name)) : []
  const workflowTexts = (
    await Promise.all(workflowFiles.slice(0, 4).map(f => fetchWorkflowText(owner, repo, f.name, token)))
  ).join('\n')

  // 6. Contenu des hooks Husky (vérification réelle que les hooks sont branchés)
  const [huskyPreCommit, huskyCommitMsg, huskyPrePush] = await Promise.all([
    fetchFileText(owner, repo, '.husky/pre-commit', token),
    fetchFileText(owner, repo, '.husky/commit-msg', token),
    fetchFileText(owner, repo, '.husky/pre-push', token),
  ])
  const allHuskyContent = huskyPreCommit + huskyCommitMsg + huskyPrePush

  // 7. Contenu tsconfig.json pour vérifier strict mode
  const tsconfigText = await fetchFileText(owner, repo, 'tsconfig.json', token)

  // ── Helpers ──────────────────────────────────────────────────
  const scriptText = Object.values(mergedScripts).join(' ').toLowerCase()

  const hasDep    = (...names) => names.some(n => n in mergedDeps)
  const hasFile   = (...names) => names.some(n => allFiles.includes(n.toLowerCase()))
  const hasDir    = (...names) => names.some(n => rootDirs.includes(n.toLowerCase()))
  const hasPkg    = (key)      => allPkgJsons.some(p => !!(p?.[key]))
  const hasScript = (...kws)   => kws.some(k => scriptText.includes(k))
  const ciHas     = (...kws)   => kws.some(k => workflowTexts.includes(k))

  // ── Détection stricte ─────────────────────────────────────────

  // Tests : framework détecté
  const jestInstalled      = hasDep('jest', '@jest/core') || hasFile('jest.config.js', 'jest.config.ts', 'jest.config.mjs', 'jest.config.cjs') || hasPkg('jest')
  const vitestInstalled    = hasDep('vitest') || hasFile('vitest.config.js', 'vitest.config.ts', 'vitest.config.mjs', 'vitest.config.cjs')
  const mochaInstalled     = hasDep('mocha') || hasFile('.mocharc.js', '.mocharc.yml', '.mocharc.json', '.mocharc.cjs')
  const pytestInstalled    = hasFile('pytest.ini', 'conftest.py', 'pyproject.toml') || hasDir('tests', 'test')
  const goTestInstalled    = hasFile('go.mod')
  const phpunitInstalled   = hasFile('phpunit.xml', 'phpunit.xml.dist')
  const rspecInstalled     = hasDir('spec')
  const testDirsExist      = hasDir('__tests__', 'tests', 'test', 'spec', 'e2e', '__test__')
  const scriptHasTest      = hasScript('jest', 'vitest', 'mocha', 'pytest', 'ava', 'jasmine', 'cypress run', 'playwright test')

  // ESLint : installé ET (script lint présent OU CI lint)
  const eslintInstalled = hasDep('eslint') || hasFile('.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.cjs', '.eslintrc.mjs', 'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs') || hasPkg('eslintConfig')
  const eslintActive    = eslintInstalled && (hasScript('eslint', 'lint') || ciHas('eslint', 'npm run lint', 'yarn lint', 'pnpm lint', 'flake8', 'golangci', 'rubocop'))

  // Prettier : installé ET (script format présent OU CI prettier)
  const prettierInstalled = hasDep('prettier') || hasFile('.prettierrc', '.prettierrc.js', '.prettierrc.json', '.prettierrc.yml', '.prettierrc.yaml', '.prettierrc.cjs', '.prettierrc.mjs', 'prettier.config.js', 'prettier.config.mjs', 'prettier.config.cjs') || hasPkg('prettier')
  const prettierActive    = prettierInstalled && (hasScript('prettier', 'format') || ciHas('prettier', 'npm run format', 'yarn format', 'pnpm format', 'format:check'))

  // TypeScript : installé ET (strict:true dans tsconfig OU typecheck en CI OU script tsc)
  const tsInstalled    = hasDep('typescript') || hasFile('tsconfig.json', 'tsconfig.base.json', 'tsconfig.app.json') || subDirFiles.includes('tsconfig.json')
  const tsStrict       = tsconfigText.includes('"strict": true') || tsconfigText.includes('"strict":true')
  const tsChecked      = ciHas('tsc --no', 'type-check', 'typecheck', 'vue-tsc') || hasScript('typecheck', 'type-check', 'tsc --no')
  const typescriptActive = tsInstalled && (tsStrict || tsChecked)

  // Husky : .husky/ présent ET au moins un hook non-vide (pas juste installé)
  const huskyInstalled = hasDep('husky') || hasDir('.husky') || hasPkg('husky')
  const huskyActive    = huskyInstalled && allHuskyContent.trim().length > 20

  // lint-staged : installé ET Husky pre-commit l'appelle réellement
  const lintStagedInstalled = hasDep('lint-staged') || hasPkg('lint-staged')
  const lintStagedActive    = lintStagedInstalled && huskyPreCommit.includes('lint-staged')

  // Commitlint : config présente ET hook commit-msg appelle commitlint
  const commitlintInstalled = hasDep('@commitlint/cli', '@commitlint/config-conventional') || hasFile('commitlint.config.js', 'commitlint.config.ts', 'commitlint.config.cjs', 'commitlint.config.mjs', '.commitlintrc', '.commitlintrc.js', '.commitlintrc.json', '.commitlintrc.yml') || hasPkg('commitlint')
  const commitlintActive    = commitlintInstalled && huskyCommitMsg.includes('commitlint')

  // CI
  const ciHasTests    = ciHas('npm test', 'yarn test', 'pnpm test', 'npx vitest', 'jest', 'vitest', 'pytest', 'go test', 'phpunit', 'rspec', 'cypress', 'playwright')
  const ciHasLint     = ciHas('eslint', 'npm run lint', 'yarn lint', 'pnpm lint', 'flake8', 'golangci', 'rubocop')
  const ciHasPrettier = ciHas('prettier', 'npm run format', 'yarn format', 'pnpm format', 'format:check')
  const ciHasBuild    = ciHas('npm run build', 'yarn build', 'pnpm build', 'go build', 'cargo build', 'vite build')
  const ciHasTypecheck= ciHas('tsc --no', 'type-check', 'typecheck', 'vue-tsc')

  const signals = {
    jest: jestInstalled, vitest: vitestInstalled, mocha: mochaInstalled,
    pytest: pytestInstalled, goTest: goTestInstalled, phpunit: phpunitInstalled,
    rspec: rspecInstalled, testDirs: testDirsExist, scriptTest: scriptHasTest,
    cypress:    hasDep('cypress') || hasFile('cypress.config.js', 'cypress.config.ts') || hasDir('cypress'),
    playwright: hasDep('@playwright/test') || hasFile('playwright.config.js', 'playwright.config.ts'),

    // Qualité — signaux bruts (pour badges)
    eslintInstalled, prettierInstalled, tsInstalled,
    huskyInstalled, lintStagedInstalled, commitlintInstalled,

    // Qualité — signaux stricts (pour score)
    eslint:      eslintActive,
    prettier:    prettierActive,
    typescript:  typescriptActive,
    husky:       huskyActive,
    lintStaged:  lintStagedActive,
    commitlint:  commitlintActive,
    editorconfig:hasFile('.editorconfig'),

    // Détails Husky (pour affichage)
    huskyHooks: {
      preCommit: huskyPreCommit.trim().length > 10,
      commitMsg: huskyCommitMsg.trim().length > 10,
      prePush:   huskyPrePush.trim().length > 10,
    },

    // TypeScript détails
    tsStrict, tsChecked,

    ciHasTests, ciHasLint, ciHasPrettier, ciHasBuild, ciHasTypecheck,
    hasWorkflows:   workflowFiles.length > 0,
    workflowCount:  workflowFiles.length,
    workflowNames:  workflowFiles.map(f => f.name.replace(/\.ya?ml$/, '')),
    pkgScripts:     mergedScripts,
    hasPackageJson: allPkgJsons.length > 0,
    isMonorepo:     subDirsToCheck.length > 0 && subPkgs.some(Boolean),
  }

  // ── Détection écosystème ──────────────────────────────────────
  const isJS      = allPkgJsons.length > 0
  const isPython  = hasFile('requirements.txt', 'setup.py', 'setup.cfg', 'pyproject.toml', 'pipfile', 'poetry.lock') || hasDir('venv', '.venv')
  const isGo      = hasFile('go.mod', 'go.sum')
  const isRuby    = hasFile('gemfile', 'gemfile.lock', '.ruby-version')
  const isJava    = hasFile('pom.xml', 'build.gradle', 'build.gradle.kts')
  const isCSharp  = rootNames.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))
  const isC       = rootNames.some(f => f.endsWith('.c') || f.endsWith('.h')) || hasFile('cmakelists.txt', 'makefile')
  const isCpp     = rootNames.some(f => f.endsWith('.cpp') || f.endsWith('.cc')) || hasFile('cmakelists.txt')
  const isRust    = hasFile('cargo.toml')
  const isPhp     = hasFile('composer.json')

  // Linter/formatter par écosystème (non-JS)
  const ciHasNonJsLint = ciHas('flake8', 'pylint', 'ruff', 'mypy', 'golangci', 'staticcheck', 'rubocop', 'phpcs', 'checkstyle', 'spotbugs', 'clippy', 'cppcheck', 'clang-tidy')
  const ciHasNonJsFmt  = ciHas('black', 'isort', 'autopep8', 'gofmt', 'rustfmt', 'clang-format', 'php-cs-fixer')

  // Tests par écosystème
  const hasTests = jestInstalled || vitestInstalled || mochaInstalled || pytestInstalled
    || goTestInstalled || phpunitInstalled || rspecInstalled
    || testDirsExist || scriptHasTest

  // ── Score adapté à l'écosystème ───────────────────────────────
  // Items universels (tout projet)
  const universalItems = [
    { key: 'tests',    label: 'Tests configurés',   ok: hasTests,   weight: 20, category: 'tests' },
    { key: 'ciTests',  label: 'Tests lancés en CI', ok: ciHasTests, weight: 20, category: 'ci' },
    { key: 'ciBuild',  label: 'Build vérifié en CI',ok: ciHasBuild, weight: 6,  category: 'ci' },
    { key: 'editorconfig', label: 'EditorConfig',   ok: signals.editorconfig, weight: 4, category: 'quality' },
  ]

  // Items JS/TS uniquement
  const jsItems = isJS ? [
    { key: 'eslint',      label: 'ESLint actif (installé + script)',   ok: eslintActive,      weight: 12, category: 'quality' },
    { key: 'ciLint',      label: 'Lint en CI',                         ok: ciHasLint,         weight: 8,  category: 'ci' },
    { key: 'prettier',    label: 'Prettier actif (installé + script)', ok: prettierActive,    weight: 8,  category: 'quality' },
    { key: 'typescript',  label: 'TypeScript strict ou vérifié',       ok: typescriptActive,  weight: 8,  category: 'quality' },
    { key: 'husky',       label: 'Hooks Husky branchés (non-vides)',   ok: huskyActive,       weight: 6,  category: 'quality' },
    { key: 'lintStaged',  label: 'lint-staged appelé dans Husky',      ok: lintStagedActive,  weight: 4,  category: 'quality' },
    { key: 'commitlint',  label: 'Commitlint branché (commit-msg)',     ok: commitlintActive,  weight: 6,  category: 'quality' },
    { key: 'ciTypecheck', label: 'Type-check en CI',                   ok: ciHasTypecheck,    weight: 2,  category: 'ci' },
  ] : []

  // Items non-JS : linter/formatter générique via CI
  const nonJsItems = !isJS ? [
    { key: 'ciLint',    label: 'Linter en CI',    ok: ciHasNonJsLint || ciHasLint, weight: 12, category: 'ci' },
    { key: 'ciFormat',  label: 'Formatter en CI', ok: ciHasNonJsFmt  || ciHasPrettier, weight: 8, category: 'ci' },
  ] : []

  const scoreItems = [...universalItems, ...jsItems, ...nonJsItems]

  const totalWeight  = scoreItems.reduce((s, i) => s + i.weight, 0)
  const earnedWeight = scoreItems.filter(i => i.ok).reduce((s, i) => s + i.weight, 0)
  const score = Math.round((earnedWeight / totalWeight) * 100)

  // Écosystème détecté pour affichage
  const ecosystem = isJS ? 'javascript'
    : isPython ? 'python'
    : isGo     ? 'go'
    : isRuby   ? 'ruby'
    : isJava   ? 'java'
    : isCSharp ? 'csharp'
    : isC      ? 'c'
    : isCpp    ? 'cpp'
    : isRust   ? 'rust'
    : isPhp    ? 'php'
    : 'unknown'

  return { signals: { ...signals, ecosystem }, scoreItems, score, hasTests }
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

// ── Scan sécurité ─────────────────────────────────────────────

// Fichiers sensibles à ne jamais commiter
const SENSITIVE_FILES = [
  '.env', '.env.local', '.env.production', '.env.staging', '.env.development',
  '.env.backup', '.env.bak', '.env.old', '.env.example.real',
  'config/database.yml', 'config/secrets.yml', 'config/credentials.yml',
  'config/master.key', 'config/application.yml',
  'wp-config.php', 'configuration.php', 'config.php',
  '.aws/credentials', '.aws/config',
  'terraform.tfvars', 'terraform.tfstate',
  'secrets.json', 'service-account.json', 'firebase-adminsdk.json',
  'google-services.json', '.netrc', '.htpasswd',
  'private.key', 'server.key', 'id_rsa', 'id_ed25519',
]

// Patterns de secrets dans le code (regex sur contenu fichier)

// En dev Vite proxy /gg-api → https://api.gitguardian.com (contourne CORS)
// En prod : variable VITE_GG_PROXY_URL à définir (Cloudflare Worker, etc.)
const GG_BASE = import.meta.env.DEV
  ? '/gg-api'
  : (import.meta.env.VITE_GG_PROXY_URL ?? 'https://api.gitguardian.com')

export async function fetchGGReport(owner, repo, ggToken) {
  if (!ggToken) return null
  const headers = { 'Authorization': `Token ${ggToken}`, 'Content-Type': 'application/json' }

  try {
    // Verify token + get quota
    const meRes = await fetch(`${GG_BASE}/v1/health`, { headers })
    const meText = await meRes.text()
    if (meText.trim().startsWith('<')) return { error: 'proxy_error' }
    if (!meRes.ok) return { error: meRes.status === 401 ? 'Token invalide' : `Erreur ${meRes.status}` }

    // Fetch incidents (all pages up to 100)
    const incRes = await fetch(`${GG_BASE}/v1/incidents?per_page=100&ordering=-date`, { headers })
    if (incRes.status === 404 || incRes.status === 403) {
      return { error: 'scope_insufficient', status: incRes.status }
    }
    if (!incRes.ok) return { error: `Incidents API: ${incRes.status}` }
    const incData = await incRes.json()
    const allIncidents = incData.results ?? []

    // Filter by repo
    const repoFull = `${owner}/${repo}`.toLowerCase()
    const repoIncidents = allIncidents.filter(inc => {
      const src = inc.source?.full_name ?? inc.source?.name ?? ''
      return src.toLowerCase().includes(repoFull) || src.toLowerCase() === repoFull
    })

    // Stats globales (tous repos)
    const total        = allIncidents.length
    const triggered    = allIncidents.filter(i => i.status === 'TRIGGERED').length
    const ignored      = allIncidents.filter(i => i.status === 'IGNORED').length
    const resolved     = allIncidents.filter(i => i.status === 'RESOLVED').length
    const validCount   = allIncidents.filter(i => i.validity === 'valid').length

    return {
      incidents: repoIncidents,
      allCount: total,
      triggered,
      ignored,
      resolved,
      validCount,
      hasMore: (incData.count ?? 0) > 100,
      totalCount: incData.count ?? total,
    }
  } catch (e) {
    return { error: e.message ?? 'Erreur réseau' }
  }
}
const GG_SCAN_FILES = [
  'package.json', 'config.js', 'config.ts', 'config.json',
  'settings.py', 'settings.js', 'app.config.js', 'app.config.ts',
  'docker-compose.yml', 'docker-compose.yaml',
  '.travis.yml', 'Makefile', 'Dockerfile',
  'terraform.tfvars', 'variables.tf',
  'src/config.js', 'src/config.ts', 'src/constants.js',
  'app/config.py', 'config/config.py',
]

async function scanWithGitGuardian(owner, repo, ghToken, ggToken) {
  if (!ggToken) return []
  const ggIssues = []

  // Fetch file contents then multiscan
  const fileContents = await Promise.all(
    GG_SCAN_FILES.map(async path => {
      const text = await fetchFileText(owner, repo, path, ghToken)
      if (!text) return null
      return { filename: path, document: text }
    })
  )
  const docs = fileContents.filter(Boolean)
  if (docs.length === 0) return []

  // GG multiscan — max 20 docs per request
  const chunks = []
  for (let i = 0; i < docs.length; i += 20) chunks.push(docs.slice(i, i + 20))

  for (const chunk of chunks) {
    try {
      const res = await fetch(`${GG_BASE}/v1/multiscan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${ggToken}`,
        },
        body: JSON.stringify(chunk.map(d => ({ filename: d.filename, document: d.document }))),
      })
      if (!res.ok) continue
      const results = await res.json()
      if (!Array.isArray(results)) continue

      results.forEach((scanResult, i) => {
        const filename = chunk[i]?.filename ?? '?'
        const breaks = scanResult.policy_breaks ?? []
        breaks.forEach(pb => {
          const validity = pb.validity ?? 'unknown'
          ggIssues.push({
            severity: validity === 'valid' ? 'critical' : 'high',
            type: 'gitguardian',
            title: `GitGuardian : ${pb.break_type || pb.type || 'Secret détecté'}`,
            detail: `Fichier : ${filename} · Validité : ${validity === 'valid' ? '⚠ actif' : validity === 'invalid' ? '✓ révoqué' : '? inconnu'}. ${pb.policy ?? ''}`.trim(),
            file: filename,
            validity,
            ggDetector: pb.detector?.display_name ?? pb.detector?.name ?? pb.type,
          })
        })
      })
    } catch { /* GG API down — skip silently */ }
  }

  return ggIssues
}

export async function fetchSecurityScan(owner, repo, token, ggToken) {
  const issues = []

  // 1. Listing racine
  const rootRaw = await safe(fetchContents(owner, repo, '', token), [])
  const rootEntries = Array.isArray(rootRaw.data) ? rootRaw.data : []
  const rootNames = rootEntries.map(f => f.name.toLowerCase())

  // 2. Vérifier .gitignore : .env dedans ?
  let gitignoreCoversEnv = false
  const gitignoreText = await fetchFileText(owner, repo, '.gitignore', token)
  if (gitignoreText) {
    gitignoreCoversEnv = /^\.env/m.test(gitignoreText) || gitignoreText.includes('.env')
  } else {
    issues.push({
      severity: 'high',
      type: 'missing_gitignore',
      title: '.gitignore absent',
      detail: 'Aucun .gitignore — tous les fichiers peuvent être commités accidentellement.',
      file: null,
    })
  }

  if (gitignoreText && !gitignoreCoversEnv) {
    issues.push({
      severity: 'high',
      type: 'env_not_ignored',
      title: '.env non ignoré dans .gitignore',
      detail: 'Le fichier .gitignore existe mais ne couvre pas .env — risque d\'exposition de secrets.',
      file: '.gitignore',
    })
  }

  // 3. Chercher fichiers sensibles committés
  const sensitiveFound = await Promise.all(
    SENSITIVE_FILES.map(async (path) => {
      const filename = path.toLowerCase()
      // Vérif rapide dans la racine d'abord
      if (rootNames.includes(filename.split('/').pop())) {
        const text = await fetchFileText(owner, repo, path, token)
        if (text) return { path, text }
      }
      return null
    })
  )

  sensitiveFound.filter(Boolean).forEach(({ path }) => {
    const isEnv = path.startsWith('.env')
    issues.push({
      severity: 'critical',
      type: 'sensitive_file',
      title: `Fichier sensible commité : ${path}`,
      detail: isEnv
        ? 'Fichier .env commité — contient probablement des clés API, tokens ou mots de passe.'
        : `Fichier de configuration sensible présent dans le repo.`,
      file: path,
    })
  })

  // 3b. Vérifier .env.example / .env.sample / .env.template
  // Ces fichiers sont normaux à commiter, MAIS parfois contiennent de vraies valeurs par erreur
  const ENV_EXAMPLE_NAMES = ['.env.example', '.env.sample', '.env.template', '.env.dist', '.env.default']
  // Regex pour détecter une vraie valeur (pas un placeholder)
  // Placeholder patterns : KEY=, KEY="", KEY=your_key, KEY=xxxx, KEY=<value>, KEY=changeme, KEY=todo
  const PLACEHOLDER_RE = /^[^=]+=\s*$|^[^=]+=\s*["']?\s*["']?\s*$|=\s*(your_|my_|changeme|todo|xxx+|<[^>]+>|example|dummy|test|fake|sample|replace|none|null|true|false|0|1)/i
  const REAL_VALUE_RE  = /^[A-Z_]+=.{8,}/m  // ligne type KEY=valeur_longue (≥8 chars) = probablement réelle

  await Promise.all(
    ENV_EXAMPLE_NAMES.map(async (path) => {
      const filename = path.toLowerCase()
      if (!rootNames.includes(filename)) return
      const text = await fetchFileText(owner, repo, path, token)
      if (!text) return

      const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
      const assignedLines = lines.filter(l => l.includes('='))

      if (assignedLines.length === 0) return // fichier vide ou que des commentaires

      // Détecter si des lignes ont l'air de vraies valeurs
      const suspiciousLines = assignedLines.filter(l => {
        if (PLACEHOLDER_RE.test(l)) return false
        return REAL_VALUE_RE.test(l)
      })

      if (suspiciousLines.length > 0) {
        issues.push({
          severity: 'high',
          type: 'env_example_real_values',
          title: `${path} contient des valeurs réelles`,
          detail: `${suspiciousLines.length} ligne(s) dans ${path} ressemblent à de vraies clés (pas des placeholders). Vérifier que ce ne sont pas de vrais secrets.`,
          file: path,
          exampleLines: suspiciousLines.slice(0, 3).map(l => l.replace(/=.+/, '=***')),
        })
      } else {
        issues.push({
          severity: 'info',
          type: 'env_example_ok',
          title: `${path} présent — placeholders uniquement`,
          detail: `Fichier d'exemple commité normalement. Aucune valeur réelle détectée. Vérification manuelle recommandée.`,
          file: path,
        })
      }
    })
  )

  // Chemins à exclure — faux positifs connus
  const FP_PATHS = [
    /[/\\]tests?[/\\]/i, /[/\\]specs?[/\\]/i, /\.(test|spec)\.[a-z]+$/i,
    /[/\\]mocks?[/\\]/i, /[/\\]fixtures?[/\\]/i, /[/\\]stubs?[/\\]/i,
    /[/\\]i18n[/\\]/i, /[/\\]locales?[/\\]/i, /[/\\]translations?[/\\]/i,
    /\.isl$/i, /\.po$/i, /\.pot$/i,
    /secretFilter/i, /secret.filter/i, /detectSecret/i, /filterSecret/i,
    /cookbook/i, /[/\\]examples?[/\\]/i, /[/\\]samples?[/\\]/i, /[/\\]demos?[/\\]/i,
    /[/\\]docs?[/\\]/i, /[/\\]documentation[/\\]/i,
    /node_modules/i, /[/\\]vendor[/\\]/i, /\.min\.[a-z]+$/i,
    /CHANGELOG/i, /README/i, /\.md$/i,
  ]
  const isFP = path => FP_PATHS.some(re => re.test(path))

  // 4. Scanner fichiers de code pour secrets hardcodés
  // Requêtes ciblées avec valeurs assignées (pas juste le mot-clé)
  const SECRET_SEARCHES = [
    { q: `repo:${owner}/${repo} "password="`,              label: 'Mot de passe assigné' },
    { q: `repo:${owner}/${repo} "secret_key="`,            label: 'Clé secrète (secret_key)' },
    { q: `repo:${owner}/${repo} "api_key="`,               label: 'Clé API (api_key)' },
    { q: `repo:${owner}/${repo} AWS_SECRET_ACCESS_KEY`,    label: 'Clé secrète AWS' },
    { q: `repo:${owner}/${repo} AKIA`,                     label: 'Access Key ID AWS' },
    { q: `repo:${owner}/${repo} "BEGIN RSA PRIVATE KEY"`,  label: 'Clé privée RSA' },
    { q: `repo:${owner}/${repo} "BEGIN OPENSSH PRIVATE KEY"`, label: 'Clé privée SSH' },
  ]

  const secretSearches = await Promise.all(
    SECRET_SEARCHES.map(s =>
      safe(get(`${BASE}/search/code?q=${encodeURIComponent(s.q)}&per_page=10`, token), { total_count: 0, items: [] })
    )
  )

  secretSearches.forEach((r, i) => {
    const allFiles = (r.data?.items || []).map(f => ({ path: f.path, url: f.html_url }))
    const realFiles = allFiles.filter(f => !isFP(f.path))
    if (realFiles.length > 0) {
      issues.push({
        severity: 'high',
        type: 'hardcoded_secret',
        title: `Secret potentiel : ${SECRET_SEARCHES[i].label}`,
        detail: `${realFiles.length} fichier(s) suspects (tests/i18n/filtres exclus).`,
        files: realFiles,
        file: realFiles[0]?.path,
        count: realFiles.length,
      })
    }
  })

  // 5. GitHub Secret Scanning alerts — ouverts
  const alertsRaw = await safe(get(`${BASE}/repos/${owner}/${repo}/secret-scanning/alerts?state=open&per_page=10`, token), null)
  if (Array.isArray(alertsRaw.data) && alertsRaw.data.length > 0) {
    alertsRaw.data.forEach(alert => {
      issues.push({
        severity: 'critical',
        type: 'github_secret_alert',
        title: `Secret actif détecté par GitHub : ${alert.secret_type_display_name || alert.secret_type}`,
        detail: `GitHub a automatiquement détecté un secret exposé dans ce repo.`,
        file: alert.locations?.[0]?.details?.path || null,
        url: alert.html_url,
      })
    })
  }

  // 5b. Secret Scanning — résolus (secret dans l'historique, potentiellement encore valide)
  const alertsResolved = await safe(get(`${BASE}/repos/${owner}/${repo}/secret-scanning/alerts?state=resolved&per_page=10`, token), null)
  if (Array.isArray(alertsResolved.data) && alertsResolved.data.length > 0) {
    alertsResolved.data.forEach(alert => {
      issues.push({
        severity: 'high',
        type: 'github_secret_history',
        title: `Secret dans l'historique git : ${alert.secret_type_display_name || alert.secret_type}`,
        detail: `Ce secret était commité. Même "résolu", il peut encore être valide — révoquez-le si ce n'est pas fait.`,
        file: alert.locations?.[0]?.details?.path || null,
        url: alert.html_url,
        fromHistory: true,
      })
    })
  }

  // 5c. Fichiers sensibles dans l'historique git (commités puis supprimés)
  const HISTORY_FILES = ['.env', '.env.local', '.env.production', 'config/secrets.yml', 'id_rsa', '.npmrc']
  const historyChecks = await Promise.all(
    HISTORY_FILES.map(path =>
      safe(get(`${BASE}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`, token), null)
    )
  )
  historyChecks.forEach((r, i) => {
    const commits = r.data
    if (!Array.isArray(commits) || commits.length === 0) return
    const path = HISTORY_FILES[i]
    // Vérifier si le fichier existe encore (déjà couvert par check 3), ne signaler que si absent maintenant
    const existsNow = rootNames.includes(path.split('/').pop().toLowerCase())
    if (existsNow) return // déjà signalé comme critique
    const lastCommit = commits[0]
    issues.push({
      severity: 'high',
      type: 'sensitive_file_history',
      title: `${path} présent dans l'historique git`,
      detail: `Ce fichier a été commité (dernier commit : ${lastCommit.commit?.author?.date?.slice(0,10) ?? '?'} par ${lastCommit.commit?.author?.name ?? '?'}). Supprimé depuis, mais visible dans git log. Réécrivez l'historique avec git-filter-repo si nécessaire.`,
      file: path,
      url: lastCommit.html_url,
      fromHistory: true,
    })
  })

  // 6. Vérifier dépendances vulnérables via Dependabot alerts
  const vulnAlerts = await safe(get(`${BASE}/repos/${owner}/${repo}/dependabot/alerts?state=open&per_page=5`, token), null)
  if (Array.isArray(vulnAlerts.data) && vulnAlerts.data.length > 0) {
    const critical = vulnAlerts.data.filter(a => a.security_advisory?.severity === 'critical').length
    const high     = vulnAlerts.data.filter(a => a.security_advisory?.severity === 'high').length
    issues.push({
      severity: critical > 0 ? 'critical' : 'high',
      type: 'dependabot',
      title: `${vulnAlerts.data.length} vulnérabilité(s) Dependabot`,
      detail: `${critical} critique(s), ${high} haute(s) dans les dépendances.`,
      file: null,
      count: vulnAlerts.data.length,
    })
  }

  // 7. GitGuardian scan (si token dispo)
  const ggIssues = await scanWithGitGuardian(owner, repo, token, ggToken)
  issues.push(...ggIssues)
  const ggScanned = !!ggToken

  // Score sécurité (info = 0 pénalité, historiques pénalisent moins)
  const criticalCount  = issues.filter(i => i.severity === 'critical' && !i.fromHistory).length
  const highCount      = issues.filter(i => i.severity === 'high'     && !i.fromHistory).length
  const historyCount   = issues.filter(i => i.fromHistory).length
  const score = Math.max(0, 100 - criticalCount * 30 - highCount * 15 - historyCount * 8)

  return {
    issues,
    criticalCount,
    highCount,
    historyCount,
    score,
    gitignoreCoversEnv,
    hasGitignore: !!gitignoreText,
    secretScanningAvailable: Array.isArray(alertsRaw.data),
    ggScanned,
  }
}

// ── OSV.dev vulnerability scan ────────────────────────────────────────────────

const OSV_BASE = 'https://api.osv.dev/v1'

function cleanVersion(v) {
  if (!v || typeof v !== 'string') return null
  const clean = v.replace(/^[\^~>=<! ]+/, '').split(' ')[0].split(',')[0].trim()
  return /^\d/.test(clean) ? clean : null
}

function parseDeps(text, ecosystem) {
  const deps = []
  if (ecosystem === 'npm') {
    try {
      const pkg = JSON.parse(text)
      const all = { ...pkg.dependencies, ...pkg.devDependencies }
      for (const [name, version] of Object.entries(all)) {
        const v = cleanVersion(version)
        if (v) deps.push({ name, version: v, ecosystem: 'npm' })
      }
    } catch {}
  } else if (ecosystem === 'PyPI') {
    for (const line of text.split('\n')) {
      const clean = line.trim().split('#')[0].trim()
      if (!clean) continue
      const m = clean.match(/^([A-Za-z0-9_.-]+)[>=<!~^]+(.+)$/)
      if (m) {
        const v = cleanVersion(m[2])
        if (v) deps.push({ name: m[1], version: v, ecosystem: 'PyPI' })
      }
    }
  } else if (ecosystem === 'Go') {
    for (const line of text.split('\n')) {
      const m = line.trim().match(/^\s*([^\s]+)\s+v([^\s]+)/)
      if (m) deps.push({ name: m[1], version: m[2], ecosystem: 'Go' })
    }
  } else if (ecosystem === 'crates.io') {
    for (const line of text.split('\n')) {
      const m = line.match(/^([a-z0-9_-]+)\s*=\s*"([^"]+)"/)
      if (m) {
        const v = cleanVersion(m[2])
        if (v) deps.push({ name: m[1], version: v, ecosystem: 'crates.io' })
      }
    }
  }
  return deps
}

function cvssScore(vuln) {
  for (const s of vuln.severity ?? []) {
    if (s.score?.startsWith('CVSS:')) {
      const m = s.score.match(/\/AV:[^/]+.*?\/(\d+\.\d+)$/)
      if (m) return parseFloat(m[1])
    }
  }
  const sev = vuln.database_specific?.severity ?? ''
  if (sev === 'CRITICAL') return 9.5
  if (sev === 'HIGH') return 7.5
  if (sev === 'MODERATE' || sev === 'MEDIUM') return 5.0
  if (sev === 'LOW') return 2.5
  return 0
}

function vulnSeverity(vuln) {
  const score = cvssScore(vuln)
  if (score >= 9) return 'critical'
  if (score >= 7) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

function fixedVersion(vuln, pkgName) {
  for (const aff of vuln.affected ?? []) {
    if (aff.package?.name?.toLowerCase() !== pkgName.toLowerCase()) continue
    for (const range of aff.ranges ?? []) {
      for (const ev of range.events ?? []) {
        if (ev.fixed) return ev.fixed
      }
    }
    if (aff.database_specific?.last_known_affected_version_range) {
      return aff.database_specific.last_known_affected_version_range
    }
  }
  return null
}

export async function fetchOSVScan(owner, repo, token) {
  // Noms de fichiers manifeste recherchés dans tout l'arbre du repo
  const MANIFEST_NAMES = {
    'package.json':      'npm',
    'requirements.txt':  'PyPI',
    'go.mod':            'Go',
    'Cargo.toml':        'crates.io',
  }
  // Dossiers à exclure
  const EXCLUDE_DIRS = /node_modules|vendor|\.git|dist|build|__pycache__|\.venv|venv/i

  // Récupérer l'arbre complet du repo
  const treeRaw = await safe(
    get(`${BASE}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, token), null
  )
  const allFiles = (treeRaw.data?.tree ?? [])
    .filter(f => f.type === 'blob' && !EXCLUDE_DIRS.test(f.path))

  // Trouver tous les manifestes (max 8 fichiers pour éviter trop de requêtes)
  const found = []
  for (const [name, ecosystem] of Object.entries(MANIFEST_NAMES)) {
    const matches = allFiles
      .filter(f => f.path.endsWith('/' + name) || f.path === name)
      .slice(0, 3) // max 3 par type (monorepos)
    for (const f of matches) {
      const text = await fetchFileText(owner, repo, f.path, token)
      if (text) found.push({ path: f.path, ecosystem, text })
    }
    if (found.length >= 8) break
  }

  const manifests = found
  if (manifests.length === 0) return { vulns: [], scanned: [], depsChecked: 0 }

  // Parse all deps
  const allDeps = []
  for (const m of manifests) {
    allDeps.push(...parseDeps(m.text, m.ecosystem))
  }

  // Deduplicate, limit to 120 deps
  const seen = new Set()
  const deps = allDeps.filter(d => {
    const k = `${d.ecosystem}:${d.name}:${d.version}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }).slice(0, 120)

  if (deps.length === 0) return { vulns: [], scanned: manifests.map(m => m.path), ecosystem: manifests[0].ecosystem }

  // Step 1 — querybatch : récupère les IDs de vulns pour chaque dep
  const vulnHits = [] // { id, dep }
  for (let i = 0; i < deps.length; i += 50) {
    const chunk = deps.slice(i, i + 50)
    try {
      const res = await fetch(`${OSV_BASE}/querybatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: chunk.map(d => ({
            package: { name: d.name, ecosystem: d.ecosystem },
            version: d.version,
          })),
        }),
      })
      if (!res.ok) continue
      const data = await res.json()
      ;(data.results ?? []).forEach((r, j) => {
        const dep = chunk[j]
        for (const v of r.vulns ?? []) {
          vulnHits.push({ id: v.id, dep })
        }
      })
    } catch {}
  }

  // Deduplicate vuln IDs (même CVE peut toucher plusieurs deps)
  const idSeen = new Set()
  const uniqueHits = vulnHits.filter(h => {
    if (idSeen.has(h.id)) return false
    idSeen.add(h.id)
    return true
  }).slice(0, 40) // max 40 fetch individuels

  // Step 2 — fetch détails complets pour chaque vuln (summary, severity, fix)
  const vulns = await Promise.all(
    uniqueHits.map(async ({ id, dep }) => {
      try {
        const res = await fetch(`${OSV_BASE}/vulns/${id}`)
        if (!res.ok) return null
        const v = await res.json()
        return {
          id: v.id,
          summary: v.summary ?? v.details?.slice(0, 150) ?? 'Vulnérabilité',
          severity: vulnSeverity(v),
          cvssScore: cvssScore(v),
          package: dep.name,
          version: dep.version,
          ecosystem: dep.ecosystem,
          fixedIn: fixedVersion(v, dep.name),
          url: `https://osv.dev/vulnerability/${v.id}`,
          aliases: v.aliases ?? [],
        }
      } catch { return null }
    })
  )

  const uniqueVulns = vulns.filter(Boolean)
  uniqueVulns.sort((a, b) => b.cvssScore - a.cvssScore)

  return {
    vulns: uniqueVulns,
    scanned: manifests.map(m => m.path),
    depsChecked: deps.length,
    criticalCount: uniqueVulns.filter(v => v.severity === 'critical').length,
    highCount:     uniqueVulns.filter(v => v.severity === 'high').length,
  }
}

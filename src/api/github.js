const BASE = 'https://api.github.com'
const CACHE_TTL = 60 * 60 * 1000 // 1 heure

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
    // Skip cache if payload > 2MB to avoid localStorage quota errors
    if (serialized.length > 2_000_000) return
    localStorage.setItem(cacheKey(url), serialized)
  } catch {}
}

function headers(token) {
  const h = { Accept: 'application/vnd.github+json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function get(url, token, retries = 2) {
  const cached = fromCache(url)
  if (cached) return cached
  const res = await fetch(url, { headers: headers(token) })

  // 202 = GitHub is computing stats, retry once after a short delay
  if (res.status === 202 && retries > 0) {
    await new Promise(r => setTimeout(r, 2000))
    return get(url, token, retries - 1)
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

export function clearCache() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('gh_cache_'))
    .forEach(k => localStorage.removeItem(k))
}

export async function fetchCollaborators(owner, repo, token) {
  return getPaginated(`${BASE}/repos/${owner}/${repo}/collaborators`, token, 2)
}

export function getRateLimit(token) {
  return get(`${BASE}/rate_limit`, token)
}

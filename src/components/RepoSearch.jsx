import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Key, GitBranch, Zap, GitCommit, Users,
  TrendingUp, ShieldCheck, ArrowRight, CheckCircle, Star, Code2, Bookmark, X,
} from 'lucide-react'
import { UserButton } from '@clerk/clerk-react'
import { getRateLimit, searchRepos } from '../api/github'

const LAST_SEARCH_KEY = 'gh_last_search'
const TOKEN_KEY = 'gh_token'
const POLL_INTERVAL = 30_000

function getSavedToken() {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}
function saveToken(t) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) } catch {}
}

/* ─── Rate limit widget ─────────────────────────────────────── */
function RateInfo({ token }) {
  const [rate, setRate] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      localStorage.removeItem(`gh_cache_https://api.github.com/rate_limit`)
      const d = await getRateLimit(token || null)
      setRate(d.rate)
    } catch {}
    if (showSpinner) setRefreshing(false)
  }, [token])

  useEffect(() => {
    refresh()
    const id = setInterval(() => refresh(), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [refresh])

  if (!rate) return null

  const pct = Math.round((rate.remaining / rate.limit) * 100)
  const low = rate.remaining < 15
  const empty = rate.remaining === 0
  const reset = new Date(rate.reset * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const barColor = empty
    ? 'linear-gradient(90deg,#ef4444,#b91c1c)'
    : low ? 'linear-gradient(90deg,#e31a80,#f97316)'
    : pct > 50 ? 'linear-gradient(90deg,#4318ff,#01b574)'
    : 'linear-gradient(90deg,#fbbf24,#f97316)'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '12px 16px', borderRadius: 12,
      background: empty ? 'rgba(239,68,68,0.07)' : low ? 'rgba(227,26,128,0.07)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${empty ? 'rgba(239,68,68,0.25)' : low ? 'rgba(227,26,128,0.2)' : 'rgba(255,255,255,0.07)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: empty ? '#ef4444' : low ? '#e31a80' : '#01b574',
            boxShadow: `0 0 6px ${empty ? '#ef4444' : low ? '#e31a80' : '#01b574'}`,
            animation: (empty || low) ? 'pulse-slow 1.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: low ? '#f9a8d4' : '#718096' }}>
            GitHub API · {token ? 'Authentifié ✓' : 'Sans token'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: low ? '#f9a8d4' : '#e2e8f0' }}>
            {rate.remaining}<span style={{ fontWeight: 400, color: '#4a5568' }}>/{rate.limit}</span>
          </span>
          <button onClick={() => refresh(true)} title="Rafraîchir" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#4a5568', display: 'flex' }}>
            <svg width="11" height="11" viewBox="0 0 12 12" style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>
              <path d="M10 6A4 4 0 1 1 6 2v1.5L8.5 1 6 0v1.5A4.5 4.5 0 1 0 10.5 6H10z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
        <div style={{ height: 4, borderRadius: 99, transition: 'width 0.6s ease', width: `${pct}%`, background: barColor }} />
      </div>
      <span style={{ fontSize: 10, color: '#4a5568' }}>
        {empty ? `⚠ Limite atteinte — reset ${reset}` : low ? `⚠ Presque épuisé — reset ${reset}` : `Polling 30s · reset ${reset}`}
      </span>
    </div>
  )
}

/* ─── Données ────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Users size={20} />,
    title: 'Qui travaille vraiment ?',
    desc: 'Visualisez chaque développeur — commits, activité, jours actifs, heatmap. Repérez instantanément les inactifs.',
    color: '#4ade80',
    grad: 'linear-gradient(135deg,#4ade80,#01b574)',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Commits aux normes ?',
    desc: 'Validation automatique Conventional Commits. Score de conformité par dev, violations détaillées avec corrections.',
    color: '#868cff',
    grad: 'linear-gradient(135deg,#868cff,#4318ff)',
  },
  {
    icon: <TrendingUp size={20} />,
    title: 'Métriques en temps réel',
    desc: 'PRs, issues, branches, streak, langages, activité hebdo. Toutes les données en un coup d\'œil.',
    color: '#67e8f9',
    grad: 'linear-gradient(135deg,#67e8f9,#0ea5e9)',
  },
]

const STATS = [
  { val: '300+', label: 'commits analysés' },
  { val: '16', label: 'semaines d\'historique' },
  { val: '100%', label: 'gratuit · open source' },
]

const EXAMPLES = [
  { owner: 'facebook',   repo: 'react',   stars: '228k', color: '#61dafb' },
  { owner: 'microsoft',  repo: 'vscode',  stars: '165k', color: '#007acc' },
  { owner: 'vercel',     repo: 'next.js', stars: '125k', color: '#ffffff' },
  { owner: 'tailwindlabs', repo: 'tailwindcss', stars: '83k', color: '#38bdf8' },
]

const CONVENTION_CHECKS = [
  { ok: true,  msg: 'feat(auth): add OAuth2 login flow' },
  { ok: true,  msg: 'fix(api): handle 429 rate limit error' },
  { ok: false, msg: 'Update stuff', err: 'type manquant, format invalide' },
  { ok: true,  msg: 'refactor(db): extract query builder' },
  { ok: false, msg: 'WIP', err: 'description trop courte' },
]

function getLastSearch() {
  try {
    const s = JSON.parse(sessionStorage.getItem(LAST_SEARCH_KEY) || 'null')
    return s?.owner && s?.repo ? `${s.owner}/${s.repo}` : ''
  } catch { return '' }
}

/* ─── Autocomplete Dropdown ─────────────────────────────────── */
const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
  Kotlin: '#A97BFF', Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c',
  Dart: '#00B4AB', Vue: '#41b883', Nix: '#7e7eff',
}

function LangDot({ lang }) {
  const color = LANG_COLORS[lang] || '#718096'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: '#718096' }}>{lang}</span>
    </span>
  )
}

function formatStars(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

function SearchDropdown({ results, loading, activeIdx, onSelect, onMouseEnter }) {
  if (!results && !loading) return null

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
      background: '#0f1629', border: '1px solid rgba(134,140,255,0.25)',
      borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(134,140,255,0.1)',
      zIndex: 100, overflow: 'hidden',
      maxHeight: 420, overflowY: 'auto',
    }}>
      {loading && (
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 14, height: 14, borderRadius: '50%',
            border: '2px solid rgba(134,140,255,0.2)', borderTopColor: '#868cff',
            animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: '#4a5568' }}>Recherche en cours…</span>
        </div>
      )}
      {!loading && results?.length === 0 && (
        <div style={{ padding: '14px 16px', fontSize: 12, color: '#4a5568', textAlign: 'center' }}>
          Aucun résultat trouvé
        </div>
      )}
      {!loading && results?.map((repo, i) => (
        <div
          key={repo.full_name}
          onMouseDown={e => { e.preventDefault(); onSelect(repo) }}
          onMouseEnter={() => onMouseEnter(i)}
          style={{
            padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s',
            background: i === activeIdx ? 'rgba(134,140,255,0.1)' : 'transparent',
            borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            display: 'flex', flexDirection: 'column', gap: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              {repo.owner?.avatar_url && (
                <img
                  src={repo.owner.avatar_url}
                  alt=""
                  style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
                />
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: i === activeIdx ? '#868cff' : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {repo.full_name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Star size={10} color="#fbbf24" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24' }}>{formatStars(repo.stargazers_count)}</span>
            </div>
          </div>
          {repo.description && (
            <p style={{
              fontSize: 11, color: '#718096', lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {repo.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {repo.language && <LangDot lang={repo.language} />}
            {repo.topics?.slice(0, 3).map(t => (
              <span key={t} style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 99, fontWeight: 600,
                background: 'rgba(134,140,255,0.12)', color: '#868cff', border: '1px solid rgba(134,140,255,0.2)',
              }}>{t}</span>
            ))}
          </div>
        </div>
      ))}
      {!loading && results?.length > 0 && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Code2 size={10} color="#4a5568" />
          <span style={{ fontSize: 10, color: '#4a5568' }}>↑↓ naviguer · Entrée sélectionner · Échap fermer</span>
        </div>
      )}
    </div>
  )
}

/* ─── Composant principal ───────────────────────────────────── */
export default function RepoSearch({ onSearch, loading, savedToken, onSaveToken, savedGGToken = '', onSaveGGToken, favorites = [], onRemoveFavorite }) {
  const [repo, setRepo] = useState(getLastSearch)
  const [token, setToken] = useState(() => savedToken || getSavedToken())
  const [showToken, setShowToken] = useState(() => !!(savedToken || getSavedToken()))
  const [tokenSaved, setTokenSaved] = useState(() => !!(savedToken || getSavedToken()))
  const [ggToken, setGGToken] = useState(() => savedGGToken || '')
  const [showGGToken, setShowGGToken] = useState(() => !!savedGGToken)
  const [ggTokenSaved, setGGTokenSaved] = useState(() => !!savedGGToken)
  const [inputError, setInputError] = useState('')

  const [suggestions, setSuggestions] = useState(null)
  const [sugLoading, setSugLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  function handleRepoChange(val) {
    setRepo(val)
    setInputError('')
    setActiveIdx(-1)

    // Si l'utilisateur tape owner/repo exact, pas besoin d'autocomplete
    if (val.includes('/') && val.split('/')[1]) {
      setShowDropdown(false)
      setSuggestions(null)
      return
    }

    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setSuggestions(null)
      setShowDropdown(false)
      return
    }

    setSugLoading(true)
    setShowDropdown(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchRepos(val, token.trim() || null)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setSugLoading(false)
      }
    }, 350)
  }

  function handleSelectSuggestion(r) {
    setRepo(r.full_name)
    setSuggestions(null)
    setShowDropdown(false)
    setActiveIdx(-1)
    setInputError('')
    inputRef.current?.focus()
  }

  function handleInputKeyDown(e) {
    if (!showDropdown || !suggestions?.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelectSuggestion(suggestions[activeIdx])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    setInputError('')
    const clean = repo.trim().replace('https://github.com/', '').replace(/\/$/, '')
    const parts = clean.split('/')
    if (parts.length < 2 || !parts[1]) {
      setInputError('Format attendu : owner/repo — ex: facebook/react')
      return
    }
    const trimmedToken = token.trim()
    saveToken(trimmedToken)
    if (onSaveToken) onSaveToken(trimmedToken)
    setTokenSaved(!!trimmedToken)
    const trimmedGG = ggToken.trim()
    if (onSaveGGToken) onSaveGGToken(trimmedGG)
    setGGTokenSaved(!!trimmedGG)
    onSearch(parts[0], parts[1], trimmedToken || null)
  }

  function handleTokenChange(val) {
    setToken(val)
    setTokenSaved(false)
  }

  function handleClearToken() {
    setToken('')
    setTokenSaved(false)
    saveToken('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Fond animé : grille + glows ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(134,140,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(134,140,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />
      <div style={{ position: 'fixed', top: '-20%', left: '-5%',  width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle,rgba(66,42,251,0.18) 0%,transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-15%', right: '-5%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(1,181,116,0.12) 0%,transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '40%', left: '40%',  width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(117,81,255,0.08) 0%,transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Barre top : UserButton + favoris ── */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '16px clamp(16px, 4vw, 32px)' }}>
        {favorites.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Favoris :</span>
            {favorites.map(f => (
              <div key={`${f.owner}/${f.repo}`} style={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(240,192,64,0.25)', background: 'rgba(240,192,64,0.07)' }}>
                <button
                  onClick={() => onSearch(f.owner, f.repo, undefined)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#f0c040', fontSize: 12, fontWeight: 600 }}
                >
                  <Bookmark size={11} />{f.owner}/{f.repo}
                </button>
                <button
                  onClick={() => onRemoveFavorite(f.owner, f.repo)}
                  style={{ padding: '5px 8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a5568', display: 'flex', alignItems: 'center' }}
                  title="Retirer"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        <UserButton appearance={{ elements: { avatarBox: { width: 34, height: 34, borderRadius: 10 } } }} />
      </div>

      {/* ── Contenu ── */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        maxWidth: 1200, margin: '0 auto', width: '100%',
        padding: '0 clamp(16px, 4vw, 32px) clamp(24px, 5vw, 48px)',
        gap: 'clamp(32px, 6vw, 64px)',
      }}>

        {/* ══ LAYOUT PRINCIPAL : gauche + droite ══ */}
        <div className="hero-grid">

          {/* ── Colonne gauche : Hero ── */}
          <div className="fade-up">

            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, marginBottom: 28, background: 'rgba(134,140,255,0.1)', border: '1px solid rgba(134,140,255,0.25)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#868cff', boxShadow: '0 0 8px #868cff' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#868cff', letterSpacing: '0.05em' }}>GITPULSE · OUTIL SCRUM MASTER</span>
            </div>

            {/* Headline */}
            <h1 className="hero-h1" style={{ color: '#ffffff', marginBottom: 20 }}>
              <span className="gitpulse-text">GitPulse.</span><br />
              Pilotez votre équipe<br />avec précision.
            </h1>

            {/* Sous-titre */}
            <p style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: '#718096', lineHeight: 1.7, maxWidth: 480, marginBottom: 40 }}>
              Analysez l'activité de vos repos GitHub en quelques secondes.
              Commits, performance par développeur, conformité des messages — tout ce dont vous avez besoin pour vos stand-ups.
            </p>

            {/* Stats rapides */}
            <div style={{ display: 'flex', gap: 32, marginBottom: 48, flexWrap: 'wrap' }}>
              {STATS.map(s => (
                <div key={s.label}>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.val}</p>
                  <p style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FEATURES.map((f, i) => (
                <div key={i}
                  className="card-lift"
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    padding: '18px 20px', borderRadius: 18,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    transition: 'all 0.25s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${f.color}35`; e.currentTarget.style.background = `${f.color}08` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: f.grad, boxShadow: `0 0 20px ${f.color}33`,
                  }}>
                    <span style={{ color: '#fff' }}>{f.icon}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{f.title}</p>
                    <p style={{ fontSize: 12, color: '#4a5568', lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Colonne droite : Formulaire ── */}
          <div className="fade-up hero-form-card" style={{ animationDelay: '100ms' }}>

            {/* Card principale */}
            <div className="glass" style={{ padding: '32px 28px', marginBottom: 12 }}>

              {/* Icône + titre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'linear-gradient(135deg,#4318ff,#01b574)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(66,42,251,0.4)', flexShrink: 0,
                }}>
                  <GitBranch size={22} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Analyser un repo</p>
                  <p style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>Public ou privé avec token</p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Input repo */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#718096', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Repository
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#4a5568', pointerEvents: 'none', zIndex: 1 }} />
                    <input
                      ref={inputRef}
                      type="text"
                      value={repo}
                      onChange={e => handleRepoChange(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      onFocus={() => {
                        if (suggestions?.length) setShowDropdown(true)
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                      placeholder="Tapez un mot-clé ou owner/repo…"
                      required
                      autoComplete="off"
                      style={{
                        width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 13, paddingBottom: 13,
                        borderRadius: 12, fontSize: 14, color: '#e2e8f0', outline: 'none',
                        background: 'rgba(255,255,255,0.04)', border: `1px solid ${inputError ? 'rgba(239,68,68,0.5)' : showDropdown ? 'rgba(134,140,255,0.5)' : 'rgba(255,255,255,0.09)'}`,
                        transition: 'border-color 0.2s', boxSizing: 'border-box',
                      }}
                    />
                    {showDropdown && (
                      <SearchDropdown
                        results={suggestions}
                        loading={sugLoading}
                        activeIdx={activeIdx}
                        onSelect={handleSelectSuggestion}
                        onMouseEnter={setActiveIdx}
                      />
                    )}
                  </div>
                  {inputError && (
                    <p style={{ fontSize: 11, color: '#fca5a5', marginTop: 6, paddingLeft: 4 }}>⚠ {inputError}</p>
                  )}
                </div>

                {/* Token section */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showToken ? 10 : 0 }}>
                    <button
                      type="button"
                      onClick={() => setShowToken(v => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        fontSize: 12, color: tokenSaved ? '#4ade80' : showToken ? '#868cff' : '#4a5568',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 0, transition: 'color 0.2s',
                      }}
                    >
                      <Key size={12} />
                      {tokenSaved
                        ? 'Token sauvegardé ✓'
                        : showToken ? 'Masquer le token' : 'Token GitHub (optionnel · +5000 req/h · repos privés)'}
                      <span style={{ fontSize: 10, marginLeft: 2 }}>{showToken ? '▲' : '▼'}</span>
                    </button>
                    {tokenSaved && (
                      <button
                        type="button"
                        onClick={handleClearToken}
                        style={{
                          fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
                          padding: '3px 10px', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  {showToken && (
                    <div style={{ position: 'relative' }}>
                      <input
                        type="password"
                        value={token}
                        onChange={e => handleTokenChange(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        style={{
                          width: '100%', padding: '11px 14px', paddingRight: token ? 44 : 14,
                          borderRadius: 11, fontSize: 13, color: '#e2e8f0',
                          outline: 'none', background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${tokenSaved ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.09)'}`,
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => { if (!tokenSaved) e.target.style.borderColor = 'rgba(134,140,255,0.5)' }}
                        onBlur={e => { if (!tokenSaved) e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
                      />
                      {token && !tokenSaved && (
                        <span style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 10, color: '#4a5568', pointerEvents: 'none',
                        }}>non sauvegardé</span>
                      )}
                      {tokenSaved && (
                        <span style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 12, color: '#4ade80', pointerEvents: 'none',
                        }}>✓</span>
                      )}
                    </div>
                  )}
                  {tokenSaved && !showToken && (
                    <p style={{ fontSize: 11, color: '#4a5568', marginTop: 4, paddingLeft: 4 }}>
                      Token actif · utilisation automatique à chaque analyse
                    </p>
                  )}
                </div>

                {/* GitGuardian token */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showGGToken ? 10 : 0 }}>
                    <button
                      type="button"
                      onClick={() => setShowGGToken(v => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        fontSize: 12, color: ggTokenSaved ? '#f97316' : showGGToken ? '#f97316' : '#4a5568',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      {ggTokenSaved
                        ? 'GitGuardian actif ✓'
                        : showGGToken ? 'Masquer' : 'GitGuardian (optionnel · scan secrets avancé)'}
                      <span style={{ fontSize: 10, marginLeft: 2 }}>{showGGToken ? '▲' : '▼'}</span>
                    </button>
                    {ggTokenSaved && (
                      <button type="button" onClick={() => { setGGToken(''); setGGTokenSaved(false); if (onSaveGGToken) onSaveGGToken('') }}
                        style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer' }}
                      >Supprimer</button>
                    )}
                  </div>
                  {showGGToken && (
                    <>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="password"
                          value={ggToken}
                          onChange={e => { setGGToken(e.target.value); setGGTokenSaved(false) }}
                          placeholder="ggtt_xxxxxxxxxxxxxxxxxxxx"
                          style={{
                            width: '100%', padding: '11px 14px', borderRadius: 11, fontSize: 13, color: '#e2e8f0',
                            outline: 'none', background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${ggTokenSaved ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.09)'}`,
                            transition: 'border-color 0.2s',
                          }}
                          onFocus={e => { if (!ggTokenSaved) e.target.style.borderColor = 'rgba(249,115,22,0.4)' }}
                          onBlur={e => { if (!ggTokenSaved) e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
                        />
                        {ggTokenSaved && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#f97316', pointerEvents: 'none' }}>✓</span>}
                      </div>
                      <p style={{ fontSize: 10, color: '#4a5568', marginTop: 5, paddingLeft: 2, lineHeight: 1.5 }}>
                        Token GitGuardian — détecte 350+ types de secrets. Gratuit sur{' '}
                        <span style={{ color: '#f97316' }}>dashboard.gitguardian.com</span> → API → Personal access tokens.{' '}
                        <span style={{ color: '#374151' }}>⚠ Le contenu des fichiers est envoyé à l'API GG pour analyse.</span>
                      </p>
                    </>
                  )}
                </div>

                {/* Rate limit */}
                <RateInfo token={token.trim() || null} />

                {/* CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '15px 0', borderRadius: 13, fontSize: 15, fontWeight: 800,
                    color: '#fff', border: 'none', cursor: loading ? 'wait' : 'pointer',
                    background: loading ? 'rgba(66,42,251,0.35)' : 'linear-gradient(135deg,#4318ff 0%,#7551ff 50%,#01b574 100%)',
                    boxShadow: loading ? 'none' : '0 0 40px rgba(66,42,251,0.45)',
                    transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                    marginTop: 16, letterSpacing: '-0.01em',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(66,42,251,0.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = loading ? 'none' : '0 0 40px rgba(66,42,251,0.45)' }}
                >
                  {loading
                    ? <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Analyse en cours...</>
                    : <><Zap size={16} /> Analyser le repository <ArrowRight size={15} /></>
                  }
                </button>
              </form>
            </div>

            {/* Exemples rapides */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4a5568', textAlign: 'center', marginBottom: 10 }}>
                Essayer avec
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.repo}
                    onClick={() => { setRepo(`${ex.owner}/${ex.repo}`); setInputError('') }}
                    style={{
                      padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 12, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${ex.color}40`; e.currentTarget.style.background = `${ex.color}0a` }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: ex.color, marginBottom: 2 }}>{ex.repo}</p>
                    <p style={{ fontSize: 10, color: '#4a5568' }}>{ex.owner} · {ex.stars} ⭐</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══ PREVIEW SECTION ══ */}
        <div className="fade-up" style={{ animationDelay: '200ms' }}>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4a5568', marginBottom: 8 }}>
              Ce que vous obtenez
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
              Tout ce qu'un Scrum Master doit voir
            </p>
          </div>

          <div className="preview-grid">

            {/* Preview 1 — Activité développeurs */}
            <div className="glass" style={{ padding: '22px 22px 18px', borderRadius: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#4ade80,#01b574)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={16} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Suivi des devs</p>
                  <p style={{ fontSize: 10, color: '#4a5568' }}>Activité individuelle</p>
                </div>
              </div>
              {[
                { name: 'alice', commits: 47, status: 'Actif', color: '#4ade80', pct: 92 },
                { name: 'bob',   commits: 23, status: 'En pause', color: '#fbbf24', pct: 48 },
                { name: 'carol', commits: 0,  status: 'Inactif', color: '#ef4444', pct: 0 },
              ].map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${d.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: d.color, flexShrink: 0 }}>
                    {d.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{d.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: d.color }}>{d.status}</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ height: 3, borderRadius: 99, background: d.color, width: `${d.pct}%`, opacity: 0.7 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', flexShrink: 0 }}>{d.commits}c</span>
                </div>
              ))}
            </div>

            {/* Preview 2 — Convention commits */}
            <div className="glass" style={{ padding: '22px 22px 18px', borderRadius: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#868cff,#4318ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Convention commits</p>
                  <p style={{ fontSize: 10, color: '#4a5568' }}>Conformité : 60%</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {CONVENTION_CHECKS.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderRadius: 9,
                    background: c.ok ? 'rgba(74,222,128,0.05)' : 'rgba(239,68,68,0.05)',
                    border: `1px solid ${c.ok ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'}`,
                  }}>
                    {c.ok
                      ? <CheckCircle size={12} color="#4ade80" style={{ marginTop: 1, flexShrink: 0 }} />
                      : <span style={{ fontSize: 11, color: '#ef4444', flexShrink: 0, marginTop: 1 }}>✕</span>
                    }
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 10, color: c.ok ? '#4ade80' : '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.msg}</p>
                      {!c.ok && <p style={{ fontSize: 9, color: '#ef4444', marginTop: 1 }}>↳ {c.err}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview 3 — KPIs */}
            <div className="glass" style={{ padding: '22px 22px 18px', borderRadius: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#fbbf24,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={16} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>KPIs du sprint</p>
                  <p style={{ fontSize: 10, color: '#4a5568' }}>Vue d'ensemble</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Commits', val: '247', color: '#868cff', sub: '+12 cette semaine' },
                  { label: 'PRs mergées', val: '18', color: '#4ade80', sub: '82% de merge rate' },
                  { label: 'Issues fermées', val: '34', color: '#67e8f9', sub: '91% résolution' },
                  { label: 'Jours de streak', val: '12j', color: '#fbbf24', sub: 'Série en cours' },
                ].map(k => (
                  <div key={k.label} style={{ padding: '12px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <p style={{ fontSize: 20, fontWeight: 900, color: k.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{k.val}</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: 600 }}>{k.label}</p>
                    <p style={{ fontSize: 9, color: '#4a5568', marginTop: 2 }}>{k.sub}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <GitCommit size={12} color="#4ade80" />
                <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>Dernier commit il y a 2h</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '16px 32px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ fontSize: 11, color: '#1e293b' }}>
          GitPulse · Open Source · Données GitHub API · Aucune donnée stockée
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import './index.css'
import RepoSearch from './components/RepoSearch'
import Dashboard from './components/Dashboard'
import AuthGate from './components/AuthGate'
import { useGitHubData } from './hooks/useGitHubData'
import { useUserStorage } from './hooks/useUserStorage'
import { Key } from 'lucide-react'

function isRateLimitError(msg) {
  return msg && (msg.includes('rate limit') || msg.includes('API rate'))
}
function isNotFoundError(msg) {
  return msg && (msg.includes('Not Found') || msg.includes('404'))
}

function AppInner() {
  const { data, loading, error, load, reset } = useGitHubData()
  const [current, setCurrent] = useState(null)
  const [, setFavVersion] = useState(0)
  const { getToken, saveToken, getFavorites, addFavorite, removeFavorite, isFavorite, getGGToken, saveGGToken } = useUserStorage()

  function handleToggleFavorite(owner, repo) {
    if (isFavorite(owner, repo)) removeFavorite(owner, repo)
    else addFavorite(owner, repo)
    setFavVersion(v => v + 1)
  }

  async function handleSearch(owner, repo, token) {
    const tok = token ?? getToken()
    setCurrent({ owner, repo, token: tok, ggToken: getGGToken() })
    await load(owner, repo, tok, getGGToken())
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(66,42,251,0.18) 0%,transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(1,181,116,0.12) 0%,transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', width: 72, height: 72 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#4318ff', borderRightColor: '#7551ff', animation: 'spin 1s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(66,42,251,0.2),rgba(1,181,116,0.1))' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Analyse du repository...</p>
          <p style={{ fontSize: 12, color: '#718096' }}>commits · contributeurs · pull requests · issues · langages</p>
        </div>
        <div className="glass" style={{ padding: '10px 20px', fontSize: 12, color: '#718096' }}>
          Les données sont mises en cache 1h — les prochains chargements seront instantanés
        </div>
      </div>
    )
  }

  if (error) {
    const isRateLimit = isRateLimitError(error)
    const isNotFound = isNotFoundError(error)
    const steps = [
      { num: '01', text: 'Va sur', bold: 'github.com → Settings → Developer settings' },
      { num: '02', text: 'Clique sur', bold: 'Personal access tokens → Tokens (classic)' },
      { num: '03', text: 'Clique sur', bold: 'Generate new token', extra: '— coche la case', code: 'repo' },
      { num: '04', text: 'Copie le token et colle-le dans le champ', bold: '"Token GitHub"' },
    ]
    return (
      <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '0%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(227,26,128,0.18) 0%,transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(66,42,251,0.15) 0%,transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', background: isRateLimit ? 'linear-gradient(135deg,#e31a80,#f97316)' : 'linear-gradient(135deg,#f97316,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 50px rgba(227,26,128,0.45)' }}>
              <Key size={32} color="white" />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>
              {isRateLimit ? 'Limite API atteinte' : isNotFound ? 'Repository introuvable' : 'Erreur'}
            </h1>
            <p style={{ fontSize: 13, color: '#718096' }}>
              {isRateLimit ? '60 req/h sans token · 5000 req/h avec token GitHub'
                : isNotFound ? 'Vérifie le nom du repository (ex: torvalds/linux) et qu\'il est bien public.'
                : error}
            </p>
          </div>
          {isRateLimit && (
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#868cff', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Créer un token GitHub gratuit</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {steps.map(s => (
                  <div key={s.num} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg,#4318ff,#7551ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.05em', boxShadow: '0 0 12px rgba(66,42,251,0.4)' }}>{s.num}</div>
                    <p style={{ fontSize: 13, color: '#a0aec0', lineHeight: 1.6, paddingTop: 6 }}>
                      {s.text} <strong style={{ color: '#e2e8f0' }}>{s.bold}</strong>
                      {s.extra && <> {s.extra} <code style={{ background: 'rgba(134,140,255,0.15)', color: '#868cff', padding: '1px 7px', borderRadius: 6, fontSize: 12 }}>{s.code}</code></>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => { reset(); setCurrent(null) }} style={{ width: '100%', padding: '14px 0', borderRadius: 14, fontSize: 15, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4318ff,#01b574)', boxShadow: '0 0 30px rgba(66,42,251,0.4)', transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >{isRateLimit ? '→ Réessayer avec un token' : 'Retour'}</button>
        </div>
      </div>
    )
  }

  if (data && current) {
    return (
      <Dashboard
        data={data}
        owner={current.owner}
        repo={current.repo}
        token={current.token}
        onBack={() => { reset(); setCurrent(null) }}
        onRefresh={() => handleSearch(current.owner, current.repo, current.token)}
        isFavorite={isFavorite(current.owner, current.repo)}
        onToggleFavorite={() => handleToggleFavorite(current.owner, current.repo)}
        ggToken={current.ggToken}
        onSaveGGToken={saveGGToken}
      />
    )
  }

  return (
    <RepoSearch
      onSearch={handleSearch}
      loading={loading}
      savedToken={getToken()}
      onSaveToken={saveToken}
      savedGGToken={getGGToken()}
      onSaveGGToken={saveGGToken}
      favorites={getFavorites()}
      onRemoveFavorite={(owner, repo) => { removeFavorite(owner, repo); setFavVersion(v => v + 1) }}
    />
  )
}

export default function App() {
  return (
    <AuthGate>
      <AppInner />
    </AuthGate>
  )
}

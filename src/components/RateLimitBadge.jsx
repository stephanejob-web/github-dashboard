import { useEffect, useState, useCallback } from 'react'
import { getRateLimit } from '../api/github'

const POLL_INTERVAL = 30_000 // 30 secondes

export default function RateLimitBadge({ token }) {
  const [info, setInfo] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetch = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      // Bypass le cache pour avoir le vrai état en temps réel
      const key = `gh_cache_https://api.github.com/rate_limit`
      localStorage.removeItem(key)
      const d = await getRateLimit(token)
      setInfo(d.rate)
    } catch {}
    if (showSpinner) setRefreshing(false)
  }, [token])

  useEffect(() => {
    fetch()
    const id = setInterval(() => fetch(), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetch])

  if (!info) return null

  const low = info.remaining < 15
  const empty = info.remaining === 0
  const reset = new Date(info.reset * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return (
    <div
      onClick={() => fetch(true)}
      title="Cliquer pour rafraîchir"
      style={{
        display: 'flex', alignItems: 'center', gap: 7, fontSize: 11,
        padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
        background: empty ? 'rgba(239,68,68,0.12)' : low ? 'rgba(227,26,128,0.12)' : 'rgba(1,181,116,0.1)',
        border: `1px solid ${empty ? 'rgba(239,68,68,0.35)' : low ? 'rgba(227,26,128,0.3)' : 'rgba(1,181,116,0.25)'}`,
        color: empty ? '#fca5a5' : low ? '#f9a8d4' : '#4ade80',
        transition: 'all 0.3s',
        userSelect: 'none',
      }}
    >
      {/* Dot animé */}
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: empty ? '#ef4444' : low ? '#e31a80' : '#01b574',
        boxShadow: `0 0 6px ${empty ? '#ef4444' : low ? '#e31a80' : '#01b574'}`,
        animation: refreshing ? 'pulse-slow 0.6s ease-in-out infinite' : (empty ? 'pulse-slow 1.5s ease-in-out infinite' : 'none'),
      }} />

      {/* Compteur */}
      <span style={{ fontWeight: 800, letterSpacing: '-0.01em' }}>{info.remaining}</span>
      <span style={{ opacity: 0.5 }}>/</span>
      <span style={{ opacity: 0.6 }}>{info.limit} req</span>

      {/* Reset time */}
      {(low || empty) && (
        <span style={{ opacity: 0.6, fontSize: 10 }}>· reset {reset}</span>
      )}

      {/* Indicateur de refresh */}
      {refreshing && (
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ animation: 'spin 0.7s linear infinite', opacity: 0.7 }}>
          <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 4" />
        </svg>
      )}
    </div>
  )
}

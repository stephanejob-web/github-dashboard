import { Clock, MessageSquare, Zap, AlertTriangle } from 'lucide-react'

function formatDuration(hours) {
  if (hours < 1)    return `${Math.round(hours * 60)}min`
  if (hours < 24)   return `${Math.round(hours)}h`
  if (hours < 168)  return `${Math.round(hours / 24)}j`
  return `${Math.round(hours / 168)}sem`
}

function AgeBadge({ hours }) {
  if (hours < 24)  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', fontWeight: 700 }}>{formatDuration(hours)}</span>
  if (hours < 72)  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', fontWeight: 700 }}>{formatDuration(hours)}</span>
  if (hours < 168) return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)', fontWeight: 700 }}>{formatDuration(hours)}</span>
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontWeight: 700 }}>🔴 {formatDuration(hours)}</span>
}

export default function PRHealthPanel({ prHealth, topReviewers }) {
  const { avgMergeTimeHours, mergeTimeDist, openPRsAged } = prHealth

  const total = Object.values(mergeTimeDist).reduce((a, b) => a + b, 0)
  const distItems = [
    { label: '< 24h', count: mergeTimeDist.fast,   color: '#4ade80' },
    { label: '1–3j',  count: mergeTimeDist.normal,  color: '#fbbf24' },
    { label: '3–7j',  count: mergeTimeDist.slow,    color: '#f97316' },
    { label: '> 7j',  count: mergeTimeDist.stuck,   color: '#ef4444' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Temps moyen de merge */}
      <div className="glass" style={{ padding: '20px', borderRadius: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#f9a8d4,#e31a80)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={16} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Temps de merge</p>
            <p style={{ fontSize: 10, color: '#4a5568' }}>Durée moyenne PR → merge</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: avgMergeTimeHours < 48 ? '#4ade80' : avgMergeTimeHours < 168 ? '#fbbf24' : '#ef4444', letterSpacing: '-0.03em' }}>
              {total > 0 ? formatDuration(avgMergeTimeHours) : '—'}
            </p>
            <p style={{ fontSize: 10, color: '#4a5568' }}>{total} PRs analysées</p>
          </div>
        </div>

        {total > 0 && (
          <>
            <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', gap: 1, marginBottom: 10 }}>
              {distItems.map(d => d.count > 0 && (
                <div key={d.label} style={{ flex: d.count, background: d.color, opacity: 0.8 }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {distItems.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                  <span style={{ fontSize: 10, color: '#718096' }}>{d.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0' }}>{d.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* PRs ouvertes — par ancienneté */}
      <div className="glass" style={{ padding: '20px', borderRadius: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#fbbf24,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={16} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>PRs en attente</p>
            <p style={{ fontSize: 10, color: '#4a5568' }}>Triées par ancienneté</p>
          </div>
        </div>

        {openPRsAged.length === 0 ? (
          <p style={{ fontSize: 12, color: '#4a5568', textAlign: 'center', padding: '12px 0' }}>
            <Zap size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Aucune PR ouverte — excellent !
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openPRsAged.map(pr => (
              <a
                key={pr.id}
                href={pr.html_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                  padding: '8px 10px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(134,140,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(134,140,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              >
                {pr.user?.avatar_url && (
                  <img src={pr.user.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {pr.title}
                  </p>
                  <p style={{ fontSize: 10, color: '#4a5568' }}>#{pr.number} · {pr.user?.login}</p>
                </div>
                <AgeBadge hours={pr.ageHours} />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Top reviewers */}
      {topReviewers.length > 0 && (
        <div className="glass" style={{ padding: '20px', borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#67e8f9,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={16} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Top reviewers</p>
              <p style={{ fontSize: 10, color: '#4a5568' }}>Par nombre de commentaires de review</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topReviewers.map((r, i) => {
              const max = topReviewers[0].count
              return (
                <div key={r.login} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#2d3748', width: 14, textAlign: 'right' }}>{i + 1}</span>
                  {r.avatar
                    ? <img src={r.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }} />
                    : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(134,140,255,0.2)', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 12, color: '#94a3b8', width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.login}</span>
                  <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ height: 4, borderRadius: 99, background: 'linear-gradient(90deg,#67e8f9,#0ea5e9)', width: `${(r.count / max) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#67e8f9', width: 28, textAlign: 'right' }}>{r.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

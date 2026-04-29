import { Crown, Medal, Award } from 'lucide-react'

const RANK_STYLE = [
  { Icon: Crown, color: '#f0c040', glow: '0 0 12px rgba(240,192,64,0.5)', grad: 'linear-gradient(135deg,#f0c040,#d97706)' },
  { Icon: Medal, color: '#c0c0c0', glow: '0 0 12px rgba(192,192,192,0.3)', grad: 'linear-gradient(135deg,#e2e8f0,#94a3b8)' },
  { Icon: Award, color: '#cd7f32', glow: '0 0 12px rgba(205,127,50,0.3)', grad: 'linear-gradient(135deg,#fbbf24,#92400e)' },
]

const BAR_GRADS = [
  'linear-gradient(90deg,#f0c040,#fbbf24)',
  'linear-gradient(90deg,#868cff,#4318ff)',
  'linear-gradient(90deg,#01b574,#0ea5e9)',
  'linear-gradient(90deg,#e31a80,#f97316)',
]

export default function ContributorsTable({ contributors, authorCommits }) {
  const merged = contributors.map(c => ({
    login: c.login, avatar: c.avatar_url, total: c.contributions,
    activeDays: authorCommits.find(a => a.name === c.login)?.activeDays || 0,
  }))
  const grandTotal = merged.reduce((s, c) => s + c.total, 0)
  const maxTotal = merged[0]?.total || 1

  return (
    <div className="glass fade-up flex flex-col overflow-hidden" style={{ animationDelay: '200ms' }}>
      <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', marginBottom: 4 }}>Classement des contributeurs</h3>
        <p style={{ color: '#4a5568', fontSize: 12 }}>{grandTotal.toLocaleString()} contributions · {merged.length} membres</p>
      </div>

      {/* Table header */}
      <div className="contrib-header">
        <span>#</span><span>Membre</span><span style={{ textAlign: 'right' }}>Contributions</span>
        <span className="col-share" style={{ textAlign: 'right' }}>Part</span>
        <span className="col-days" style={{ textAlign: 'right' }}>Jours</span>
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        {merged.map((c, i) => {
          const pct = Math.round((c.total / maxTotal) * 100)
          const share = Math.round((c.total / grandTotal) * 100)
          const rank = RANK_STYLE[i]
          const barGrad = BAR_GRADS[Math.min(i, BAR_GRADS.length - 1)]

          return (
            <div key={c.login}
              className="contrib-row"
              style={{ cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Rank icon */}
              <div style={{
                width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: rank ? rank.grad : 'rgba(255,255,255,0.05)',
                boxShadow: rank ? rank.glow : 'none',
              }}>
                {rank
                  ? <rank.Icon size={13} color="#fff" />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: '#718096' }}>{i + 1}</span>}
              </div>

              {/* Avatar + name + bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 16, minWidth: 0 }}>
                <img src={c.avatar} alt={c.login} style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  border: i === 0 ? '2px solid #f0c040' : '2px solid rgba(255,255,255,0.1)',
                  boxShadow: i === 0 ? '0 0 10px rgba(240,192,64,0.4)' : 'none',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.login}</p>
                  <div style={{ marginTop: 6, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ height: 4, borderRadius: 99, background: barGrad, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              </div>

              {/* Contributions */}
              <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', textAlign: 'right' }}>{c.total.toLocaleString()}</p>

              {/* Share badge */}
              <div className="col-share" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(134,140,255,0.12)', color: '#868cff',
                  border: '1px solid rgba(134,140,255,0.2)',
                }}>{share}%</span>
              </div>

              {/* Active days */}
              <p className="col-days" style={{ fontSize: 12, color: '#718096', textAlign: 'right' }}>{c.activeDays > 0 ? `${c.activeDays}j` : '—'}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

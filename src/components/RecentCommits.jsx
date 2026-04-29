import { GitCommit } from 'lucide-react'

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (s < 3600) return `${Math.floor(s / 60)}min`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 2592000) return `${Math.floor(s / 86400)}j`
  return `${Math.floor(s / 2592000)}mois`
}

const DOT_GRADS = [
  ['#868cff', '#4318ff'],
  ['#4ade80', '#01b574'],
  ['#67e8f9', '#0ea5e9'],
  ['#fbbf24', '#f97316'],
  ['#f9a8d4', '#e31a80'],
]

export default function RecentCommits({ commits }) {
  const recent = commits.slice(0, 8)
  return (
    <div className="glass fade-up" style={{ animationDelay: '250ms', overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', marginBottom: 4 }}>Derniers commits</h3>
        <p style={{ color: '#4a5568', fontSize: 12 }}>Activité récente du repository</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {recent.map((c, i) => {
          const msg = c.commit.message.split('\n')[0]
          const author = c.author?.login || c.commit.author.name
          const avatar = c.author?.avatar_url
          const sha = c.sha.slice(0, 7)
          const ago = timeAgo(c.commit.author.date)
          const [g1, g2] = DOT_GRADS[i % DOT_GRADS.length]

          return (
            <div key={i}
              style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Dot */}
              <div style={{
                width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: `linear-gradient(135deg,${g1},${g2})`,
                boxShadow: `0 0 12px ${g1}55`,
              }}>
                <GitCommit size={15} color="white" />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {avatar && <img src={avatar} alt={author} style={{ width: 16, height: 16, borderRadius: '50%' }} />}
                  <span style={{ fontSize: 11, color: '#718096' }}>{author}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 6,
                    background: 'rgba(134,140,255,0.12)', color: '#868cff',
                    fontFamily: 'monospace',
                  }}>{sha}</span>
                  <span style={{ fontSize: 11, color: '#718096', marginLeft: 'auto' }}>{ago}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

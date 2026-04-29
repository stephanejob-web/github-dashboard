const MEDALS = [
  { rank: 1, color: '#f0c040', glow: 'rgba(240,192,64,0.5)',   grad: 'linear-gradient(135deg,#f0c040,#d97706)', height: 120, label: '🥇', shadow: '0 0 40px rgba(240,192,64,0.4)' },
  { rank: 2, color: '#c0c0c0', glow: 'rgba(192,192,192,0.4)',  grad: 'linear-gradient(135deg,#e2e8f0,#94a3b8)', height: 80,  label: '🥈', shadow: '0 0 30px rgba(192,192,192,0.3)' },
  { rank: 3, color: '#cd7f32', glow: 'rgba(205,127,50,0.4)',   grad: 'linear-gradient(135deg,#fbbf24,#92400e)', height: 60,  label: '🥉', shadow: '0 0 25px rgba(205,127,50,0.3)' },
]

const SHAME = [
  { rank: 1, color: '#f78166', glow: 'rgba(247,129,102,0.5)', grad: 'linear-gradient(135deg,#f78166,#dc2626)', height: 120, label: '😴', shadow: '0 0 40px rgba(247,129,102,0.4)' },
  { rank: 2, color: '#f9a8d4', glow: 'rgba(249,168,212,0.4)', grad: 'linear-gradient(135deg,#f9a8d4,#e31a80)', height: 80,  label: '🥱', shadow: '0 0 30px rgba(249,168,212,0.3)' },
  { rank: 3, color: '#fbbf24', glow: 'rgba(251,191,36,0.4)',  grad: 'linear-gradient(135deg,#fbbf24,#d97706)', height: 60,  label: '😑', shadow: '0 0 25px rgba(251,191,36,0.3)' },
]

// Ordre d'affichage : 2 - 1 - 3 (comme podium JO)
const ORDER = [1, 0, 2]

function PodiumBlock({ devs, medals, title, subtitle, glowColor }) {
  if (!devs || devs.length === 0) return null
  const total = devs.reduce((s, c) => s + c.contributions, 0)

  return (
    <div className="glass fade-up" style={{ padding: '32px 24px 0', overflow: 'hidden', position: 'relative', flex: 1, minWidth: 280 }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 400, height: 160, background: `radial-gradient(ellipse,${glowColor} 0%,transparent 70%)`, pointerEvents: 'none' }} />

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.01em' }}>{title}</h3>
        <p style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>{subtitle}</p>
      </div>

      {/* Podium */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {ORDER.map(idx => {
          const dev = devs[idx]
          if (!dev) return <div key={idx} style={{ flex: 1 }} />
          const medal = medals[idx]
          const share = total > 0 ? Math.round((dev.contributions / total) * 100) : 0

          return (
            <div key={dev.login} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>

              {/* Infos au-dessus du bloc */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 10, gap: 6 }}>
                <span style={{ fontSize: idx === 0 ? 26 : 20 }}>{medal.label}</span>

                {/* Avatar */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: idx === 0 ? 72 : 56, height: idx === 0 ? 72 : 56,
                    borderRadius: '50%', padding: 3,
                    background: medal.grad, boxShadow: medal.shadow,
                  }}>
                    <img src={dev.avatar_url} alt={dev.login} style={{ width: '100%', height: '100%', borderRadius: '50%', border: '3px solid #0b1437', display: 'block' }} />
                  </div>
                  {/* Rang badge */}
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 20, height: 20, borderRadius: '50%',
                    background: medal.grad, border: '2px solid #0b1437',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 900, color: '#0b1437',
                    boxShadow: `0 0 8px ${medal.glow}`,
                  }}>{medal.rank}</div>
                </div>

                {/* Nom + commits */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontSize: idx === 0 ? 13 : 11, fontWeight: 800, color: medal.color,
                    textShadow: `0 0 10px ${medal.glow}`,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: idx === 0 ? 130 : 100,
                  }}>{dev.login}</p>
                  <p style={{ fontSize: 10, color: '#718096', marginTop: 1 }}>
                    {dev.contributions.toLocaleString()} commits
                  </p>
                </div>
              </div>

              {/* Bloc podium */}
              <div style={{
                width: '100%', height: medal.height,
                background: `linear-gradient(180deg,${medal.color}18 0%,${medal.color}06 100%)`,
                border: `1px solid ${medal.color}30`, borderBottom: 'none',
                borderRadius: '10px 10px 0 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: '-30%', width: '40%', height: '100%', background: `linear-gradient(105deg,transparent,${medal.color}10,transparent)`, pointerEvents: 'none' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: idx === 0 ? 28 : 20, fontWeight: 900, background: medal.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                    #{medal.rank}
                  </p>
                  <p style={{ fontSize: 10, color: medal.color, opacity: 0.7, marginTop: 2 }}>{share}%</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Podium({ contributors }) {
  if (!contributors || contributors.length === 0) return null

  const withCommits = contributors.filter(c => c.contributions > 0)
  const top3 = withCommits.slice(0, 3)

  // Bottom 3 : les moins actifs (triés par commits croissants)
  // On sépare : ceux avec 0 commit d'abord, puis les plus faibles contributeurs
  const noCommits = contributors.filter(c => c.contributions === 0)
  const lowContrib = withCommits.slice(-3).reverse() // les 3 derniers de la liste triée
  const bottom3Raw = [...noCommits, ...lowContrib].slice(0, 3)

  // On évite que bottom3 == top3 (cas où il y a peu de membres)
  const bottom3 = bottom3Raw.filter(b => !top3.find(t => t.login === b.login))
  if (bottom3.length === 0) return (
    <PodiumBlock devs={top3} medals={MEDALS} title="🏆 Meilleurs contributeurs" subtitle="Les plus actifs du repo" glowColor="rgba(240,192,64,0.08)" />
  )

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <PodiumBlock
        devs={top3}
        medals={MEDALS}
        title="🏆 Meilleurs contributeurs"
        subtitle="Les plus actifs du repo"
        glowColor="rgba(240,192,64,0.08)"
      />
      <PodiumBlock
        devs={bottom3}
        medals={SHAME}
        title="😴 Moins actifs"
        subtitle="Ceux qui ont le moins contribué"
        glowColor="rgba(247,129,102,0.08)"
      />
    </div>
  )
}

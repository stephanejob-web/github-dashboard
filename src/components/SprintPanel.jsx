import { Target, Clock, CheckCircle, Circle } from 'lucide-react'

function daysLeftLabel(daysLeft) {
  if (daysLeft === null) return { text: 'Pas de date', color: '#4a5568' }
  if (daysLeft < 0)  return { text: `${Math.abs(daysLeft)}j de retard`, color: '#ef4444' }
  if (daysLeft === 0) return { text: 'Échéance aujourd\'hui', color: '#f97316' }
  if (daysLeft <= 3) return { text: `${daysLeft}j restants`, color: '#f97316' }
  if (daysLeft <= 7) return { text: `${daysLeft}j restants`, color: '#fbbf24' }
  return { text: `${daysLeft}j restants`, color: '#4ade80' }
}

function progressColor(pct) {
  if (pct >= 80) return 'linear-gradient(90deg,#4ade80,#01b574)'
  if (pct >= 50) return 'linear-gradient(90deg,#fbbf24,#f97316)'
  return 'linear-gradient(90deg,#868cff,#4318ff)'
}

export default function SprintPanel({ milestones }) {
  if (!milestones?.length) {
    return (
      <div className="glass" style={{ padding: '24px', borderRadius: 20, textAlign: 'center' }}>
        <Target size={28} color="#4a5568" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#4a5568' }}>Aucun milestone / sprint trouvé</p>
        <p style={{ fontSize: 11, color: '#2d3748', marginTop: 4 }}>
          Créez des Milestones GitHub pour suivre vos sprints ici
        </p>
      </div>
    )
  }

  const open   = milestones.filter(m => m.state === 'open')
  const closed = milestones.filter(m => m.state === 'closed')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {open.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4a5568' }}>
            Sprints en cours ({open.length})
          </p>
          {open.map(m => {
            const dl = daysLeftLabel(m.daysLeft)
            return (
              <div key={m.id} className="glass card-lift" style={{ padding: '18px 20px', borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title}
                    </p>
                    {m.description && (
                      <p style={{ fontSize: 11, color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.description}
                      </p>
                    )}
                  </div>
                  <div style={{
                    flexShrink: 0, padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                    color: dl.color, border: `1px solid ${dl.color}40`, background: `${dl.color}12`,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Clock size={9} />
                    {dl.text}
                  </div>
                </div>

                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', marginBottom: 8 }}>
                  <div style={{
                    height: 6, borderRadius: 99, transition: 'width 0.8s ease',
                    width: `${m.progress}%`, background: progressColor(m.progress),
                    boxShadow: m.progress > 0 ? '0 0 8px rgba(74,222,128,0.3)' : 'none',
                  }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4ade80' }}>
                      <CheckCircle size={11} /> {m.closed_issues} fermées
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#718096' }}>
                      <Circle size={11} /> {m.open_issues} ouvertes
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: m.progress >= 80 ? '#4ade80' : '#e2e8f0' }}>
                    {m.progress}%
                  </span>
                </div>
              </div>
            )
          })}
        </>
      )}

      {closed.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2d3748', marginTop: 8 }}>
            Sprints terminés (5 derniers)
          </p>
          {closed.map(m => (
            <div key={m.id} style={{
              padding: '12px 16px', borderRadius: 14, opacity: 0.55,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={13} color="#4ade80" />
                <span style={{ fontSize: 12, color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.title}
                </span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>100%</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

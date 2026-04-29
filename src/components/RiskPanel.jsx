import { AlertTriangle, Tag, UserX, UserCheck } from 'lucide-react'

function hexToRgb(hex) {
  const n = parseInt(hex?.replace('#', '') || '718096', 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

export default function RiskPanel({ busFactor, busFactorList, labelDist, issuesAssignment }) {
  const totalIssues = (issuesAssignment?.assigned || 0) + (issuesAssignment?.unassigned || 0)
  const unassignedPct = totalIssues > 0
    ? Math.round(((issuesAssignment.unassigned || 0) / totalIssues) * 100)
    : 0

  const busRisk = busFactor <= 1 ? 'critique' : busFactor <= 2 ? 'élevé' : busFactor <= 4 ? 'modéré' : 'faible'
  const busColor = busFactor <= 1 ? '#ef4444' : busFactor <= 2 ? '#f97316' : busFactor <= 4 ? '#fbbf24' : '#4ade80'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Bus Factor */}
      <div className="glass" style={{ padding: '20px', borderRadius: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#fbbf24,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={16} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Bus Factor</p>
            <p style={{ fontSize: 10, color: '#4a5568' }}>Combien de devs couvrent 50% des commits</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ fontSize: 28, fontWeight: 900, color: busColor, letterSpacing: '-0.03em', lineHeight: 1 }}>{busFactor}</p>
            <p style={{ fontSize: 10, color: busColor, fontWeight: 600 }}>risque {busRisk}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {busFactorList.map((c, i) => (
            <div key={c.login} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, width: 16, textAlign: 'center', flexShrink: 0,
                color: i < busFactor ? busColor : '#2d3748',
              }}>
                {i < busFactor ? '●' : '○'}
              </span>
              {c.avatar
                ? <img src={c.avatar} alt="" style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, opacity: i < busFactor ? 1 : 0.35 }} />
                : <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
              }
              <span style={{ fontSize: 11, color: i < busFactor ? '#94a3b8' : '#2d3748', width: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.login}
              </span>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                <div style={{
                  height: 4, borderRadius: 99, width: `${c.pct}%`,
                  background: i < busFactor ? `linear-gradient(90deg,${busColor},${busColor}88)` : 'rgba(255,255,255,0.08)',
                }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: i < busFactor ? busColor : '#2d3748', width: 28, textAlign: 'right' }}>
                {c.pct}%
              </span>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 14, padding: '8px 12px', borderRadius: 10, fontSize: 11, lineHeight: 1.5,
          background: `rgba(${busRisk === 'critique' ? '239,68,68' : busRisk === 'élevé' ? '249,115,22' : '251,191,36'},0.06)`,
          border: `1px solid rgba(${busRisk === 'critique' ? '239,68,68' : busRisk === 'élevé' ? '249,115,22' : '251,191,36'},0.2)`,
          color: '#718096',
        }}>
          {busFactor <= 1
            ? '⚠ 1 seul dev concentre la moitié du code. Risque critique de dépendance.'
            : busFactor <= 2
            ? '⚠ 2 devs seulement couvrent 50% du code. Pensez à mieux répartir les responsabilités.'
            : busFactor <= 4
            ? 'Risque modéré. Encouragez le partage de connaissances entre les membres.'
            : '✓ Bonne répartition des contributions dans l\'équipe.'}
        </div>
      </div>

      {/* Issues assignées / orphelines */}
      {totalIssues > 0 && (
        <div className="glass" style={{ padding: '20px', borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#868cff,#4318ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserX size={16} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Issues ouvertes</p>
              <p style={{ fontSize: 10, color: '#4a5568' }}>Assignées vs sans responsable</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', textAlign: 'center' }}>
              <UserCheck size={16} color="#4ade80" style={{ margin: '0 auto 6px' }} />
              <p style={{ fontSize: 18, fontWeight: 900, color: '#4ade80' }}>{issuesAssignment.assigned}</p>
              <p style={{ fontSize: 10, color: '#4a5568' }}>assignées</p>
            </div>
            <div style={{ flex: 1, padding: '12px', borderRadius: 12, background: unassignedPct > 30 ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${unassignedPct > 30 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`, textAlign: 'center' }}>
              <UserX size={16} color={unassignedPct > 30 ? '#ef4444' : '#4a5568'} style={{ margin: '0 auto 6px' }} />
              <p style={{ fontSize: 18, fontWeight: 900, color: unassignedPct > 30 ? '#ef4444' : '#718096' }}>{issuesAssignment.unassigned}</p>
              <p style={{ fontSize: 10, color: '#4a5568' }}>sans assignee</p>
            </div>
          </div>

          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <div style={{ height: 6, borderRadius: 99, width: `${100 - unassignedPct}%`, background: 'linear-gradient(90deg,#4ade80,#01b574)' }} />
          </div>
          <p style={{ fontSize: 10, color: '#4a5568', marginTop: 6, textAlign: 'right' }}>
            {100 - unassignedPct}% assignées
          </p>
        </div>
      )}

      {/* Label distribution */}
      {labelDist.length > 0 && (
        <div className="glass" style={{ padding: '20px', borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={16} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Labels d'issues</p>
              <p style={{ fontSize: 10, color: '#4a5568' }}>Répartition bug / feature / etc.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {labelDist.map(l => {
              const max = labelDist[0].count
              const rgb = hexToRgb(l.color)
              return (
                <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: `#${l.color}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.name}
                  </span>
                  <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{
                      height: 4, borderRadius: 99, width: `${(l.count / max) * 100}%`,
                      background: `rgba(${rgb},0.7)`,
                    }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#718096', width: 22, textAlign: 'right' }}>{l.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

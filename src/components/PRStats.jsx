import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

function Ring({ value, label, colorFrom, colorTo, size = 80 }) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const fill = Math.min(value / 100, 1) * circ
  const id = `ring-${label.replace(/\s/g, '')}`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={7} stroke="rgba(255,255,255,0.06)" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={7}
          stroke={`url(#${id})`}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ filter: `drop-shadow(0 0 4px ${colorFrom})` }}
        />
        <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="white" fontSize={13} fontWeight="700">{value}%</text>
      </svg>
      <span style={{ fontSize: 11, color: '#718096', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(17,28,68,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px' }}>
      <p style={{ color: '#a0aec0', fontSize: 11 }}>{label}</p>
      <p style={{ color: '#01b574', fontWeight: 700 }}>{payload[0].value} PRs</p>
    </div>
  )
}

export default function PRStats({ prs, issues, prByMonth }) {
  const pills = [
    { label: 'Ouvertes', val: prs.open, from: '#67e8f9', to: '#0ea5e9' },
    { label: 'Mergées', val: prs.merged, from: '#4ade80', to: '#01b574' },
    { label: 'Fermées', val: prs.closed - prs.merged, from: '#f9a8d4', to: '#e31a80' },
  ]

  return (
    <div className="glass fade-up" style={{ animationDelay: '100ms', padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h3 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', marginBottom: 4 }}>Pull Requests</h3>
        <p style={{ color: '#4a5568', fontSize: 12 }}>{prs.total} au total</p>
      </div>

      {/* Rings */}
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <Ring value={prs.mergeRate} label="Taux merge" colorFrom="#868cff" colorTo="#4318ff" />
        <Ring value={issues.resolutionRate} label="Issues résolues" colorFrom="#4ade80" colorTo="#01b574" />
        <Ring value={Math.round((prs.open / Math.max(prs.total, 1)) * 100)} label="En cours" colorFrom="#67e8f9" colorTo="#0ea5e9" />
      </div>

      {/* PR pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {pills.map(p => (
          <div key={p.label} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '12px 8px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 22, fontWeight: 800, background: `linear-gradient(135deg,${p.from},${p.to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{p.val}</p>
            <p style={{ fontSize: 10, color: '#718096', marginTop: 2 }}>{p.label}</p>
          </div>
        ))}
      </div>

      {/* Issues row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Issues ouvertes', val: issues.open, color: '#fbbf24' },
          { label: 'Issues fermées', val: issues.closed, color: '#4ade80' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.color}22`,
            borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, color: '#718096' }}>{item.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#a0aec0', marginBottom: 10 }}>PRs par mois</p>
        <ResponsiveContainer width="100%" height={70}>
          <BarChart data={prByMonth} barSize={16}>
            <defs>
              <linearGradient id="prGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#868cff" />
                <stop offset="100%" stopColor="#4318ff" />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fill: '#718096', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(134,140,255,0.05)' }} />
            <Bar dataKey="count" fill="url(#prGrad)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

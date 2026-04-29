const PALETTE = [
  { from: '#868cff', to: '#4318ff' },
  { from: '#4ade80', to: '#01b574' },
  { from: '#fbbf24', to: '#f97316' },
  { from: '#f9a8d4', to: '#e31a80' },
  { from: '#67e8f9', to: '#0ea5e9' },
  { from: '#d8b4fe', to: '#7c3aed' },
  { from: '#86efac', to: '#16a34a' },
  { from: '#fed7aa', to: '#ea580c' },
]

export default function LanguagesChart({ data }) {
  return (
    <div className="glass fade-up h-full" style={{ animationDelay: '150ms', padding: '28px 28px 24px' }}>
      <h3 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', marginBottom: 4 }}>Langages</h3>
      <p style={{ color: '#4a5568', fontSize: 12, marginBottom: 24 }}>Répartition du code source</p>

      {/* Rainbow bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 24 }}>
        {data.map((lang, i) => {
          const p = PALETTE[i % PALETTE.length]
          return (
            <div key={lang.name} title={`${lang.name} ${lang.value}%`}
              style={{ width: `${lang.value}%`, background: `linear-gradient(90deg,${p.from},${p.to})`, borderRadius: 99, flexShrink: 0 }} />
          )
        })}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {data.map((lang, i) => {
          const p = PALETTE[i % PALETTE.length]
          return (
            <div key={lang.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: `linear-gradient(135deg,${p.from},${p.to})`, flexShrink: 0, boxShadow: `0 0 6px ${p.from}66` }} />
              <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0' }}>{lang.name}</span>
              <div style={{ width: 80, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: 4, borderRadius: 99, background: `linear-gradient(90deg,${p.from},${p.to})`, width: `${lang.value}%` }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: p.from, width: 32, textAlign: 'right' }}>{lang.value}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

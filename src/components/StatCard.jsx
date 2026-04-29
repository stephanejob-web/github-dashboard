export default function StatCard({ icon, label, value, sub, gradient, glowClass, delay = 0 }) {
  return (
    <div
      className={`glass card-lift ${glowClass || ''} fade-up`}
      style={{
        animationDelay: `${delay}ms`,
        padding: '24px 24px 22px',
        minHeight: 148,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent bar at top */}
      <div style={{
        position: 'absolute', top: 0, left: 24, right: 24, height: 2,
        background: gradient, borderRadius: '0 0 4px 4px', opacity: 0.7,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.09em', color: '#718096', marginBottom: 10,
          }}>{label}</p>
          <p className="stat-value">{value}</p>
          {sub && (
            <p style={{ fontSize: 12, color: '#4a5568', marginTop: 8, fontWeight: 500 }}>{sub}</p>
          )}
        </div>

        <div style={{
          width: 46, height: 46, borderRadius: 14, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: gradient,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          <span style={{ color: '#fff', display: 'flex' }}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

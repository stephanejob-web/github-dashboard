import { Cpu, CheckCircle, XCircle, Clock, SkipForward } from 'lucide-react'

function RunDot({ conclusion }) {
  if (conclusion === 'success')   return <span title="Succès"   style={{ width: 10, height: 10, borderRadius: 2, background: '#4ade80', display: 'inline-block' }} />
  if (conclusion === 'failure' || conclusion === 'timed_out')
                                   return <span title="Échec"    style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
  if (conclusion === 'cancelled') return <span title="Annulé"   style={{ width: 10, height: 10, borderRadius: 2, background: '#4a5568', display: 'inline-block' }} />
  if (conclusion === 'skipped')   return <span title="Skipped"  style={{ width: 10, height: 10, borderRadius: 2, background: '#2d3748', display: 'inline-block' }} />
  return                                  <span title="En cours" style={{ width: 10, height: 10, borderRadius: 2, background: '#868cff', display: 'inline-block', animation: 'pulse-slow 1s infinite' }} />
}

function StatusBadge({ conclusion, status }) {
  if (status === 'in_progress' || status === 'queued') {
    return (
      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(134,140,255,0.12)', color: '#868cff', border: '1px solid rgba(134,140,255,0.25)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Clock size={9} /> En cours
      </span>
    )
  }
  if (conclusion === 'success') return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
      <CheckCircle size={9} /> Succès
    </span>
  )
  if (conclusion === 'failure' || conclusion === 'timed_out') return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
      <XCircle size={9} /> Échec
    </span>
  )
  if (conclusion === 'cancelled') return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(74,85,104,0.3)', color: '#4a5568', border: '1px solid rgba(74,85,104,0.3)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
      <SkipForward size={9} /> Annulé
    </span>
  )
  return null
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)   return 'à l\'instant'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}

export default function CIPanel({ ci }) {
  if (!ci || ci.successRate === null) {
    return (
      <div className="glass" style={{ padding: '24px', borderRadius: 20, textAlign: 'center' }}>
        <Cpu size={28} color="#4a5568" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#4a5568' }}>Aucun workflow GitHub Actions trouvé</p>
        <p style={{ fontSize: 11, color: '#2d3748', marginTop: 4 }}>
          Configurez des Actions CI/CD pour voir les résultats ici
        </p>
      </div>
    )
  }

  const { runs, workflows, successRate } = ci
  const srColor = successRate >= 80 ? '#4ade80' : successRate >= 50 ? '#fbbf24' : '#ef4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Taux de succès global */}
      <div className="glass" style={{ padding: '20px', borderRadius: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#a78bfa,#4318ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={16} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>CI / GitHub Actions</p>
            <p style={{ fontSize: 10, color: '#4a5568' }}>30 derniers runs</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ fontSize: 28, fontWeight: 900, color: srColor, letterSpacing: '-0.03em', lineHeight: 1 }}>{successRate}%</p>
            <p style={{ fontSize: 10, color: '#4a5568' }}>taux de succès</p>
          </div>
        </div>

        {/* Sparkline des runs */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 32, marginBottom: 12 }}>
          {runs.map((r, i) => (
            <div
              key={i}
              title={`${r.name} · ${r.conclusion || r.status}`}
              style={{
                flex: 1, borderRadius: 3, transition: 'opacity 0.2s',
                height: r.conclusion === 'success' ? '100%' : r.conclusion === 'failure' || r.conclusion === 'timed_out' ? '80%' : '50%',
                background: r.conclusion === 'success' ? '#4ade80'
                  : r.conclusion === 'failure' || r.conclusion === 'timed_out' ? '#ef4444'
                  : r.conclusion === 'cancelled' ? '#374151'
                  : '#868cff',
                opacity: 0.7,
                cursor: 'default',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { label: 'Succès', color: '#4ade80', count: runs.filter(r => r.conclusion === 'success').length },
            { label: 'Échecs', color: '#ef4444', count: runs.filter(r => r.conclusion === 'failure' || r.conclusion === 'timed_out').length },
            { label: 'Annulés', color: '#4a5568', count: runs.filter(r => r.conclusion === 'cancelled').length },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 10, color: '#718096' }}>{s.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0' }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Par workflow */}
      {workflows.length > 0 && (
        <div className="glass" style={{ padding: '20px', borderRadius: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#718096', marginBottom: 12 }}>Workflows</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workflows.slice(0, 5).map((w, i) => {
              const lastRun = w.lastRun
              const wColor = w.successRate >= 80 ? '#4ade80' : w.successRate >= 50 ? '#fbbf24' : '#ef4444'
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <RunDot conclusion={lastRun?.conclusion} />
                      <span style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {lastRun && <StatusBadge conclusion={lastRun.conclusion} status={lastRun.status} />}
                      <span style={{ fontSize: 10, fontWeight: 700, color: wColor }}>{w.successRate}%</span>
                    </div>
                  </div>
                  {lastRun && (
                    <p style={{ fontSize: 10, color: '#2d3748', paddingLeft: 18 }}>
                      {lastRun.head_branch} · {timeAgo(lastRun.created_at)}
                    </p>
                  )}
                  {i < workflows.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

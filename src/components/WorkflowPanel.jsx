import { useState } from 'react'
import { GitBranch, FileText, Link, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'

/* ── Helpers ── */
function ScoreRing({ score, size = 64 }) {
  const r = size / 2 - 6
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 80 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444'
  const id = `wf-ring-${size}-${score}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color + 'aa'} />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={5} stroke="rgba(255,255,255,0.06)" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={5}
        stroke={`url(#${id})`}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fill="white" fontSize={12} fontWeight="800">{score}%</text>
    </svg>
  )
}

function MetricRow({ icon, label, rate, count, total, detail, colorOk = '#4ade80' }) {
  const color = rate >= 80 ? colorOk : rate >= 50 ? '#fbbf24' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, border: `1px solid ${color}30`, color }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{count}/{total} <span style={{ fontWeight: 400, color: '#4a5568', fontSize: 11 }}>({rate}%)</span></span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ height: 4, borderRadius: 99, width: `${rate}%`, transition: 'width 0.8s ease',
            background: rate >= 80 ? `linear-gradient(90deg,${colorOk},${colorOk}cc)` : rate >= 50 ? 'linear-gradient(90deg,#fbbf24,#f97316)' : 'linear-gradient(90deg,#ef4444,#dc2626)'
          }} />
        </div>
        {detail && <p style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>{detail}</p>}
      </div>
    </div>
  )
}

/* ── Section Branches ── */
function BranchSection({ branchAnalysis }) {
  const [showViolations, setShowViolations] = useState(false)
  const { total, unprotectedTotal, compliantCount, violations, score, distribution, protectedCount } = branchAnalysis

  const scoreColor = score >= 80 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444'

  const DIST_COLORS = {
    feature: '#4ade80', fix: '#f87171', release: '#fbbf24',
    chore: '#818cf8', protected: '#94a3b8', 'non-conforme': '#ef4444',
  }
  const DIST_LABELS = {
    feature: 'Feature', fix: 'Fix/Hotfix', release: 'Release',
    chore: 'Chore/Docs/CI', protected: 'Protégée', 'non-conforme': 'Non conforme',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <ScoreRing score={score} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Nommage des branches</p>
            {score < 80 && (
              <span style={{ fontSize: 11, color: scoreColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={11} /> {score < 50 ? 'Critique' : 'À améliorer'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#4a5568' }}>
            {compliantCount}/{unprotectedTotal} branches conformes · {protectedCount} branche{protectedCount > 1 ? 's' : ''} protégée{protectedCount > 1 ? 's' : ''} · {total} total
          </p>
        </div>
      </div>

      {/* Convention guide */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {[
          { prefix: 'feature/', color: '#4ade80' },
          { prefix: 'fix/ · hotfix/', color: '#f87171' },
          { prefix: 'release/', color: '#fbbf24' },
          { prefix: 'chore/ · docs/ · ci/', color: '#818cf8' },
        ].map(r => (
          <span key={r.prefix} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 8, fontFamily: 'monospace',
            background: `${r.color}12`, border: `1px solid ${r.color}30`, color: r.color,
          }}>{r.prefix}</span>
        ))}
      </div>

      {/* Distribution */}
      {Object.keys(distribution).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {Object.entries(distribution).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: `${DIST_COLORS[type] || '#718096'}12`, border: `1px solid ${DIST_COLORS[type] || '#718096'}30` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: DIST_COLORS[type] || '#718096' }}>{DIST_LABELS[type] || type}</span>
              <span style={{ fontSize: 11, color: '#718096' }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Violations */}
      {violations.length > 0 && (
        <div>
          <button onClick={() => setShowViolations(v => !v)} style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', marginBottom: showViolations ? 10 : 0 }}>
            {showViolations ? '▲' : '▼'} {violations.length} branche{violations.length > 1 ? 's' : ''} non conforme{violations.length > 1 ? 's' : ''}
          </button>
          {showViolations && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {violations.map(v => (
                <div key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <XCircle size={12} color="#ef4444" />
                  <code style={{ fontSize: 12, color: '#f87171', flex: 1 }}>{v.name}</code>
                  <span style={{ fontSize: 10, color: '#4a5568' }}>→ utilise feature/, fix/, release/…</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {violations.length === 0 && unprotectedTotal > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={14} color="#4ade80" />
          <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>Toutes les branches respectent la convention</span>
        </div>
      )}
    </div>
  )
}

/* ── Section PRs ── */
function PRSection({ prAnalysis }) {
  const [showNodesc, setShowNodesc] = useState(false)
  const { total, withDescription, descriptionRate, withIssueRef, issueRefRate, avgCycleHours, avgCycleDays, noDescriptionList, cycleTimes } = prAnalysis

  const cycleColor = avgCycleHours <= 24 ? '#4ade80' : avgCycleHours <= 72 ? '#fbbf24' : '#ef4444'
  const cycleLabel = avgCycleHours <= 24 ? 'Excellent' : avgCycleHours <= 72 ? 'Acceptable' : 'Trop long'

  const formatCycleTime = (h) => {
    if (h < 1) return '< 1h'
    if (h < 24) return `${h}h`
    return `${(h / 24).toFixed(1)}j`
  }

  return (
    <div>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 }}>Qualité des Pull Requests</p>

      {total === 0 ? (
        <p style={{ fontSize: 13, color: '#4a5568' }}>Aucune Pull Request trouvée sur ce repository.</p>
      ) : (
        <>
          {/* Cycle time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 14, background: `${cycleColor}0d`, border: `1px solid ${cycleColor}25`, marginBottom: 16 }}>
            <Clock size={22} color={cycleColor} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: cycleColor, letterSpacing: '-0.03em' }}>{avgCycleDays}j</span>
                <span style={{ fontSize: 12, color: '#718096' }}>cycle time moyen (ouverture → merge)</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: cycleColor, marginLeft: 'auto' }}>{cycleLabel}</span>
              </div>
              {cycleTimes.length > 0 && (
                <p style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                  Min {formatCycleTime(cycleTimes[0]?.hours)} · Max {formatCycleTime(cycleTimes[cycleTimes.length - 1]?.hours)} · sur {cycleTimes.length} PRs mergées
                </p>
              )}
            </div>
          </div>

          {/* Description rate */}
          <MetricRow
            icon={<FileText size={15} />}
            label="Description remplie"
            rate={descriptionRate}
            count={withDescription}
            total={total}
            detail="PRs avec un corps > 50 caractères — facilite la revue de code"
          />

          {/* Issue reference rate */}
          <MetricRow
            icon={<Link size={15} />}
            label="Référence à une issue"
            rate={issueRefRate}
            count={withIssueRef}
            total={total}
            detail='Mots-clés closes #n, fixes #n, resolves #n ou simple #n'
            colorOk="#868cff"
          />

          {/* PRs sans description */}
          {noDescriptionList.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setShowNodesc(v => !v)} style={{ fontSize: 11, color: '#fbbf24', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', marginBottom: showNodesc ? 10 : 0 }}>
                {showNodesc ? '▲' : '▼'} {noDescriptionList.length} PR{noDescriptionList.length > 1 ? 's' : ''} sans description substantielle
              </button>
              {showNodesc && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {noDescriptionList.map(pr => (
                    <div key={pr.number} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
                      <AlertTriangle size={12} color="#fbbf24" />
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>#{pr.number}</span>
                      <span style={{ fontSize: 12, color: '#718096', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.title}</span>
                      <span style={{ fontSize: 11, color: '#4a5568', flexShrink: 0 }}>{pr.author}</span>
                      {pr.url && (
                        <a href={pr.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4a5568', flexShrink: 0 }}>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Composant principal ── */
export default function WorkflowPanel({ branchAnalysis, prAnalysis }) {
  const [tab, setTab] = useState('branches')

  const tabs = [
    { id: 'branches', label: 'Branches', icon: <GitBranch size={14} />, score: branchAnalysis.score },
    { id: 'prs', label: 'Pull Requests', icon: <FileText size={14} />, score: prAnalysis.total > 0 ? Math.round((prAnalysis.descriptionRate + prAnalysis.issueRefRate) / 2) : null },
  ]

  return (
    <div className="glass fade-up" style={{ overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 28px' }}>
        {tabs.map(t => {
          const active = tab === t.id
          const scoreColor = t.score == null ? '#4a5568' : t.score >= 80 ? '#4ade80' : t.score >= 50 ? '#fbbf24' : '#ef4444'
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '16px 0', marginRight: 28,
              fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
              color: active ? '#e2e8f0' : '#4a5568',
              borderBottom: active ? '2px solid #868cff' : '2px solid transparent',
              transition: 'color 0.2s',
            }}>
              <span style={{ color: active ? '#868cff' : '#4a5568' }}>{t.icon}</span>
              {t.label}
              {t.score != null && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: `${scoreColor}18`, color: scoreColor, border: `1px solid ${scoreColor}30` }}>
                  {t.score}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 28px' }}>
        {tab === 'branches' && <BranchSection branchAnalysis={branchAnalysis} />}
        {tab === 'prs' && <PRSection prAnalysis={prAnalysis} />}
      </div>
    </div>
  )
}

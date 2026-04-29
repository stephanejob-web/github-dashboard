import { FlaskConical, Cpu, GitPullRequest, GitCommit, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

function formatDuration(hours) {
  if (!hours) return '—'
  if (hours < 1)   return `${Math.round(hours * 60)}min`
  if (hours < 24)  return `${Math.round(hours)}h`
  if (hours < 168) return `${Math.round(hours / 24)}j`
  return `${Math.round(hours / 168)}sem`
}

function buildAlerts({ quality, ci, commitLint, prHealth, busFactor, milestones }) {
  const alerts = []
  const sig = quality?.signals || {}

  if (!quality?.hasTests)
    alerts.push({ level: 'critical', msg: 'Aucun framework de test détecté dans ce projet' })
  else if (!sig.ciHasTests)
    alerts.push({ level: 'warning', msg: 'Tests configurés mais non exécutés en CI — les régressions peuvent passer inaperçues' })

  if (ci?.successRate !== null && ci?.successRate < 50)
    alerts.push({ level: 'critical', msg: `CI défaillante : ${ci.successRate}% de succès sur les 30 derniers runs` })
  else if (ci?.successRate !== null && ci?.successRate < 75)
    alerts.push({ level: 'warning', msg: `CI instable : ${ci.successRate}% de succès` })

  if ((commitLint?.score ?? 100) < 40)
    alerts.push({ level: 'warning', msg: `Conventions commits faible : ${commitLint.score}% — messages non conformes` })

  if (busFactor === 1)
    alerts.push({ level: 'critical', msg: '1 seul développeur concentre 50%+ du code — risque critique' })
  else if (busFactor === 2)
    alerts.push({ level: 'warning', msg: '2 développeurs seulement couvrent 50% du code' })

  prHealth?.openPRsAged?.filter(pr => pr.ageDays >= 14).forEach(pr =>
    alerts.push({ level: 'warning', msg: `PR #${pr.number} bloquée depuis ${pr.ageDays}j : "${pr.title?.slice(0, 45)}…"` })
  )

  milestones?.filter(m => m.state === 'open' && m.daysLeft !== null && m.daysLeft < 0).forEach(m =>
    alerts.push({ level: 'critical', msg: `Sprint "${m.title}" en retard de ${Math.abs(m.daysLeft)}j` })
  )

  return alerts.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.level] - ({ critical: 0, warning: 1, info: 2 }[b.level])))
}

function AlertRow({ a }) {
  const cfg = {
    critical: { bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.22)', color: '#ef4444', icon: <XCircle size={13} /> },
    warning:  { bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.22)', color: '#fbbf24', icon: <AlertCircle size={13} /> },
    info:     { bg: 'rgba(134,140,255,0.07)', border: 'rgba(134,140,255,0.18)', color: '#868cff', icon: <Info size={13} /> },
  }[a.level]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 13px', borderRadius: 11, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
      <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{a.msg}</span>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, color, detail }) {
  return (
    <div className="glass" style={{ padding: '20px 22px', borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <p style={{ fontSize: 12, color: '#718096', fontWeight: 600 }}>{label}</p>
      </div>

      <div>
        <p style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: '#4a5568', marginTop: 5 }}>{sub}</p>}
      </div>

      {detail && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
          {detail}
        </div>
      )}
    </div>
  )
}

export default function SMOverview({
  authorCommits: _ac, commitLintByAuthor: _cla, topReviewers: _tr,
  devTestActivity: _dta, prHealth, busFactor, ci, quality,
  commitLint, issuesAssignment: _ia, milestones = [],
}) {
  const alerts = buildAlerts({ quality, ci, commitLint, prHealth, busFactor, milestones })
  const criticals = alerts.filter(a => a.level === 'critical')
  const warnings  = alerts.filter(a => a.level === 'warning')

  // ── Métrique 1 : Tests ────────────────────────────────────────
  const hasTests    = quality?.hasTests ?? false
  const testFramework = quality?.signals
    ? (quality.signals.jest ? 'Jest' : quality.signals.vitest ? 'Vitest' : quality.signals.mocha ? 'Mocha'
      : quality.signals.pytest ? 'Pytest' : quality.signals.cypress ? 'Cypress'
      : quality.signals.playwright ? 'Playwright' : quality.signals.goTest ? 'Go test'
      : quality.signals.testDirs ? 'Tests détectés' : null)
    : null
  const ciTests = quality?.signals?.ciHasTests ?? false
  const testColor = hasTests && ciTests ? '#4ade80' : hasTests ? '#fbbf24' : '#ef4444'
  const testValue = hasTests ? testFramework || 'Détecté' : 'Aucun'
  const testSub   = hasTests
    ? (ciTests ? 'Exécutés en CI ✓' : 'Non exécutés en CI ✗')
    : 'Aucun framework trouvé'

  // ── Métrique 2 : CI ───────────────────────────────────────────
  const ciRate  = ci?.successRate ?? null
  const ciColor = ciRate === null ? '#4a5568' : ciRate >= 80 ? '#4ade80' : ciRate >= 60 ? '#fbbf24' : '#ef4444'
  const ciValue = ciRate !== null ? `${ciRate}%` : '—'
  const ciSub   = ciRate !== null
    ? `${ci.runs?.filter(r => r.conclusion === 'success').length ?? 0} succès / ${ci.runs?.length ?? 0} runs récents`
    : 'GitHub Actions non configuré'
  const ciDetail = ciRate !== null && ci?.workflows?.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {ci.workflows.slice(0, 3).map((w, i) => {
        const wc = w.successRate >= 80 ? '#4ade80' : w.successRate >= 60 ? '#fbbf24' : '#ef4444'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{w.name}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: wc, flexShrink: 0 }}>{w.successRate}%</span>
          </div>
        )
      })}
    </div>
  ) : null

  // ── Métrique 3 : Merge time ───────────────────────────────────
  const avgH    = prHealth?.avgMergeTimeHours ?? null
  const dist    = prHealth?.mergeTimeDist
  const total   = dist ? Object.values(dist).reduce((a, b) => a + b, 0) : 0
  const mergeColor = avgH === null ? '#4a5568' : avgH < 24 ? '#4ade80' : avgH < 72 ? '#fbbf24' : avgH < 168 ? '#f97316' : '#ef4444'
  const mergeValue = avgH !== null ? formatDuration(avgH) : '—'
  const mergeSub   = total > 0 ? `sur ${total} PRs mergées` : 'Aucune PR mergée analysée'
  const mergeDetail = dist && total > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {[
        { label: '< 24h (rapide)',  count: dist.fast,   color: '#4ade80' },
        { label: '1–3j (normal)',   count: dist.normal,  color: '#fbbf24' },
        { label: '3–7j (lent)',     count: dist.slow,    color: '#f97316' },
        { label: '> 7j (bloqué)',   count: dist.stuck,   color: '#ef4444' },
      ].map(d => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: 2, background: d.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#718096', flex: 1 }}>{d.label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: d.count > 0 ? d.color : '#2d3748' }}>{d.count}</span>
        </div>
      ))}
    </div>
  ) : null

  // ── Métrique 4 : Conventions commits ─────────────────────────
  const convScore = commitLint?.score ?? null
  const convColor = convScore === null ? '#4a5568' : convScore >= 80 ? '#4ade80' : convScore >= 50 ? '#fbbf24' : '#ef4444'
  const convValue = convScore !== null ? `${convScore}%` : '—'
  const convSub   = convScore !== null
    ? `${commitLint.valid ?? 0} conformes / ${commitLint.total ?? 0} commits analysés`
    : 'Données non disponibles'
  const convDetail = convScore !== null ? (
    <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
      <div style={{ height: 5, borderRadius: 99, width: `${convScore}%`, background: `linear-gradient(90deg,${convColor}88,${convColor})`, transition: 'width 1s ease' }} />
    </div>
  ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── 4 métriques ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <MetricCard icon={<FlaskConical size={17} />}  label="Tests"                 value={testValue}  sub={testSub}   color={testColor}  />
        <MetricCard icon={<Cpu size={17} />}           label="Taux de succès CI"     value={ciValue}    sub={ciSub}     color={ciColor}    detail={ciDetail} />
        <MetricCard icon={<GitPullRequest size={17} />}label="Temps moyen de merge"  value={mergeValue} sub={mergeSub}  color={mergeColor} detail={mergeDetail} />
        <MetricCard icon={<GitCommit size={17} />}     label="Conventions commits"   value={convValue}  sub={convSub}   color={convColor}  detail={convDetail} />
      </div>

      {/* ── Points d'attention ── */}
      {alerts.length > 0 ? (
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568' }}>
              Points d'attention
            </p>
            {criticals.length > 0 && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontWeight: 700 }}>
                {criticals.length} critique{criticals.length > 1 ? 's' : ''}
              </span>
            )}
            {warnings.length > 0 && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', fontWeight: 700 }}>
                {warnings.length} warning{warnings.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {alerts.map((a, i) => <AlertRow key={i} a={a} />)}
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={15} color="#4ade80" />
          <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>Aucun point critique détecté</span>
        </div>
      )}
    </div>
  )
}

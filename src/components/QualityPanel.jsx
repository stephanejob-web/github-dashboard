import { ShieldCheck, CheckCircle, XCircle, FlaskConical, Wrench, Cpu, GitCommit } from 'lucide-react'

function scoreGrade(score) {
  if (score >= 85) return { grade: 'A', color: '#4ade80', label: 'Excellent' }
  if (score >= 70) return { grade: 'B', color: '#86efac', label: 'Bon' }
  if (score >= 55) return { grade: 'C', color: '#fbbf24', label: 'Moyen' }
  if (score >= 35) return { grade: 'D', color: '#f97316', label: 'Insuffisant' }
  return { grade: 'F', color: '#ef4444', label: 'Critique' }
}

const CATEGORY_META = {
  tests:   { label: 'Tests',   icon: <FlaskConical size={13} />, color: '#4ade80' },
  ci:      { label: 'CI/CD',   icon: <Cpu size={13} />,          color: '#868cff' },
  quality: { label: 'Qualité', icon: <Wrench size={13} />,       color: '#67e8f9' },
}

function ScoreGauge({ score }) {
  const { grade, color, label } = scoreGrade(score)
  const r = 38
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color + '88'} />
          </linearGradient>
        </defs>
        <circle cx={50} cy={50} r={r} fill="none" strokeWidth={8} stroke="rgba(255,255,255,0.05)" />
        <circle cx={50} cy={50} r={r} fill="none" strokeWidth={8}
          stroke={`url(#scoreGrad)`}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fill={color} fontSize="22" fontWeight="900" fontFamily="inherit">{grade}</text>
        <text x="50" y="60" textAnchor="middle" fill="#4a5568" fontSize="10" fontFamily="inherit">{score}/100</text>
      </svg>
      <p style={{ fontSize: 11, fontWeight: 700, color }}>{label}</p>
    </div>
  )
}

function CheckRow({ ok, label, weight }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', borderRadius: 9,
      background: ok ? 'rgba(74,222,128,0.04)' : 'rgba(239,68,68,0.04)',
      border: `1px solid ${ok ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.1)'}`,
    }}>
      {ok
        ? <CheckCircle size={13} color="#4ade80" style={{ flexShrink: 0 }} />
        : <XCircle size={13} color="#374151" style={{ flexShrink: 0 }} />
      }
      <span style={{ flex: 1, fontSize: 12, color: ok ? '#94a3b8' : '#4a5568' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: ok ? '#4ade80' : '#2d3748' }}>+{weight}pts</span>
    </div>
  )
}

export default function QualityPanel({ quality, devTestActivity = [] }) {
  if (!quality || !quality.scoreItems?.length) {
    return (
      <div className="glass" style={{ padding: '24px', borderRadius: 20, textAlign: 'center' }}>
        <ShieldCheck size={28} color="#4a5568" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#4a5568' }}>Analyse qualité indisponible</p>
      </div>
    )
  }

  const { score, scoreItems, signals } = quality
  const { color } = scoreGrade(score)

  const byCategory = { tests: [], ci: [], quality: [] }
  scoreItems.forEach(item => byCategory[item.category]?.push(item))

  // Détection du framework de test
  const testFramework = signals.jest ? 'Jest'
    : signals.vitest ? 'Vitest'
    : signals.mocha ? 'Mocha'
    : signals.pytest ? 'Pytest'
    : signals.goTest ? 'Go test'
    : signals.phpunit ? 'PHPUnit'
    : signals.rspec ? 'RSpec'
    : null

  const scriptsList = Object.entries(signals.pkgScripts || {}).slice(0, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Score global */}
      <div className="glass" style={{ padding: '24px', borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <ScoreGauge score={score} />

          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Outillage & bonnes pratiques détectés
            </p>

            {testFramework && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, marginBottom: 12,
                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}>
                <FlaskConical size={11} color="#4ade80" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>{testFramework} détecté</span>
              </div>
            )}
            {!testFramework && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, marginBottom: 12,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <XCircle size={11} color="#ef4444" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>Aucun framework de test détecté</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {signals.prettier && <Tag color="#f472b6">Prettier</Tag>}
              {signals.eslint && <Tag color="#818cf8">ESLint</Tag>}
              {signals.typescript && <Tag color="#60a5fa">TypeScript</Tag>}
              {signals.husky && <Tag color="#fb923c">Husky</Tag>}
              {signals.commitlint && <Tag color="#a78bfa">Commitlint</Tag>}
              {signals.lintStaged && <Tag color="#34d399">lint-staged</Tag>}
              {signals.editorconfig && <Tag color="#94a3b8">.editorconfig</Tag>}
              {signals.hasWorkflows && <Tag color="#868cff">{signals.workflowCount} workflow{signals.workflowCount > 1 ? 's' : ''} CI</Tag>}
            </div>
          </div>

          {/* Barre de progression */}
          <div style={{ width: '100%', marginTop: 4 }}>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{
                height: 6, borderRadius: 99, width: `${score}%`,
                background: `linear-gradient(90deg,${color}88,${color})`,
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Checklist par catégorie */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        {Object.entries(byCategory).map(([cat, items]) => {
          if (!items.length) return null
          const meta = CATEGORY_META[cat]
          const catOk = items.filter(i => i.ok).length
          return (
            <div key={cat} className="glass" style={{ padding: '18px', borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ color: meta.color }}>{meta.icon}</span>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {meta.label}
                </p>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: meta.color }}>
                  {catOk}/{items.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(item => <CheckRow key={item.key} ok={item.ok} label={item.label} weight={item.weight} />)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scripts npm */}
      {scriptsList.length > 0 && (
        <div className="glass" style={{ padding: '18px', borderRadius: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Scripts package.json
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {scriptsList.map(([name, cmd]) => (
              <div key={name} style={{
                padding: '5px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#868cff' }}>{name}</span>
                <span style={{ fontSize: 10, color: '#2d3748', marginLeft: 6, fontFamily: 'monospace' }}>
                  {String(cmd).slice(0, 40)}{String(cmd).length > 40 ? '…' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activité test par développeur */}
      {devTestActivity.length > 0 && (
        <div className="glass" style={{ padding: '18px', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <GitCommit size={14} color="#4ade80" />
            <p style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Commits test par développeur
            </p>
            <span style={{ fontSize: 10, color: '#2d3748', marginLeft: 'auto' }}>
              basé sur les messages de commits
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devTestActivity.map(d => (
              <div key={d.login} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {d.avatar
                  ? <img src={d.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                  : <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#4ade80', fontWeight: 700 }}>
                      {d.login[0]?.toUpperCase()}
                    </div>
                }
                <span style={{ fontSize: 12, color: '#94a3b8', width: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.login}</span>
                <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{
                    height: 5, borderRadius: 99,
                    width: `${d.testPct}%`,
                    background: d.testPct >= 20 ? 'linear-gradient(90deg,#4ade80,#01b574)'
                      : d.testPct >= 5 ? 'linear-gradient(90deg,#fbbf24,#f97316)'
                      : 'rgba(255,255,255,0.1)',
                  }} />
                </div>
                <div style={{ textAlign: 'right', width: 60, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.testPct >= 20 ? '#4ade80' : d.testPct >= 5 ? '#fbbf24' : '#4a5568' }}>
                    {d.testPct}%
                  </span>
                  <span style={{ fontSize: 9, color: '#2d3748', display: 'block' }}>
                    {d.testRelated}/{d.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#2d3748', marginTop: 10 }}>
            * % de commits dont le message mentionne : test, spec, coverage, jest, vitest, pytest…
          </p>
        </div>
      )}
    </div>
  )
}

function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 10, padding: '3px 9px', borderRadius: 99, fontWeight: 700,
      background: `${color}15`, color, border: `1px solid ${color}35`,
    }}>{children}</span>
  )
}

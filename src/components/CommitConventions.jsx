import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { getTypeLabel, CONVENTIONAL_TYPES } from '../utils/commitLint'

function ScoreRing({ score, size = 72 }) {
  const r = size / 2 - 7
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 80 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444'
  const id = `ring-conv-${size}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color + 'aa'} />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={6} stroke="rgba(255,255,255,0.06)" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={6}
        stroke={`url(#${id})`}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="white" fontSize={14} fontWeight="800">{score}%</text>
    </svg>
  )
}

function TypeBadge({ type }) {
  if (!type) return <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:'rgba(113,128,150,0.15)', color:'#718096', fontWeight:600 }}>inconnu</span>
  const { label, color } = getTypeLabel(type)
  return (
    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:`${color}18`, color, fontWeight:700, border:`1px solid ${color}33` }}>{label}</span>
  )
}

function AuthorRow({ stat }) {
  const [open, setOpen] = useState(false)
  const color = stat.score >= 80 ? '#4ade80' : stat.score >= 50 ? '#fbbf24' : '#ef4444'
  const barColor = stat.score >= 80
    ? 'linear-gradient(90deg,#4ade80,#01b574)'
    : stat.score >= 50
      ? 'linear-gradient(90deg,#fbbf24,#f97316)'
      : 'linear-gradient(90deg,#ef4444,#dc2626)'

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Row principal */}
      <div
        onClick={() => stat.violations.length > 0 && setOpen(o => !o)}
        className="author-row-grid"
        style={{
          cursor: stat.violations.length > 0 ? 'pointer' : 'default',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => { if (stat.violations.length > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Nom + barre */}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>{stat.author}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', maxWidth: 200 }}>
              <div style={{ height: 4, borderRadius: 99, background: barColor, width: `${stat.score}%`, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{stat.score}%</span>
          </div>
        </div>

        {/* Total commits */}
        <div className="col-total" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{stat.total}</p>
          <p style={{ fontSize: 9, color: '#4a5568', marginTop: 2 }}>commits</p>
        </div>

        {/* Conformes */}
        <div className="col-valid" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#4ade80' }}>{stat.valid}</p>
          <p style={{ fontSize: 9, color: '#4a5568', marginTop: 2 }}>conformes</p>
        </div>

        {/* Violations */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: stat.violations.length > 0 ? '#ef4444' : '#4a5568' }}>
            {stat.violations.length}
          </p>
          <p style={{ fontSize: 9, color: '#4a5568', marginTop: 2 }}>violations</p>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', color: '#4a5568' }}>
          {stat.violations.length > 0 && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
        </div>
      </div>

      {/* Détail des violations */}
      {open && stat.violations.length > 0 && (
        <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stat.violations.map(v => (
            <div key={v.sha} style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <XCircle size={13} color="#ef4444" />
                <TypeBadge type={v.type} />
                <code style={{ fontSize: 11, color: '#868cff', background: 'rgba(134,140,255,0.12)', padding: '1px 6px', borderRadius: 5 }}>{v.sha}</code>
                <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.message}</span>
                {v.url && (
                  <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4a5568', flexShrink: 0 }}>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 22 }}>
                {v.errors.map((err, i) => (
                  <p key={i} style={{ fontSize: 11, color: '#fca5a5' }}>↳ {err}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TypeDistribution({ distribution, total }) {
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {sorted.map(([type, count]) => {
        const { label, color } = getTypeLabel(type)
        const pct = Math.round((count / total) * 100)
        return (
          <div key={type} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 99,
            background: `${color}12`, border: `1px solid ${color}30`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
            <span style={{ fontSize: 11, color: '#718096' }}>{count}</span>
            <span style={{ fontSize: 10, color: '#4a5568' }}>{pct}%</span>
          </div>
        )
      })}
      {/* Types manquants */}
      {CONVENTIONAL_TYPES.filter(t => !distribution[t]).map(t => {
        const { label, color } = getTypeLabel(t)
        return (
          <div key={t} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 99,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            opacity: 0.4,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
            <span style={{ fontSize: 11, color: '#4a5568' }}>0</span>
          </div>
        )
      })}
    </div>
  )
}

function ParasiteSection({ parasites, total }) {
  const [open, setOpen] = useState(false)
  if (total === 0) return null
  const rate = Math.round((parasites.length / total) * 100)
  const color = parasites.length === 0 ? '#4ade80' : rate > 20 ? '#ef4444' : '#fbbf24'

  return (
    <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, border: `1px solid ${color}30` }}>
            {parasites.length === 0
              ? <CheckCircle size={15} color={color} />
              : <AlertTriangle size={15} color={color} />}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Commits parasites</p>
            <p style={{ fontSize: 11, color: '#4a5568' }}>wip, tmp, fixup, "test", "aaaa"…</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: '-0.03em' }}>{parasites.length}</span>
          <span style={{ fontSize: 11, color: '#4a5568' }}>sur {total}</span>
          {parasites.length > 0 && (
            <button onClick={() => setOpen(v => !v)} style={{ fontSize: 11, color: '#4a5568', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer' }}>
              {open ? '▲ Masquer' : '▼ Voir'}
            </button>
          )}
        </div>
      </div>
      {open && parasites.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {parasites.slice(0, 10).map(v => (
            <div key={v.sha} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
              <XCircle size={12} color="#ef4444" />
              {v.avatar && <img src={v.avatar} alt={v.author} style={{ width: 18, height: 18, borderRadius: '50%' }} />}
              <span style={{ fontSize: 11, color: '#718096', fontWeight: 600, flexShrink: 0 }}>{v.author}</span>
              <code style={{ fontSize: 11, color: '#f87171', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.message}</code>
              <code style={{ fontSize: 10, color: '#4a5568', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 5, flexShrink: 0 }}>{v.sha}</code>
              {v.url && <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4a5568', flexShrink: 0 }}><ExternalLink size={10} /></a>}
            </div>
          ))}
          {parasites.length > 10 && <p style={{ fontSize: 11, color: '#4a5568', paddingLeft: 4 }}>… et {parasites.length - 10} autres</p>}
        </div>
      )}
      {parasites.length === 0 && (
        <p style={{ fontSize: 12, color: '#4ade80', marginTop: 8, paddingLeft: 42 }}>Aucun commit parasite détecté</p>
      )}
    </div>
  )
}

function IssueRefSection({ withIssueRef, issueRefRate, total }) {
  if (total === 0) return null
  return (
    <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(134,140,255,0.12)', border: '1px solid rgba(134,140,255,0.25)' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#868cff' }}>#</span>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Traçabilité — liens issues</p>
            <p style={{ fontSize: 11, color: '#4a5568' }}>closes #n · fixes #n · resolves #n · #n dans le message</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#868cff', letterSpacing: '-0.03em' }}>{issueRefRate}%</span>
          <span style={{ fontSize: 11, color: '#4a5568' }}>{withIssueRef}/{total} commits</span>
        </div>
      </div>
      <div style={{ marginTop: 10, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
        <div style={{ height: 5, borderRadius: 99, width: `${issueRefRate}%`, transition: 'width 0.8s ease', background: 'linear-gradient(90deg,#868cff,#4318ff)' }} />
      </div>
      <p style={{ fontSize: 11, color: '#4a5568', marginTop: 6 }}>
        {issueRefRate >= 50
          ? 'Bonne traçabilité — les commits sont liés au backlog'
          : issueRefRate >= 20
            ? 'Traçabilité partielle — encourager les références aux issues'
            : 'Traçabilité faible — difficile de lier les commits aux user stories'}
      </p>
    </div>
  )
}

export default function CommitConventions({ commitLint, commitLintByAuthor }) {
  const [showAll, setShowAll] = useState(false)
  const { score, total, valid, violations, typeDistribution, parasites, withIssueRef, issueRefRate } = commitLint

  const scoreColor = score >= 80 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444'
  const displayedViolations = showAll ? violations : violations.slice(0, 5)
  const authorsToShow = commitLintByAuthor.filter(a => a.total > 0)

  return (
    <div className="glass fade-up" style={{ overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>

          {/* Titre + score global */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ScoreRing score={score} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em', marginBottom: 4 }}>
                Conventions de commits
              </h3>
              <p style={{ fontSize: 12, color: '#4a5568', marginBottom: 10 }}>
                Analyse Conventional Commits · {total} commits analysés
              </p>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={13} color="#4ade80" />
                  <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>{valid} conformes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <XCircle size={13} color="#ef4444" />
                  <span style={{ fontSize: 12, color: violations.length > 0 ? '#ef4444' : '#4a5568', fontWeight: 600 }}>{violations.length} violations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Jauge qualité */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a5568' }}>
              <span>Taux de conformité</span>
              <span style={{ fontWeight: 700, color: scoreColor }}>{score}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{
                height: 8, borderRadius: 99, transition: 'width 0.8s ease',
                width: `${score}%`,
                background: score >= 80
                  ? 'linear-gradient(90deg,#4ade80,#01b574)'
                  : score >= 50
                    ? 'linear-gradient(90deg,#fbbf24,#f97316)'
                    : 'linear-gradient(90deg,#ef4444,#dc2626)',
                boxShadow: `0 0 8px ${scoreColor}55`,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a5568' }}>
              <span style={{ color: '#ef4444' }}>0%</span>
              <span style={{ color: '#fbbf24' }}>50%</span>
              <span style={{ color: '#4ade80' }}>100%</span>
            </div>
            {score < 80 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, padding: '6px 10px', borderRadius: 8, background: score < 50 ? 'rgba(239,68,68,0.08)' : 'rgba(251,191,36,0.08)', border: `1px solid ${score < 50 ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
                <AlertTriangle size={12} color={score < 50 ? '#ef4444' : '#fbbf24'} />
                <span style={{ fontSize: 11, color: score < 50 ? '#fca5a5' : '#fbbf24' }}>
                  {score < 50 ? 'Niveau critique — intervention requise' : 'À améliorer — objectif ≥ 80%'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Distribution des types ── */}
      <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#4a5568', marginBottom: 12 }}>
          Répartition des types
        </p>
        <TypeDistribution distribution={typeDistribution} total={valid} />
      </div>

      {/* ── Commits parasites ── */}
      <ParasiteSection parasites={parasites} total={total} />

      {/* ── Traçabilité issues ── */}
      <IssueRefSection withIssueRef={withIssueRef} issueRefRate={issueRefRate} total={total} />

      {/* ── Tableau par auteur ── */}
      <div>
        <div className="author-header-grid">
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568' }}>Développeur</p>
          <p className="col-total" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', textAlign: 'center' }}>Commits</p>
          <p className="col-valid" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', textAlign: 'center' }}>Conformes</p>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', textAlign: 'center' }}>Violations</p>
          <p></p>
        </div>
        {authorsToShow.map(stat => (
          <AuthorRow key={stat.author} stat={stat} />
        ))}
      </div>

      {/* ── Dernières violations globales ── */}
      {violations.length > 0 && (
        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#ef4444' }}>
              Commits non conformes ({violations.length})
            </p>
            {violations.length > 5 && (
              <button onClick={() => setShowAll(v => !v)} style={{ fontSize: 11, color: '#868cff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                {showAll ? 'Voir moins' : `Voir tout (${violations.length})`}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayedViolations.map(v => (
              <div key={v.sha} style={{
                padding: '12px 16px', borderRadius: 12,
                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  {v.avatar && <img src={v.avatar} alt={v.author} style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0 }} />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{v.author}</span>
                  <TypeBadge type={v.type} />
                  <code style={{ fontSize: 11, color: '#868cff', background: 'rgba(134,140,255,0.12)', padding: '1px 6px', borderRadius: 5 }}>{v.sha}</code>
                  <span style={{ fontSize: 11, color: '#4a5568', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.message}
                  </span>
                  {v.url && (
                    <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4a5568', flexShrink: 0 }}>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <div style={{ paddingLeft: 26, display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
                  {v.errors.map((err, i) => (
                    <span key={i} style={{ fontSize: 11, color: '#fca5a5' }}>↳ {err}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {violations.length === 0 && (
        <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <CheckCircle size={20} color="#4ade80" />
          <p style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
            Tous les commits respectent la convention — excellent travail d'équipe !
          </p>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { ShieldAlert, ShieldCheck, ShieldX, AlertTriangle, FileWarning, Key, Bug, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'

const SEVERITY_META = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'Critique', Icon: ShieldX },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', label: 'Haute',    Icon: AlertTriangle },
  medium:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', label: 'Moyenne',  Icon: AlertTriangle },
  low:      { color: '#718096', bg: 'rgba(113,128,150,0.08)', border: 'rgba(113,128,150,0.2)', label: 'Faible',  Icon: ShieldAlert },
}

const TYPE_ICON = {
  sensitive_file:     <FileWarning size={14} />,
  env_not_ignored:    <Key size={14} />,
  missing_gitignore:  <FileWarning size={14} />,
  hardcoded_secret:   <Key size={14} />,
  github_secret_alert:<ShieldX size={14} />,
  dependabot:         <Bug size={14} />,
}

function ScoreGauge({ score }) {
  const color = score >= 80 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444'
  const label = score >= 80 ? 'Sûr' : score >= 50 ? 'À risque' : 'Critique'
  const r = 38, circ = 2 * Math.PI * r, fill = (score / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" strokeWidth={8} stroke="rgba(255,255,255,0.05)" />
        <circle cx={50} cy={50} r={r} fill="none" strokeWidth={8}
          stroke={color}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fill={color} fontSize="20" fontWeight="900" fontFamily="inherit">{score}</text>
        <text x="50" y="60" textAnchor="middle" fill="#4a5568" fontSize="10" fontFamily="inherit">/100</text>
      </svg>
      <p style={{ fontSize: 11, fontWeight: 700, color }}>{label}</p>
    </div>
  )
}

function IssueRow({ issue }) {
  const [expanded, setExpanded] = useState(false)
  const meta = SEVERITY_META[issue.severity] || SEVERITY_META.low
  const Icon = meta.Icon
  const typeIcon = TYPE_ICON[issue.type]
  const hasFiles = Array.isArray(issue.files) && issue.files.length > 0

  return (
    <div style={{ borderRadius: 12, background: meta.bg, border: `1px solid ${meta.border}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 12, padding: '12px 14px' }}>
        <div style={{ flexShrink: 0, marginTop: 2, color: meta.color }}>
          <Icon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{issue.title}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
              {meta.label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#718096', marginBottom: hasFiles ? 6 : 0 }}>{issue.detail}</p>

          {/* Bouton expand fichiers */}
          {hasFiles && (
            <button onClick={() => setExpanded(e => !e)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
              color: '#868cff', background: 'rgba(134,140,255,0.1)', border: '1px solid rgba(134,140,255,0.2)',
              padding: '3px 10px', borderRadius: 8, cursor: 'pointer',
            }}>
              {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {expanded ? 'Masquer' : 'Voir'} les {issue.files.length} fichier{issue.files.length > 1 ? 's' : ''}
            </button>
          )}

          {/* Fichier unique (non-expandable) */}
          {!hasFiles && issue.file && (
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#868cff', background: 'rgba(134,140,255,0.08)', padding: '2px 8px', borderRadius: 6, display: 'inline-block' }}>
              {issue.file}
            </p>
          )}
          {issue.url && (
            <a href={issue.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#868cff', marginTop: 4 }}>
              <ExternalLink size={10} /> Voir sur GitHub
            </a>
          )}
        </div>
        <div style={{ flexShrink: 0, color: '#4a5568' }}>{typeIcon}</div>
      </div>

      {/* Liste des fichiers expandable */}
      {expanded && hasFiles && (
        <div style={{ borderTop: `1px solid ${meta.border}`, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {issue.files.map((f, i) => {
            const path = typeof f === 'string' ? f : f.path
            const url  = typeof f === 'string' ? null : f.url
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: '#4a5568', width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: 11, fontFamily: 'monospace', color: '#868cff',
                    background: 'rgba(134,140,255,0.07)', padding: '2px 8px', borderRadius: 6,
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0,
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                    <ExternalLink size={9} style={{ flexShrink: 0 }} />
                  </a>
                ) : (
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#868cff', background: 'rgba(134,140,255,0.07)', padding: '2px 8px', borderRadius: 6 }}>
                    {path}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SecurityPanel({ security }) {
  if (!security) return null

  const { issues, criticalCount, highCount, score, hasGitignore, gitignoreCoversEnv, secretScanningAvailable } = security

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Score global */}
      <div className="glass" style={{ padding: 24, borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <ScoreGauge score={score} />

          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', marginBottom: 10, letterSpacing: '-0.02em' }}>
              Analyse de sécurité
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ textAlign: 'center', padding: '10px 18px', borderRadius: 12, background: criticalCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.06)', border: `1px solid ${criticalCount > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.2)'}` }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: criticalCount > 0 ? '#ef4444' : '#4ade80', lineHeight: 1 }}>{criticalCount}</p>
                <p style={{ fontSize: 10, color: '#718096', marginTop: 3 }}>Critiques</p>
              </div>
              <div style={{ textAlign: 'center', padding: '10px 18px', borderRadius: 12, background: highCount > 0 ? 'rgba(249,115,22,0.08)' : 'rgba(74,222,128,0.06)', border: `1px solid ${highCount > 0 ? 'rgba(249,115,22,0.25)' : 'rgba(74,222,128,0.2)'}` }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: highCount > 0 ? '#f97316' : '#4ade80', lineHeight: 1 }}>{highCount}</p>
                <p style={{ fontSize: 10, color: '#718096', marginTop: 3 }}>Hautes</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontWeight: 700, background: hasGitignore ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', color: hasGitignore ? '#4ade80' : '#ef4444', border: `1px solid ${hasGitignore ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                {hasGitignore ? '✓' : '✗'} .gitignore
              </span>
              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontWeight: 700, background: gitignoreCoversEnv ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', color: gitignoreCoversEnv ? '#4ade80' : '#ef4444', border: `1px solid ${gitignoreCoversEnv ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                {gitignoreCoversEnv ? '✓' : '✗'} .env ignoré
              </span>
              {secretScanningAvailable && (
                <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontWeight: 700, background: 'rgba(134,140,255,0.1)', color: '#868cff', border: '1px solid rgba(134,140,255,0.25)' }}>
                  ✓ Secret scanning GitHub actif
                </span>
              )}
            </div>
          </div>

          {/* Barre score */}
          <div style={{ width: '100%', marginTop: 4 }}>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{
                height: 6, borderRadius: 99, width: `${score}%`,
                background: score >= 80 ? 'linear-gradient(90deg,#4ade8088,#4ade80)' : score >= 50 ? 'linear-gradient(90deg,#fbbf2488,#fbbf24)' : 'linear-gradient(90deg,#ef444488,#ef4444)',
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Liste des problèmes */}
      {issues.length > 0 ? (
        <div className="glass" style={{ padding: 18, borderRadius: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Problèmes détectés ({issues.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {issues.map((issue, i) => <IssueRow key={i} issue={issue} />)}
          </div>
        </div>
      ) : (
        <div className="glass" style={{ padding: 32, borderRadius: 16, textAlign: 'center' }}>
          <ShieldCheck size={32} color="#4ade80" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', marginBottom: 6 }}>Aucun problème détecté</p>
          <p style={{ fontSize: 12, color: '#4a5568' }}>Aucun fichier sensible, secret ou vulnérabilité trouvé dans ce repo.</p>
        </div>
      )}

      {!secretScanningAvailable && (
        <p style={{ fontSize: 11, color: '#4a5568', textAlign: 'center' }}>
          * Secret scanning GitHub non disponible sur ce repo (nécessite GitHub Advanced Security ou repo public avec secret scanning activé)
        </p>
      )}
    </div>
  )
}

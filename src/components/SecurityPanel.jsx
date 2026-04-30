import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, ShieldX, AlertTriangle, FileWarning, Key, Bug, ExternalLink, ChevronDown, ChevronRight, ShieldAlert, History } from 'lucide-react'
import { fetchSecurityScan } from '../api/github'

const SEVERITY_META = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.25)',    label: 'Critique',    Icon: ShieldX },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.25)',   label: 'Haute',       Icon: AlertTriangle },
  medium:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.25)',   label: 'Moyenne',     Icon: AlertTriangle },
  low:      { color: '#718096', bg: 'rgba(113,128,150,0.08)',  border: 'rgba(113,128,150,0.2)',   label: 'Faible',      Icon: ShieldAlert },
  info:     { color: '#38bdf8', bg: 'rgba(56,189,248,0.05)',   border: 'rgba(56,189,248,0.15)',   label: 'À vérifier',  Icon: ShieldAlert },
}

const TYPE_ICON = {
  sensitive_file:          <FileWarning size={14} />,
  env_not_ignored:         <Key size={14} />,
  missing_gitignore:       <FileWarning size={14} />,
  hardcoded_secret:        <Key size={14} />,
  github_secret_alert:     <ShieldX size={14} />,
  github_secret_history:   <History size={14} />,
  sensitive_file_history:  <History size={14} />,
  env_example_real_values: <Key size={14} />,
  env_example_ok:          <ShieldCheck size={14} />,
  gitguardian:             <ShieldX size={14} />,
  dependabot:              <Bug size={14} />,
}

const SCAN_STEPS = [
  'Analyse des fichiers sensibles...',
  'Vérification du .gitignore...',
  'Recherche de secrets hardcodés...',
  'Scan des clés AWS / GitHub / Stripe...',
  'Vérification Dependabot...',
  'Analyse GitHub Secret Scanning...',
  'Analyse de l\'historique git...',
  'Scan GitGuardian (350+ types de secrets)...',
  'Génération du rapport...',
]

/* ── Animation radar SVG ─────────────────────────────────── */
function RadarAnimation({ color }) {
  return (
    <svg width={160} height={160} viewBox="0 0 160 160" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Cercles concentriques */}
      {[60, 45, 30, 15].map((r, i) => (
        <circle key={i} cx={80} cy={80} r={r} fill="none"
          stroke={color} strokeOpacity={0.12 + i * 0.04} strokeWidth={1}
          strokeDasharray="3 4"
        />
      ))}

      {/* Lignes de guidage */}
      {[0, 45, 90, 135].map(angle => {
        const rad = (angle * Math.PI) / 180
        return (
          <line key={angle}
            x1={80} y1={80}
            x2={80 + 62 * Math.cos(rad)} y2={80 + 62 * Math.sin(rad)}
            stroke={color} strokeOpacity={0.1} strokeWidth={1}
          />
        )
      })}

      {/* Sweep radar animé */}
      <g style={{ transformOrigin: '80px 80px', animation: 'radarSweep 2s linear infinite' }}>
        <defs>
          <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path d={`M 80 80 L ${80 + 62} 80 A 62 62 0 0 1 ${80 + 62 * Math.cos(-Math.PI * 0.5)} ${80 + 62 * Math.sin(-Math.PI * 0.5)} Z`}
          fill="url(#sweepGrad)" opacity={0.5}
        />
        <line x1={80} y1={80} x2={80 + 62} y2={80} stroke={color} strokeWidth={1.5} strokeOpacity={0.8} />
      </g>

      {/* Glow central */}
      <circle cx={80} cy={80} r={62} fill="url(#radarGlow)" />

      {/* Centre */}
      <circle cx={80} cy={80} r={4} fill={color} opacity={0.9} />
      <circle cx={80} cy={80} r={8} fill="none" stroke={color} strokeOpacity={0.4} strokeWidth={1} />
    </svg>
  )
}

/* ── Écran de scan animé ─────────────────────────────────── */
function ScanningScreen() {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep(s => Math.min(s + 1, SCAN_STEPS.length - 1))
    }, 400)
    const progInterval = setInterval(() => {
      setProgress(p => Math.min(p + 2, 95))
    }, 55)
    return () => { clearInterval(stepInterval); clearInterval(progInterval) }
  }, [])

  return (
    <div className="glass" style={{ padding: 40, borderRadius: 20, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Fond animé */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Radar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, position: 'relative' }}>
        <RadarAnimation color="#ef4444" />
        {/* Shield au centre du radar */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg,rgba(239,68,68,0.3),rgba(249,115,22,0.2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(239,68,68,0.3)',
          animation: 'shieldPulse 1.5s ease-in-out infinite',
        }}>
          <ShieldAlert size={22} color="#ef4444" />
        </div>
      </div>

      {/* Titre */}
      <p style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginBottom: 6, letterSpacing: '-0.01em' }}>
        Scan de sécurité en cours
      </p>

      {/* Étape courante */}
      <p style={{ fontSize: 12, color: '#868cff', marginBottom: 20, height: 18, fontFamily: 'monospace' }}>
        › {SCAN_STEPS[step]}
      </p>

      {/* Barre de progression */}
      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{
          height: 4, borderRadius: 99,
          background: 'linear-gradient(90deg,#ef4444,#f97316)',
          width: `${progress}%`,
          transition: 'width 0.08s linear',
          boxShadow: '0 0 8px rgba(239,68,68,0.6)',
        }} />
      </div>

      {/* Log défilant */}
      <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 14px', maxHeight: 100, overflow: 'hidden' }}>
        {SCAN_STEPS.slice(0, step + 1).map((s, i) => (
          <p key={i} style={{
            fontSize: 10, fontFamily: 'monospace',
            color: i === step ? '#4ade80' : '#374151',
            marginBottom: 2,
            animation: i === step ? 'fadeInLog 0.3s ease' : 'none',
          }}>
            {i === step ? '▶' : '✓'} {s}
          </p>
        ))}
      </div>
    </div>
  )
}

/* ── Gauge score ─────────────────────────────────────────── */
function ScoreGauge({ score }) {
  const color = score >= 80 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444'
  const label = score >= 80 ? 'Sécurisé' : score >= 50 ? 'À risque' : 'Critique'
  const Icon  = score >= 80 ? ShieldCheck : score >= 50 ? AlertTriangle : ShieldX
  const r = 42, circ = 2 * Math.PI * r, fill = (score / 100) * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 110, height: 110 }}>
        {/* Glow derrière */}
        <div style={{
          position: 'absolute', inset: -10,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
          animation: 'gaugeGlow 2s ease-in-out infinite',
        }} />
        <svg width={110} height={110} viewBox="0 0 110 110">
          <circle cx={55} cy={55} r={r} fill="none" strokeWidth={8} stroke="rgba(255,255,255,0.05)" />
          <circle cx={55} cy={55} r={r} fill="none" strokeWidth={8}
            stroke={color}
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color})` }}
          />
          <text x="55" y="50" textAnchor="middle" fill={color} fontSize="22" fontWeight="900" fontFamily="inherit">{score}</text>
          <text x="55" y="64" textAnchor="middle" fill="#4a5568" fontSize="10" fontFamily="inherit">/100</text>
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: `${color}15`, border: `1px solid ${color}35` }}>
        <Icon size={11} color={color} />
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
      </div>
    </div>
  )
}

/* ── Ligne issue ─────────────────────────────────────────── */
function IssueRow({ issue, index }) {
  const [expanded, setExpanded] = useState(false)
  const meta     = SEVERITY_META[issue.severity] || SEVERITY_META.low
  const Icon     = meta.Icon
  const typeIcon = TYPE_ICON[issue.type]
  const hasFiles = Array.isArray(issue.files) && issue.files.length > 0

  return (
    <div style={{
      borderRadius: 14, background: meta.bg, border: `1px solid ${meta.border}`,
      overflow: 'hidden',
      animation: `fadeSlideIn 0.4s ease both`,
      animationDelay: `${index * 80}ms`,
    }}>
      <div style={{ display: 'flex', gap: 12, padding: '14px 16px' }}>
        {/* Bande gauche colorée */}
        <div style={{ width: 3, borderRadius: 99, background: meta.color, flexShrink: 0, alignSelf: 'stretch', minHeight: 20 }} />

        <div style={{ color: meta.color, flexShrink: 0, marginTop: 1 }}>
          <Icon size={16} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{issue.title}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
              background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40`,
            }}>
              {meta.label}
            </span>
            {issue.type === 'gitguardian' && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
                GitGuardian {issue.validity === 'valid' ? '⚠ actif' : issue.validity === 'invalid' ? '✓ révoqué' : '? inconnu'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#718096', marginBottom: hasFiles ? 8 : 0 }}>{issue.detail}</p>

          {hasFiles && (
            <button onClick={() => setExpanded(e => !e)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
              color: '#868cff', background: 'rgba(134,140,255,0.1)', border: '1px solid rgba(134,140,255,0.25)',
              padding: '4px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {expanded ? 'Masquer' : 'Voir'} {issue.files.length} fichier{issue.files.length > 1 ? 's' : ''}
            </button>
          )}

          {!hasFiles && issue.file && (
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#868cff', background: 'rgba(134,140,255,0.08)', padding: '2px 8px', borderRadius: 6 }}>
              {issue.file}
            </span>
          )}
          {issue.url && (
            <a href={issue.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#868cff', marginTop: 4 }}>
              <ExternalLink size={10} /> Voir sur GitHub
            </a>
          )}
        </div>
        <div style={{ flexShrink: 0, color: '#4a5568', alignSelf: 'flex-start' }}>{typeIcon}</div>
      </div>

      {/* Liste fichiers expandable */}
      {expanded && hasFiles && (
        <div style={{ borderTop: `1px solid ${meta.border}`, padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {issue.files.map((f, i) => {
            const path = typeof f === 'string' ? f : f.path
            const url  = typeof f === 'string' ? null : f.url
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, animation: `fadeSlideIn 0.2s ease both`, animationDelay: `${i * 40}ms` }}>
                <span style={{ fontSize: 10, color: '#4a5568', width: 18, textAlign: 'right', flexShrink: 0, fontWeight: 700 }}>{i + 1}</span>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{
                    flex: 1, minWidth: 0, fontSize: 11, fontFamily: 'monospace', color: '#a78bfa',
                    background: 'rgba(134,140,255,0.07)', padding: '4px 10px', borderRadius: 8,
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(134,140,255,0.15)',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(134,140,255,0.14)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(134,140,255,0.07)'}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{path}</span>
                    <ExternalLink size={9} style={{ flexShrink: 0, opacity: 0.6 }} />
                  </a>
                ) : (
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#a78bfa', background: 'rgba(134,140,255,0.07)', padding: '4px 10px', borderRadius: 8 }}>
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

/* ── Composant principal ─────────────────────────────────── */
export default function SecurityPanel({ security, owner, repo, token, ggToken: ggTokenProp, onSaveGGToken }) {
  const [scanning, setScanning] = useState(true)
  const [liveData, setLiveData] = useState(null)
  const [ggScanning, setGGScanning] = useState(false)
  const [ggTokenInput, setGGTokenInput] = useState(ggTokenProp || '')
  const [showGGInput, setShowGGInput] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!security) return
    const t = setTimeout(() => setScanning(false), 2800)
    return () => clearTimeout(t)
  }, [security])

  async function handleGGScan() {
    const tok = ggTokenInput.trim()
    if (!tok) { setShowGGInput(true); setTimeout(() => inputRef.current?.focus(), 50); return }
    if (onSaveGGToken) onSaveGGToken(tok)
    setGGScanning(true)
    try {
      const result = await fetchSecurityScan(owner, repo, token, tok)
      setLiveData(result)
    } catch {}
    setGGScanning(false)
  }

  if (!security || scanning) return <ScanningScreen />

  const displayData = liveData ?? security
  const { issues, criticalCount, highCount, historyCount = 0, score, hasGitignore, gitignoreCoversEnv, secretScanningAvailable, ggScanned = false } = displayData
  const currentIssues = issues.filter(i => !i.fromHistory && i.severity !== 'info')
  const infoIssues    = issues.filter(i => !i.fromHistory && i.severity === 'info')
  const historyIssues = issues.filter(i => i.fromHistory)
  const scoreColor = score >= 80 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header score */}
      <div className="glass" style={{ padding: 28, borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
        {/* Glow fond */}
        <div style={{
          position: 'absolute', top: '-30%', right: '-10%', width: 300, height: 300,
          borderRadius: '50%', background: `radial-gradient(circle, ${scoreColor}12 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', position: 'relative' }}>
          <ScoreGauge score={score} />

          <div style={{ flex: 1, minWidth: 200 }}>
            {/* Titre + badge scan terminé */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                Analyse de sécurité
              </p>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                ✓ Scan terminé
              </span>
            </div>

            {/* Compteurs critiques/hautes */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              {[
                { val: criticalCount,  label: 'Critique(s)',    color: '#ef4444' },
                { val: highCount,      label: 'Haute(s)',       color: '#f97316' },
                { val: historyCount,   label: 'Historique git', color: '#a78bfa' },
                { val: issues.length,  label: 'Total issues',   color: '#868cff' },
              ].map(k => (
                <div key={k.label} style={{
                  textAlign: 'center', padding: '8px 16px', borderRadius: 12,
                  background: `${k.color}10`, border: `1px solid ${k.color}25`,
                }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: k.val > 0 ? k.color : '#4ade80', lineHeight: 1 }}>{k.val}</p>
                  <p style={{ fontSize: 10, color: '#4a5568', marginTop: 2 }}>{k.label}</p>
                </div>
              ))}
            </div>

            {/* Badges état */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge ok={hasGitignore} label=".gitignore" />
              <Badge ok={gitignoreCoversEnv} label=".env ignoré" />
              {secretScanningAvailable && <Badge ok={true} label="Secret scanning actif" />}
              {ggScanned && <Badge ok={true} label="GitGuardian ✓" color="#f97316" />}
            </div>

            {/* Bouton GitGuardian */}
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {showGGInput && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={inputRef}
                    type="password"
                    value={ggTokenInput}
                    onChange={e => setGGTokenInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGGScan()}
                    placeholder="ggtt_xxxxxxxxxxxxxxxxxxxx"
                    style={{
                      flex: 1, padding: '9px 13px', borderRadius: 10, fontSize: 13,
                      color: '#e2e8f0', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(249,115,22,0.4)', outline: 'none',
                    }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={handleGGScan}
                  disabled={ggScanning}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 18px', borderRadius: 10, cursor: ggScanning ? 'wait' : 'pointer',
                    fontSize: 13, fontWeight: 700, border: 'none', transition: 'all 0.2s',
                    background: ggScanning
                      ? 'rgba(249,115,22,0.15)'
                      : 'linear-gradient(135deg, #f97316, #ea580c)',
                    color: '#fff',
                    boxShadow: ggScanning ? 'none' : '0 0 20px rgba(249,115,22,0.4)',
                  }}
                  onMouseEnter={e => { if (!ggScanning) e.currentTarget.style.boxShadow = '0 0 30px rgba(249,115,22,0.6)' }}
                  onMouseLeave={e => { if (!ggScanning) e.currentTarget.style.boxShadow = '0 0 20px rgba(249,115,22,0.4)' }}
                >
                  {ggScanning
                    ? <><span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Scan GitGuardian...</>
                    : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Scanner avec GitGuardian</>
                  }
                </button>
                {!showGGInput && !ggTokenProp && (
                  <button onClick={() => setShowGGInput(v => !v)} style={{ fontSize: 11, color: '#4a5568', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    {showGGInput ? 'Masquer' : 'Configurer token'}
                  </button>
                )}
                {liveData && (
                  <span style={{ fontSize: 11, color: '#4ade80' }}>✓ Scan terminé</span>
                )}
              </div>
            </div>

          </div>

          {/* Barre score full width */}
          <div style={{ width: '100%', marginTop: 4 }}>
            <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{
                height: 5, borderRadius: 99, width: `${score}%`,
                background: `linear-gradient(90deg,${scoreColor}66,${scoreColor})`,
                boxShadow: `0 0 8px ${scoreColor}55`,
                transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Issues courantes */}
      {currentIssues.length > 0 && (
        <div className="glass" style={{ padding: 18, borderRadius: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Problèmes actifs ({currentIssues.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentIssues.map((issue, i) => <IssueRow key={i} issue={issue} index={i} />)}
          </div>
        </div>
      )}

      {/* Issues historique git */}
      {historyIssues.length > 0 && (
        <div className="glass" style={{ padding: 18, borderRadius: 16, borderColor: 'rgba(167,139,250,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <History size={13} color="#a78bfa" />
            <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Trouvé dans l'historique git ({historyIssues.length})
            </p>
            <span style={{ fontSize: 10, color: '#4a5568', fontStyle: 'italic' }}>— supprimé depuis, mais visible dans git log</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historyIssues.map((issue, i) => <IssueRow key={i} issue={issue} index={i} />)}
          </div>
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
            <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>⚠ Action requise :</span> Ces fichiers/secrets ont été commités dans le passé.
              Même supprimés, ils restent dans git log. Utilisez{' '}
              <code style={{ fontSize: 10, background: 'rgba(167,139,250,0.1)', padding: '1px 5px', borderRadius: 4, color: '#c4b5fd' }}>git-filter-repo</code>
              {' '}pour réécrire l'historique et révoquez les secrets exposés.
            </p>
          </div>
        </div>
      )}

      {/* Notices à vérifier (info) */}
      {infoIssues.length > 0 && (
        <div className="glass" style={{ padding: 16, borderRadius: 16, borderColor: 'rgba(56,189,248,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ShieldCheck size={13} color="#38bdf8" />
            <p style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              À vérifier ({infoIssues.length})
            </p>
            <span style={{ fontSize: 10, color: '#4a5568', fontStyle: 'italic' }}>— pas de faille, vérification manuelle conseillée</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {infoIssues.map((issue, i) => <IssueRow key={i} issue={issue} index={i} />)}
          </div>
        </div>
      )}

      {currentIssues.length === 0 && historyIssues.length === 0 && infoIssues.length === 0 && (
        <div className="glass" style={{ padding: 40, borderRadius: 16, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(74,222,128,0.05) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,rgba(74,222,128,0.2),rgba(1,181,116,0.1))', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 30px rgba(74,222,128,0.2)' }}>
              <ShieldCheck size={30} color="#4ade80" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#4ade80', marginBottom: 6 }}>Aucun problème détecté</p>
            <p style={{ fontSize: 12, color: '#4a5568' }}>Aucun fichier sensible, secret exposé ou vulnérabilité trouvé — historique git inclus.</p>
          </div>
        </div>
      )}

      {!secretScanningAvailable && (
        <p style={{ fontSize: 10, color: '#2d3748', textAlign: 'center' }}>
          * Secret scanning GitHub non disponible — nécessite GitHub Advanced Security ou repo public avec secret scanning activé
        </p>
      )}
    </div>
  )
}

function Badge({ ok, label, color }) {
  const c = color ?? (ok ? '#4ade80' : '#ef4444')
  return (
    <span style={{
      fontSize: 10, padding: '3px 10px', borderRadius: 99, fontWeight: 700,
      background: `${c}18`,
      color: c,
      border: `1px solid ${c}40`,
    }}>
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

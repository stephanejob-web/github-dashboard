import { useState, useEffect } from 'react'
import { ShieldX, ShieldCheck, AlertTriangle, ExternalLink, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { fetchGGReport } from '../api/github'

const STATUS_META = {
  TRIGGERED: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'Actif',    Icon: ShieldX },
  ASSIGNED:  { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', label: 'Assigné',  Icon: AlertTriangle },
  RESOLVED:  { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)',  label: 'Résolu',   Icon: ShieldCheck },
  IGNORED:   { color: '#718096', bg: 'rgba(113,128,150,0.08)', border: 'rgba(113,128,150,0.2)', label: 'Ignoré',  Icon: ShieldCheck },
}

const VALIDITY_META = {
  valid:    { color: '#ef4444', label: '⚠ Secret actif' },
  invalid:  { color: '#4ade80', label: '✓ Révoqué' },
  unknown:  { color: '#718096', label: '? Inconnu' },
  no_checker: { color: '#718096', label: '— Non vérifié' },
}

function IncidentRow({ inc, index }) {
  const [open, setOpen] = useState(false)
  const status   = STATUS_META[inc.status] ?? STATUS_META.TRIGGERED
  const validity = VALIDITY_META[inc.validity] ?? VALIDITY_META.unknown
  const date     = inc.date ? new Date(inc.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '?'

  return (
    <div style={{
      borderRadius: 12, background: status.bg, border: `1px solid ${status.border}`,
      overflow: 'hidden',
      animation: 'fadeSlideIn 0.35s ease both',
      animationDelay: `${index * 60}ms`,
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
      >
        {/* Bande */}
        <div style={{ width: 3, borderRadius: 99, background: status.color, alignSelf: 'stretch', flexShrink: 0, minHeight: 20 }} />

        <status.Icon size={15} color={status.color} style={{ flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
              {inc.detector?.display_name ?? inc.detector_name ?? 'Secret inconnu'}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}40`, flexShrink: 0 }}>
              {status.label}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: validity.color, flexShrink: 0 }}>
              {validity.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#4a5568' }}>{date}</span>
            {inc.occurrences_count > 1 && (
              <span style={{ fontSize: 11, color: '#718096' }}>{inc.occurrences_count} occurrences</span>
            )}
            {inc.source?.full_name && (
              <span style={{ fontSize: 11, color: '#4a5568', fontFamily: 'monospace' }}>{inc.source.full_name}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {inc.permalink && (
            <a href={inc.permalink} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ color: '#868cff', display: 'flex', alignItems: 'center' }}
            >
              <ExternalLink size={12} />
            </a>
          )}
          <span style={{ color: '#4a5568' }}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${status.border}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {inc.secret_hash && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#4a5568', width: 100, flexShrink: 0 }}>Hash secret</span>
              <code style={{ fontSize: 11, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '2px 8px', borderRadius: 6 }}>{inc.secret_hash.slice(0, 20)}...</code>
            </div>
          )}
          {inc.assignee_email && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#4a5568', width: 100, flexShrink: 0 }}>Assigné à</span>
              <span style={{ fontSize: 11, color: '#e2e8f0' }}>{inc.assignee_email}</span>
            </div>
          )}
          {inc.resolved_at && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#4a5568', width: 100, flexShrink: 0 }}>Résolu le</span>
              <span style={{ fontSize: 11, color: '#4ade80' }}>{new Date(inc.resolved_at).toLocaleDateString('fr-FR')}</span>
            </div>
          )}
          {inc.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {inc.tags.map(t => (
                <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: '#718096', border: '1px solid rgba(255,255,255,0.08)' }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GGReportPanel({ owner, repo, ggToken }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('ALL')

  async function load() {
    if (!ggToken) return
    setLoading(true)
    const r = await fetchGGReport(owner, repo, ggToken)
    setReport(r)
    setLoading(false)
  }

  useEffect(() => { load() }, [owner, repo, ggToken])

  if (!ggToken) return null

  if (loading) return (
    <div className="glass" style={{ padding: 24, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#f97316', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
      <span style={{ fontSize: 13, color: '#718096' }}>Chargement rapport GitGuardian...</span>
    </div>
  )

  if (!report) return null

  if (report.error) {
    const isScopeError = report.error === 'scope_insufficient'
    return (
      <div className="glass" style={{ padding: 20, borderRadius: 16, background: isScopeError ? 'rgba(249,115,22,0.05)' : 'rgba(239,68,68,0.06)', border: `1px solid ${isScopeError ? 'rgba(249,115,22,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: isScopeError ? '#f97316' : '#ef4444', marginBottom: 4 }}>
              {isScopeError ? 'Rapport incidents non disponible' : `Erreur GitGuardian : ${report.error}`}
            </p>
            {isScopeError && (
              <>
                <p style={{ fontSize: 12, color: '#718096', lineHeight: 1.6, marginBottom: 8 }}>
                  L'API incidents GitGuardian est réservée aux plans <strong style={{ color: '#e2e8f0' }}>Team / Enterprise</strong> (payants). Le compte gratuit donne uniquement accès au scan de fichiers.
                </p>
                <p style={{ fontSize: 11, color: '#4a5568', lineHeight: 1.6 }}>
                  Le scan de secrets reste actif dans le panel ci-dessus — il analyse les fichiers du repo directement via l'API GG scan.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const { incidents, triggered, resolved, validCount, allCount, totalCount, hasMore } = report

  const FILTERS = [
    { key: 'ALL',       label: 'Tous',    count: incidents.length },
    { key: 'TRIGGERED', label: 'Actifs',  count: incidents.filter(i => i.status === 'TRIGGERED').length },
    { key: 'RESOLVED',  label: 'Résolus', count: incidents.filter(i => i.status === 'RESOLVED').length },
    { key: 'IGNORED',   label: 'Ignorés', count: incidents.filter(i => i.status === 'IGNORED').length },
  ]

  const filtered = filter === 'ALL' ? incidents : incidents.filter(i => i.status === filter)

  return (
    <div className="glass" style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(249,115,22,0.2)' }}>

      {/* Header */}
      <div style={{ padding: '18px 20px', background: 'rgba(249,115,22,0.05)', borderBottom: '1px solid rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* GG Logo */}
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(249,115,22,0.4)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.01em' }}>Rapport GitGuardian</p>
            <p style={{ fontSize: 11, color: '#4a5568' }}>
              {incidents.length} incident{incidents.length !== 1 ? 's' : ''} sur ce repo
              {allCount > incidents.length && ` · ${allCount} au total`}
              {hasMore && ` · ${totalCount} trouvés (100 affichés)`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Stat chips */}
          {[
            { val: triggered, label: 'Actifs',   color: '#ef4444' },
            { val: validCount, label: 'Valides',  color: '#f97316' },
            { val: resolved,  label: 'Résolus',  color: '#4ade80' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '5px 12px', borderRadius: 10, background: `${s.color}10`, border: `1px solid ${s.color}25` }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: s.val > 0 ? s.color : '#374151', lineHeight: 1 }}>{s.val}</p>
              <p style={{ fontSize: 9, color: '#4a5568', marginTop: 1 }}>{s.label}</p>
            </div>
          ))}

          <button onClick={load} title="Rafraîchir" style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: '#4a5568' }}
            onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.color = '#4a5568'}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      {incidents.length > 0 && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: filter === f.key ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === f.key ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: filter === f.key ? '#f97316' : '#718096',
            }}>
              {f.label} {f.count > 0 && <span style={{ opacity: 0.7 }}>({f.count})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Incidents list */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <ShieldCheck size={28} color="#4ade80" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>
              {incidents.length === 0 ? 'Aucun incident détecté sur ce repo' : 'Aucun incident dans cette catégorie'}
            </p>
            {incidents.length === 0 && allCount > 0 && (
              <p style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                Ce repo n'est peut-être pas encore monitoré par GitGuardian.
              </p>
            )}
          </div>
        ) : (
          filtered.map((inc, i) => <IncidentRow key={inc.id ?? i} inc={inc} index={i} />)
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronRight, ShieldX, AlertTriangle, ShieldAlert, ShieldCheck, Package } from 'lucide-react'

const SEV_META = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   label: 'Critique', Icon: ShieldX },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)',  label: 'Haute',    Icon: AlertTriangle },
  medium:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',  label: 'Moyenne',  Icon: AlertTriangle },
  low:      { color: '#718096', bg: 'rgba(113,128,150,0.08)', border: 'rgba(113,128,150,0.2)',  label: 'Faible',   Icon: ShieldAlert },
}

const ECOSYSTEM_COLOR = {
  npm: '#f7df1e', PyPI: '#3572A5', Go: '#00ADD8', 'crates.io': '#dea584',
}

function VulnRow({ vuln, index }) {
  const [open, setOpen] = useState(false)
  const meta = SEV_META[vuln.severity] ?? SEV_META.low
  const ghsaId = vuln.aliases?.find(a => a.startsWith('GHSA-'))
  const cveId  = vuln.aliases?.find(a => a.startsWith('CVE-')) ?? vuln.id

  return (
    <div style={{
      borderRadius: 12, background: meta.bg, border: `1px solid ${meta.border}`,
      overflow: 'hidden',
      animation: 'fadeSlideIn 0.35s ease both',
      animationDelay: `${index * 50}ms`,
    }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}>
        <div style={{ width: 3, borderRadius: 99, background: meta.color, alignSelf: 'stretch', flexShrink: 0, minHeight: 20 }} />
        <meta.Icon size={15} color={meta.color} style={{ flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <code style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: 5 }}>
              {vuln.package}@{vuln.version}
            </code>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}>
              {meta.label} {vuln.cvssScore > 0 && `· ${vuln.cvssScore.toFixed(1)}`}
            </span>
            <span style={{ fontSize: 10, color: ECOSYSTEM_COLOR[vuln.ecosystem] ?? '#718096', fontWeight: 600 }}>
              {vuln.ecosystem}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#718096', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vuln.summary}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {vuln.fixedIn && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontWeight: 600 }}>
              Fix → {vuln.fixedIn}
            </span>
          )}
          <span style={{ color: '#4a5568' }}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${meta.border}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 12, color: '#a0aec0', lineHeight: 1.6 }}>{vuln.summary}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cveId && (
              <a href={vuln.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#868cff', background: 'rgba(134,140,255,0.1)', border: '1px solid rgba(134,140,255,0.2)', padding: '3px 10px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
                <ExternalLink size={10} /> {cveId}
              </a>
            )}
            {ghsaId && (
              <a href={`https://github.com/advisories/${ghsaId}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#f97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', padding: '3px 10px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
                <ExternalLink size={10} /> {ghsaId}
              </a>
            )}
          </div>
          {vuln.fixedIn && (
            <p style={{ fontSize: 12, color: '#4ade80' }}>
              ✓ Corriger : <code style={{ background: 'rgba(74,222,128,0.1)', padding: '1px 6px', borderRadius: 4 }}>{vuln.package}@{vuln.fixedIn}</code>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function CVEPanel({ osv }) {
  const [filter, setFilter] = useState('ALL')

  if (!osv) return null

  const { vulns = [], scanned = [], depsChecked = 0, criticalCount = 0, highCount = 0 } = osv

  const FILTERS = [
    { key: 'ALL',      label: 'Tous',      count: vulns.length },
    { key: 'critical', label: 'Critiques', count: vulns.filter(v => v.severity === 'critical').length },
    { key: 'high',     label: 'Hautes',    count: vulns.filter(v => v.severity === 'high').length },
    { key: 'medium',   label: 'Moyennes',  count: vulns.filter(v => v.severity === 'medium').length },
  ]
  const filtered = filter === 'ALL' ? vulns : vulns.filter(v => v.severity === filter)

  return (
    <div className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(124,58,237,0.4)', flexShrink: 0 }}>
            <Package size={16} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
              Vulnérabilités CVE · OSV.dev
            </p>
            <p style={{ fontSize: 11, color: '#4a5568' }}>
              {depsChecked} dépendance{depsChecked !== 1 ? 's' : ''} analysée{depsChecked !== 1 ? 's' : ''}
              {scanned.length > 0 && ` · ${scanned.join(', ')}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[
            { val: criticalCount, label: 'Critiques', color: '#ef4444' },
            { val: highCount,     label: 'Hautes',    color: '#f97316' },
            { val: vulns.length,  label: 'Total',     color: '#868cff' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '5px 12px', borderRadius: 10, background: `${s.color}10`, border: `1px solid ${s.color}25` }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: s.val > 0 ? s.color : '#374151', lineHeight: 1 }}>{s.val}</p>
              <p style={{ fontSize: 9, color: '#4a5568', marginTop: 1 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filtres */}
      {vulns.length > 0 && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 6 }}>
          {FILTERS.filter(f => f.count > 0 || f.key === 'ALL').map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: filter === f.key ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === f.key ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: filter === f.key ? '#a78bfa' : '#718096',
            }}>
              {f.label} {f.count > 0 && <span style={{ opacity: 0.7 }}>({f.count})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      <div style={{ padding: 16 }}>
        {vulns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <ShieldCheck size={30} color="#4ade80" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 800, color: '#4ade80', marginBottom: 4 }}>
              {depsChecked > 0 ? 'Aucune vulnérabilité connue' : 'Aucun manifeste de dépendances détecté'}
            </p>
            <p style={{ fontSize: 12, color: '#4a5568' }}>
              {depsChecked > 0
                ? `${depsChecked} dépendances vérifiées via OSV.dev — aucun CVE trouvé.`
                : 'package.json / requirements.txt / go.mod non trouvés dans ce repo.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((v, i) => <VulnRow key={`${v.id}-${v.package}`} vuln={v} index={i} />)}
            {filtered.length === 0 && (
              <p style={{ fontSize: 12, color: '#4a5568', textAlign: 'center', padding: '16px 0' }}>Aucun résultat dans cette catégorie.</p>
            )}
          </div>
        )}
        <p style={{ fontSize: 10, color: '#2d3748', textAlign: 'center', marginTop: 12 }}>
          Données : <a href="https://osv.dev" target="_blank" rel="noopener noreferrer" style={{ color: '#374151' }}>osv.dev</a> · Google Open Source Security
        </p>
      </div>
    </div>
  )
}

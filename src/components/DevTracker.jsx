import { useState } from 'react'
import { Flame, Calendar, GitCommit, GitPullRequest, Activity, UserX, Key, CircleDot, CheckCircle2, Timer } from 'lucide-react'

const GRADS = [
  ['#868cff','#4318ff'],
  ['#4ade80','#01b574'],
  ['#f9a8d4','#e31a80'],
  ['#67e8f9','#0ea5e9'],
  ['#fbbf24','#f97316'],
  ['#d8b4fe','#7c3aed'],
  ['#86efac','#16a34a'],
  ['#fed7aa','#ea580c'],
]

const DAY_LABELS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
const TIME_SLOTS = [
  { key: 'nuit',      label: 'Nuit',       range: '00h–06h', color: '#4318ff' },
  { key: 'matin',     label: 'Matin',      range: '06h–12h', color: '#01b574' },
  { key: 'apresmidi', label: 'Après-midi', range: '12h–18h', color: '#f97316' },
  { key: 'soir',      label: 'Soir',       range: '18h–24h', color: '#e31a80' },
]

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
}

function StatusBadge({ daysSinceLast, commits, partialData }) {
  if (commits === 0) return (
    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#fca5a5' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'#ef4444', display:'inline-block' }} />
      Aucun commit
    </span>
  )
  if (partialData && daysSinceLast >= 999) return (
    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)', color:'#fbbf24' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'#fbbf24', display:'inline-block' }} />
      Commits anciens
    </span>
  )
  if (daysSinceLast === 0) return (
    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'rgba(1,181,116,0.15)', border:'1px solid rgba(1,181,116,0.35)', color:'#4ade80' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'#01b574', boxShadow:'0 0 6px #01b574', display:'inline-block' }} />
      Actif aujourd'hui
    </span>
  )
  if (daysSinceLast <= 3) return (
    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.3)', color:'#fbbf24' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'#fbbf24', display:'inline-block' }} />
      Actif (il y a {daysSinceLast}j)
    </span>
  )
  if (daysSinceLast <= 14) return (
    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'rgba(249,168,212,0.1)', border:'1px solid rgba(249,168,212,0.25)', color:'#f9a8d4' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'#e31a80', display:'inline-block' }} />
      En pause ({daysSinceLast}j)
    </span>
  )
  return (
    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'rgba(113,128,150,0.1)', border:'1px solid rgba(113,128,150,0.25)', color:'#718096' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'#718096', display:'inline-block' }} />
      Inactif ({daysSinceLast}j)
    </span>
  )
}

function Heatmap({ days }) {
  const max = Math.max(...days.map(d => d.count), 1)
  const weeks = []
  for (let w = 0; w < 16; w++) weeks.push(days.slice(w * 7, w * 7 + 7))

  function getColor(count) {
    if (count === 0) return 'rgba(255,255,255,0.04)'
    const pct = count / max
    if (pct < 0.25) return 'rgba(67,24,255,0.3)'
    if (pct < 0.5)  return 'rgba(67,24,255,0.55)'
    if (pct < 0.75) return 'rgba(134,140,255,0.75)'
    return '#868cff'
  }

  return (
    <div>
      <div style={{ display:'flex', gap:2, marginBottom:4 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ width:12, fontSize:8, color:'#718096', textAlign:'center', writingMode:'vertical-lr', transform:'rotate(180deg)', height:28, lineHeight:'12px' }}>{d}</div>
        ))}
      </div>
      <div style={{ display:'flex', gap:3 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {week.map((day, di) => (
              <div key={di}
                title={`${day.date} : ${day.count} commit${day.count > 1 ? 's' : ''}`}
                style={{ width:12, height:12, borderRadius:3, background: getColor(day.count), transition:'transform 0.1s' }}
                onMouseEnter={e => { if(day.count > 0) e.currentTarget.style.transform = 'scale(1.4)' }}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function TimeBar({ timeSlots, totalCommits }) {
  const max = Math.max(...Object.values(timeSlots), 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {TIME_SLOTS.map(slot => {
        const val = timeSlots[slot.key] || 0
        const pct = Math.round((val / Math.max(totalCommits, 1)) * 100)
        const barPct = Math.round((val / max) * 100)
        return (
          <div key={slot.key} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:10, color:slot.color, width:65, flexShrink:0 }}>
              {slot.label} <span style={{ color:'#718096' }}>{slot.range}</span>
            </span>
            <div style={{ flex:1, height:6, borderRadius:99, background:'rgba(255,255,255,0.05)' }}>
              <div style={{ height:6, borderRadius:99, background:`linear-gradient(90deg,${slot.color}99,${slot.color})`, width:`${barPct}%`, transition:'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize:10, color:'#a0aec0', width:32, textAlign:'right', flexShrink:0 }}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function DayOfWeekBar({ dayOfWeek }) {
  const reordered = [1,2,3,4,5,6,0].map(i => dayOfWeek[i] || 0)
  const max = Math.max(...reordered, 1)
  return (
    <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:36 }}>
      {reordered.map((val, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div style={{
            width:'100%', borderRadius:'3px 3px 0 0',
            height: Math.max(4, Math.round((val / max) * 30)),
            background: i < 5 ? 'linear-gradient(180deg,#868cff,#4318ff)' : 'linear-gradient(180deg,#f9a8d4,#e31a80)',
          }} />
          <span style={{ fontSize:8, color:'#718096' }}>{DAY_LABELS[i]}</span>
        </div>
      ))}
    </div>
  )
}

function Sparkline({ data, color }) {
  const max = Math.max(...data, 1)
  const W = 90, H = 28
  if (data.every(v => v === 0)) return <span style={{ fontSize:10, color:'#718096' }}>Aucune activité</span>
  const pts = data.map((v, i) => `${(i / (data.length-1)) * W},${H - (v / max) * H}`).join(' ')
  return (
    <svg width={W} height={H}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Carte compacte pour membres sans commits ─────────────── */
function InactiveCard({ dev, index }) {
  const [g1, g2] = GRADS[index % GRADS.length]
  return (
    <div className="glass-dark fade-up" style={{
      padding: '20px 22px',
      animationDelay: `${index * 30}ms`,
      display: 'flex', alignItems: 'center', gap: 16,
      border: '1px solid rgba(239,68,68,0.15)',
      background: 'rgba(239,68,68,0.03)',
      borderRadius: 18,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Stripe gauche */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:'linear-gradient(180deg,#ef4444,#7f1d1d)', borderRadius:'0 0 0 18px' }} />

      {/* Avatar */}
      <div style={{ position:'relative', flexShrink:0 }}>
        {dev.avatar
          ? <img src={dev.avatar} alt={dev.name} style={{ width:44, height:44, borderRadius:13, border:'2px solid rgba(239,68,68,0.3)', filter:'grayscale(0.4)', opacity:0.8 }} />
          : <div style={{ width:44, height:44, borderRadius:13, background:`linear-gradient(135deg,${g1}66,${g2}66)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, opacity:0.7 }}>{dev.name[0].toUpperCase()}</div>
        }
        {/* Icône inactive */}
        <div style={{ position:'absolute', bottom:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#ef4444', border:'2px solid #0b1437', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <UserX size={9} color="white" />
        </div>
      </div>

      {/* Infos */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:5 }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#94a3b8' }}>{dev.name}</span>
          <StatusBadge daysSinceLast={dev.daysSinceLast} commits={dev.commits} partialData={dev.partialData} />
        </div>
        <p style={{ fontSize:11, color:'#4a5568' }}>
          {dev.partialData
            ? 'Commits détectés mais hors de la fenêtre d\'analyse (300 derniers)'
            : 'Membre du dépôt · aucune contribution enregistrée'
          }
        </p>
      </div>

      {/* Stats vides */}
      <div style={{ display:'flex', gap:12, flexShrink:0 }}>
        {[
          { label:'Commits', val:'0' },
          { label:'PRs', val:'0' },
          { label:'Jours', val:'0' },
        ].map(k => (
          <div key={k.label} style={{ textAlign:'center', padding:'8px 12px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ fontSize:16, fontWeight:800, color:'#374151', lineHeight:1 }}>{k.val}</p>
            <p style={{ fontSize:9, color:'#374151', marginTop:3 }}>{k.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Card complète pour membres actifs ────────────────────── */
function DevCard({ dev, index, totalCommits }) {
  const [g1, g2] = GRADS[index % GRADS.length]
  const share = Math.round((dev.commits / totalCommits) * 100)

  return (
    <div className="glass fade-up" style={{ padding:24, animationDelay:`${index * 50}ms`, display:'flex', flexDirection:'column', gap:18 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          {dev.avatar
            ? <img src={dev.avatar} alt={dev.name} style={{ width:52, height:52, borderRadius:16, border:`2px solid ${g1}55`, boxShadow:`0 0 20px ${g1}33` }} />
            : <div style={{ width:52, height:52, borderRadius:16, background:`linear-gradient(135deg,${g1},${g2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{dev.name[0].toUpperCase()}</div>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:6 }}>
            <span style={{ fontSize:16, fontWeight:800, color:'#e2e8f0' }}>{dev.name}</span>
            <StatusBadge daysSinceLast={dev.daysSinceLast} commits={dev.commits} partialData={dev.partialData} />
          </div>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {dev.firstCommit
              ? <>
                  <span style={{ fontSize:11, color:'#718096' }}>Premier commit <strong style={{ color:'#a0aec0' }}>{fmt(dev.firstCommit)}</strong></span>
                  <span style={{ fontSize:11, color:'#718096' }}>Dernier <strong style={{ color: dev.daysSinceLast < 7 ? '#4ade80' : '#a0aec0' }}>{fmt(dev.lastCommit)}</strong></span>
                </>
              : <span style={{ fontSize:11, color:'#fbbf24', fontStyle:'italic' }}>⚠ Commits détectés hors de la fenêtre d'analyse</span>
            }
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))', gap:8 }}>
        {[
          { icon:<GitCommit size={12}/>,      label:'Commits',      val:dev.commits,             color:g1 },
          { icon:<Calendar size={12}/>,      label:'Jours actifs', val:dev.activeDays,          color:'#868cff' },
          { icon:<Flame size={12}/>,         label:'Série',        val:`${dev.streak}j`,        color:'#f97316' },
          { icon:<GitPullRequest size={12}/>, label:'Pull Reqs',   val:dev.prs,                 color:'#67e8f9' },
          { icon:<Activity size={12}/>,      label:'Intensité',    val:`${dev.intensity}%`,     color:'#01b574' },
          { icon:<CircleDot size={12}/>,     label:'Issues assignées', val:dev.issuesAssigned,  color:'#fbbf24' },
          { icon:<CheckCircle2 size={12}/>,  label:'Issues résolues',  val:dev.issuesResolved,  color:'#4ade80' },
        ].map(k => (
          <div key={k.label} style={{ textAlign:'center', padding:'10px 4px', borderRadius:12, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:4, color:k.color }}>{k.icon}</div>
            <p style={{ fontSize:15, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</p>
            <p style={{ fontSize:9, color:'#718096', marginTop:3 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* ── Temps de résolution issues ── */}
      {(dev.issuesAssigned > 0 || dev.issuesResolved > 0) && (
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {dev.issuesResolved > 0 && dev.issuesAssigned > 0 && (() => {
            const rate = Math.round((dev.issuesResolved / dev.issuesAssigned) * 100)
            const color = rate >= 80 ? '#4ade80' : rate >= 50 ? '#fbbf24' : '#f87171'
            return (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:10,
                background:`${color}10`, border:`1px solid ${color}30` }}>
                <CheckCircle2 size={12} color={color} />
                <span style={{ fontSize:11, fontWeight:700, color }}>
                  {rate}% résolues ({dev.issuesResolved}/{dev.issuesAssigned})
                </span>
              </div>
            )
          })()}
          {dev.avgResolutionHours !== null && (() => {
            const h = dev.avgResolutionHours
            const label = h < 1 ? '< 1h' : h < 24 ? `${h}h` : `${(h/24).toFixed(1)}j`
            const color = h <= 24 ? '#4ade80' : h <= 72 ? '#fbbf24' : '#f87171'
            return (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:10,
                background:`${color}10`, border:`1px solid ${color}30` }}>
                <Timer size={12} color={color} />
                <span style={{ fontSize:11, fontWeight:700, color }}>
                  Résolution moy. {label}
                </span>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Heatmap ── */}
      <div>
        <p style={{ fontSize:10, color:'#718096', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          Heatmap — 16 semaines d'activité
        </p>
        <div className="heatmap-scroll">
          <Heatmap days={dev.heatmapDays} />
        </div>
      </div>

      {/* ── Time analysis + Day of week ── */}
      <div className="time-analysis-grid">
        <div>
          <p style={{ fontSize:10, color:'#718096', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
            Horaires de travail
          </p>
          <TimeBar timeSlots={dev.timeSlots} totalCommits={dev.commits} />
          <p style={{ fontSize:10, color:'#a0aec0', marginTop:8 }}>
            Heure de pointe : <strong style={{ color:g1 }}>{dev.peakHour}</strong>
          </p>
        </div>
        <div>
          <p style={{ fontSize:10, color:'#718096', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
            Jours de la semaine
          </p>
          <DayOfWeekBar dayOfWeek={dev.dayOfWeek} />
          <p style={{ fontSize:10, color:'#a0aec0', marginTop:6 }}>
            Jour favori : <strong style={{ color:g1 }}>{dev.peakDay}</strong>
          </p>
        </div>
      </div>

      {/* ── Sparkline + footer stats ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.05)', flexWrap:'wrap', gap:10 }}>
        <div>
          <p style={{ fontSize:9, color:'#718096', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Activité 12 semaines</p>
          <Sparkline data={dev.weeklyCommits} color={g1} />
        </div>
        <div style={{ display:'flex', gap:20 }}>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:16, fontWeight:800, color:g1 }}>{dev.commitsPerActiveDay}</p>
            <p style={{ fontSize:9, color:'#718096' }}>commits/jour</p>
          </div>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:16, fontWeight:800, color:'#868cff' }}>{share}%</p>
            <p style={{ fontSize:9, color:'#718096' }}>du total</p>
          </div>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:16, fontWeight:800, color:'#01b574' }}>{dev.spanDays}j</p>
            <p style={{ fontSize:9, color:'#718096' }}>de période</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 4

function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const start = page * pageSize + 1
  const end   = Math.min((page + 1) * pageSize, total)
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:16 }}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        style={{
          padding:'6px 16px', borderRadius:10, fontSize:12, fontWeight:700, cursor: page === 0 ? 'default' : 'pointer',
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
          color: page === 0 ? '#374151' : '#a0aec0', transition:'all 0.15s',
        }}
      >← Préc.</button>

      <span style={{ fontSize:12, color:'#718096' }}>
        <strong style={{ color:'#e2e8f0' }}>{start}–{end}</strong> sur <strong style={{ color:'#e2e8f0' }}>{total}</strong>
      </span>

      <span style={{ display:'flex', gap:5 }}>
        {Array.from({ length: totalPages }, (_, i) => (
          <button key={i} onClick={() => onChange(i)} style={{
            width:28, height:28, borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
            background: i === page ? 'rgba(134,140,255,0.2)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${i === page ? 'rgba(134,140,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
            color: i === page ? '#868cff' : '#4a5568',
          }}>{i + 1}</button>
        ))}
      </span>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        style={{
          padding:'6px 16px', borderRadius:10, fontSize:12, fontWeight:700, cursor: page >= totalPages - 1 ? 'default' : 'pointer',
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
          color: page >= totalPages - 1 ? '#374151' : '#a0aec0', transition:'all 0.15s',
        }}
      >Suiv. →</button>
    </div>
  )
}

/* ─── Composant principal ──────────────────────────────────── */
export default function DevTracker({ authorCommits, collaboratorsError, token }) {
  const [filter, setFilter]       = useState('all')
  const [pageActive, setPageActive]     = useState(0)
  const [pageInactive, setPageInactive] = useState(0)
  const totalCommits = authorCommits.reduce((s, d) => s + d.commits, 0)

  function handleFilterChange(f) {
    setFilter(f)
    setPageActive(0)
    setPageInactive(0)
  }

  const withCommits    = authorCommits.filter(d => d.commits > 0)
  const withoutCommits = authorCommits.filter(d => d.commits === 0)

  const activeCount   = withCommits.filter(d => d.daysSinceLast <= 7).length
  const pauseCount    = withCommits.filter(d => d.daysSinceLast > 7 && d.daysSinceLast <= 14).length
  const inactiveCount = withCommits.filter(d => d.daysSinceLast > 14).length
  const zeroCount     = withoutCommits.length

  const filteredActive = authorCommits.filter(d => {
    if (filter === 'active')   return d.commits > 0 && d.daysSinceLast <= 7
    if (filter === 'inactive') return d.commits === 0 || d.daysSinceLast > 14
    return true
  })

  return (
    <div className="fade-up">

      {/* Notice — token manquant pour voir les membres sans commits */}
      {collaboratorsError && !token && (
        <div style={{
          display:'flex', alignItems:'flex-start', gap:14, padding:'14px 18px', borderRadius:14, marginBottom:20,
          background:'rgba(134,140,255,0.06)', border:'1px solid rgba(134,140,255,0.2)',
        }}>
          <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(134,140,255,0.15)' }}>
            <Key size={16} color="#868cff" />
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#868cff', marginBottom:4 }}>
              Membres sans commits non visibles
            </p>
            <p style={{ fontSize:12, color:'#a0aec0', lineHeight:1.6 }}>
              L'API GitHub nécessite un token authentifié pour lister les collaborateurs. Les membres qui n'ont jamais commité n'apparaissent pas.
            </p>
            <p style={{ fontSize:12, color:'#718096', marginTop:6 }}>
              👉 Ajoute un token GitHub avec le scope <strong style={{ color:'#868cff' }}>repo</strong> pour voir toute l'équipe.
            </p>
          </div>
        </div>
      )}

      {/* Notice — token présent mais scope insuffisant */}
      {collaboratorsError && token && (
        <div style={{
          display:'flex', alignItems:'flex-start', gap:14, padding:'14px 18px', borderRadius:14, marginBottom:20,
          background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)',
        }}>
          <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(251,191,36,0.12)', fontSize:16 }}>⚠️</div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#fbbf24', marginBottom:4 }}>Scope insuffisant</p>
            <p style={{ fontSize:12, color:'#a0aec0', lineHeight:1.6 }}>
              Ton token n'a pas les droits pour lister les collaborateurs. Les membres sans commits peuvent manquer.
            </p>
            <p style={{ fontSize:12, color:'#718096', marginTop:6 }}>
              👉 Régénère ton token avec le scope <strong style={{ color:'#fbbf24' }}>repo</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Header + filtres */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.02em' }}>
            Analyse des développeurs
          </h2>
          <p style={{ fontSize:12, color:'#718096', marginTop:4 }}>
            {withCommits.length} actifs · {zeroCount} sans contribution
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { key:'all',      label:`Tous (${authorCommits.length})`,    color:'#868cff', bg:'rgba(134,140,255,0.12)', border:'rgba(134,140,255,0.25)' },
            { key:'active',   label:`Actifs (${activeCount})`,           color:'#4ade80', bg:'rgba(74,222,128,0.1)',   border:'rgba(74,222,128,0.25)' },
            { key:'inactive', label:`Inactifs (${inactiveCount + zeroCount})`, color:'#ef4444', bg:'rgba(239,68,68,0.08)', border:'rgba(239,68,68,0.2)' },
          ].map(f => (
            <button key={f.key} onClick={() => handleFilterChange(f.key)} style={{
              fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:10, cursor:'pointer',
              background: filter === f.key ? f.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === f.key ? f.border : 'rgba(255,255,255,0.07)'}`,
              color: filter === f.key ? f.color : '#718096',
              transition:'all 0.2s',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Barre de statut */}
      <div className="glass" style={{ padding:'14px 20px', marginBottom:24, display:'flex', gap:24, flexWrap:'wrap', alignItems:'center' }}>
        {[
          { dot:'#01b574', label:'Actifs (≤7j)',          val:activeCount },
          { dot:'#fbbf24', label:'En pause (8–14j)',       val:pauseCount },
          { dot:'#718096', label:'Inactifs (>14j)',        val:inactiveCount },
          { dot:'#ef4444', label:'Aucun commit',           val:zeroCount },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:s.dot, boxShadow:`0 0 6px ${s.dot}` }} />
            <span style={{ fontSize:12, color:'#a0aec0' }}>{s.label}</span>
            <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{s.val}</span>
          </div>
        ))}
        <div style={{ marginLeft:'auto', height:6, borderRadius:99, overflow:'hidden', flex:1, minWidth:120, background:'rgba(255,255,255,0.05)', display:'flex' }}>
          <div style={{ height:6, background:'#01b574', width:`${(activeCount/authorCommits.length)*100}%` }} />
          <div style={{ height:6, background:'#fbbf24', width:`${(pauseCount/authorCommits.length)*100}%` }} />
          <div style={{ height:6, background:'#718096', width:`${(inactiveCount/authorCommits.length)*100}%` }} />
          <div style={{ height:6, background:'#ef4444', width:`${(zeroCount/authorCommits.length)*100}%` }} />
        </div>
      </div>

      {/* Cards membres actifs — paginés */}
      {(filter === 'all' || filter === 'active') && (() => {
        const activeList = filteredActive.filter(d => d.commits > 0)
        if (activeList.length === 0) return null
        const paged = activeList.slice(pageActive * PAGE_SIZE, (pageActive + 1) * PAGE_SIZE)
        return (
          <div style={{ marginBottom: 28 }}>
            {filter === 'all' && (
              <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'rgba(74,222,128,0.7)', marginBottom:14 }}>
                Contributeurs ({activeList.length})
              </p>
            )}
            <div className="dev-cards-grid">
              {paged.map(dev => (
                <DevCard key={dev.name} dev={dev} index={authorCommits.indexOf(dev)} totalCommits={totalCommits} />
              ))}
            </div>
            <Pagination page={pageActive} total={activeList.length} pageSize={PAGE_SIZE} onChange={setPageActive} />
          </div>
        )
      })()}

      {/* Cards membres sans commits — paginés */}
      {(filter === 'all' || filter === 'inactive') && (() => {
        const inactiveList = filter === 'all'
          ? withoutCommits
          : authorCommits.filter(d => d.commits === 0 || d.daysSinceLast > 14)
        if (inactiveList.length === 0) return null
        const paged = inactiveList.slice(pageInactive * PAGE_SIZE, (pageInactive + 1) * PAGE_SIZE)
        return (
          <div>
            <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'rgba(239,68,68,0.7)', marginBottom:14 }}>
              Sans contribution ({inactiveList.length})
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {paged.map((dev, i) => (
                <InactiveCard key={dev.name} dev={dev} index={pageInactive * PAGE_SIZE + i} />
              ))}
            </div>
            <Pagination page={pageInactive} total={inactiveList.length} pageSize={PAGE_SIZE} onChange={setPageInactive} />
          </div>
        )
      })()}

      {filteredActive.length === 0 && withoutCommits.length === 0 && (
        <div className="glass" style={{ padding:40, textAlign:'center' }}>
          <p style={{ color:'#718096' }}>Aucun développeur dans cette catégorie.</p>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/* ─── Tooltip personnalisé ─────────────────────────────────── */
function CustomTooltip({ active, payload, label, sublabel }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(11,20,55,0.97)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '10px 14px', minWidth: 140,
    }}>
      <p style={{ color: '#718096', fontSize: 11, marginBottom: 4 }}>{sublabel || label}</p>
      <p style={{ color: '#868cff', fontWeight: 800, fontSize: 17, lineHeight: 1 }}>
        {payload[0].value}
        <span style={{ fontSize: 11, fontWeight: 400, color: '#4a5568', marginLeft: 4 }}>commits</span>
      </p>
    </div>
  )
}

/* ─── Stat pill ────────────────────────────────────────────── */
function StatPill({ label, value, sub, color = '#868cff' }) {
  return (
    <div style={{
      padding: '10px 16px', borderRadius: 12,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      textAlign: 'center', minWidth: 80,
    }}>
      <p style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 10, color: '#4a5568', marginTop: 4, fontWeight: 600 }}>{label}</p>
      {sub && <p style={{ fontSize: 9, color: '#374151', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

/* ─── Tendance ─────────────────────────────────────────────── */
function Trend({ data }) {
  if (data.length < 4) return null
  const half = Math.floor(data.length / 2)
  const first = data.slice(0, half).reduce((s, d) => s + d.commits, 0)
  const second = data.slice(half).reduce((s, d) => s + d.commits, 0)
  const diff = second - first
  const pct = first > 0 ? Math.round(Math.abs(diff / first) * 100) : 0

  if (pct < 5) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4a5568' }}>
      <Minus size={12} /> Stable
    </div>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: diff > 0 ? '#4ade80' : '#f87171' }}>
      {diff > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {diff > 0 ? '+' : '-'}{pct}% vs période précédente
    </div>
  )
}

/* ─── Vue Jours (60 derniers jours) ────────────────────────── */
function DailyView({ data }) {
  const total = data.reduce((s, d) => s + d.commits, 0)
  const avg = (total / data.length).toFixed(1)
  const max = Math.max(...data.map(d => d.commits))
  const maxDay = data.find(d => d.commits === max)
  const activeDays = data.filter(d => d.commits > 0).length

  // Tick tous les 7 jours pour pas surcharger
  const ticks = data.filter((_, i) => i % 7 === 0 || i === data.length - 1).map(d => d.date)

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatPill label="Total" value={total} sub="60 derniers jours" color="#868cff" />
        <StatPill label="Moy/jour" value={avg} sub="commits par jour" color="#67e8f9" />
        <StatPill label="Jours actifs" value={activeDays} sub={`sur 60 jours`} color="#4ade80" />
        <StatPill label="Record" value={max} sub={maxDay?.shortLabel} color="#fbbf24" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Trend data={data} />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={6} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#868cff" />
              <stop offset="100%" stopColor="#4318ff" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={v => data.find(d => d.date === v)?.shortLabel || v}
            tick={{ fill: '#4a5568', fontSize: 10 }}
            axisLine={false} tickLine={false}
          />
          <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length
                ? <CustomTooltip active={active} payload={payload} sublabel={`${payload[0]?.payload?.dayName} ${payload[0]?.payload?.shortLabel}`} />
                : null
            }
            cursor={{ fill: 'rgba(134,140,255,0.06)' }}
          />
          <ReferenceLine
            y={parseFloat(avg)}
            stroke="rgba(134,140,255,0.3)"
            strokeDasharray="4 4"
            label={{ value: `moy. ${avg}`, position: 'right', fontSize: 9, fill: '#4a5568' }}
          />
          <Bar dataKey="commits" fill="url(#dayGrad)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <p style={{ fontSize: 10, color: '#374151', marginTop: 8, textAlign: 'center' }}>
        60 derniers jours · chaque barre = 1 jour
      </p>
    </div>
  )
}

/* ─── Vue Semaines (16 semaines) ───────────────────────────── */
function WeeklyView({ data, dayOfWeekData }) {
  const [sub, setSub] = useState('area') // area | dow
  const total = data.reduce((s, d) => s + d.commits, 0)
  const avg = Math.round(total / data.length)
  const max = Math.max(...data.map(d => d.commits))
  const maxWeek = data.find(d => d.commits === max)
  const activeWeeks = data.filter(d => d.commits > 0).length

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <StatPill label="Total" value={total} sub="16 semaines" color="#868cff" />
        <StatPill label="Moy/semaine" value={avg} sub="commits" color="#67e8f9" />
        <StatPill label="Semaines actives" value={activeWeeks} sub="sur 16" color="#4ade80" />
        <StatPill label="Meilleure sem." value={max} sub={maxWeek?.label} color="#fbbf24" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <Trend data={data} />
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
            {[['area','Tendance'],['dow','Par jour']].map(([v, l]) => (
              <button key={v} onClick={() => setSub(v)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: sub === v ? 'rgba(66,42,251,0.6)' : 'transparent',
                color: sub === v ? '#fff' : '#4a5568', transition: 'all 0.2s',
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        {sub === 'area' ? (
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4318ff" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#4318ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length
                  ? <CustomTooltip active={active} payload={payload}
                      sublabel={`Sem. du ${payload[0]?.payload?.weekStart}`} />
                  : null
              }
              cursor={{ stroke: 'rgba(134,140,255,0.2)', strokeWidth: 1 }}
            />
            <ReferenceLine y={avg} stroke="rgba(134,140,255,0.3)" strokeDasharray="4 4"
              label={{ value: `moy. ${avg}`, position: 'right', fontSize: 9, fill: '#4a5568' }} />
            <Area type="monotone" dataKey="commits" stroke="#868cff" strokeWidth={2.5}
              fill="url(#wGrad)" dot={false}
              activeDot={{ r: 5, fill: '#868cff', stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        ) : (
          <BarChart data={dayOfWeekData} barSize={28} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="dowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#01b574" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload }) => active && payload?.length ? <CustomTooltip active={active} payload={payload} sublabel={payload[0]?.payload?.day} /> : null}
              cursor={{ fill: 'rgba(134,140,255,0.05)' }} />
            <Bar dataKey="commits" fill="url(#dowGrad)" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>

      <p style={{ fontSize: 10, color: '#374151', marginTop: 8, textAlign: 'center' }}>
        {sub === 'area' ? '16 dernières semaines · chaque point = 1 semaine' : 'Répartition des commits par jour de la semaine'}
      </p>
    </div>
  )
}

/* ─── Tick personnalisé : mois abrégé, l'année seulement au 1er mois de chaque année ── */
function MonthTick({ x, y, payload, data }) {
  const item = data.find(d => d.label === payload.value)
  if (!item) return null
  const idx = data.indexOf(item)
  const showYear = idx === 0 || data[idx].year !== data[idx - 1]?.year
  const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const monthLabel = MONTH_SHORT[item.month]

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Mois */}
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#4a5568" fontSize={10}>{monthLabel}</text>
      {/* Année — affiché seulement au changement d'année */}
      {showYear && (
        <>
          <line x1={-16} x2={16} y1={26} y2={26} stroke="rgba(134,140,255,0.25)" strokeWidth={1} strokeDasharray="3 2" />
          <text x={0} y={0} dy={38} textAnchor="middle" fill="#868cff" fontSize={9} fontWeight="700">
            {item.year}
          </text>
        </>
      )}
    </g>
  )
}

/* ─── Vue Mois (12 mois) ───────────────────────────────────── */
function MonthlyView({ data }) {
  const total = data.reduce((s, d) => s + d.commits, 0)
  const avg = Math.round(total / data.length)
  const max = Math.max(...data.map(d => d.commits))
  const maxMonth = data.find(d => d.commits === max)
  const activeMonths = data.filter(d => d.commits > 0).length

  // Groupes par année pour les bandes de fond
  const years = [...new Set(data.map(d => d.year))]
  const yearColors = ['rgba(134,140,255,0.04)', 'rgba(1,181,116,0.04)']

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <StatPill label="Total" value={total} sub="12 derniers mois" color="#868cff" />
        <StatPill label="Moy/mois" value={avg} sub="commits" color="#67e8f9" />
        <StatPill label="Mois actifs" value={activeMonths} sub="sur 12" color="#4ade80" />
        <StatPill label="Meilleur mois" value={max} sub={maxMonth?.label} color="#fbbf24" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Trend data={data} />
        </div>
      </div>

      {/* Légende années */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {years.map((yr, i) => (
          <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: yearColors[i % yearColors.length], border: `1px solid ${i === 0 ? 'rgba(134,140,255,0.3)' : 'rgba(1,181,116,0.3)'}` }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? '#868cff' : '#4ade80' }}>{yr}</span>
            <span style={{ fontSize: 10, color: '#4a5568' }}>
              — {data.filter(d => d.year === yr).reduce((s, d) => s + d.commits, 0)} commits
            </span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={28} margin={{ top: 4, right: 8, left: -24, bottom: 20 }}>
          <defs>
            {years.map((yr, i) => (
              <linearGradient key={yr} id={`mGrad${yr}`} x1="0" y1="1" x2="0" y2="0">
                {i === 0
                  ? <><stop offset="0%" stopColor="#4318ff" stopOpacity={0.8} /><stop offset="100%" stopColor="#868cff" /></>
                  : <><stop offset="0%" stopColor="#01b574" stopOpacity={0.8} /><stop offset="100%" stopColor="#4ade80" /></>
                }
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            height={44}
            tick={<MonthTick data={data} />}
          />
          <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length
                ? <CustomTooltip active={active} payload={payload} sublabel={payload[0]?.payload?.fullLabel} />
                : null
            }
            cursor={{ fill: 'rgba(134,140,255,0.05)' }}
          />
          <ReferenceLine y={avg} stroke="rgba(134,140,255,0.3)" strokeDasharray="4 4"
            label={{ value: `moy. ${avg}`, position: 'right', fontSize: 9, fill: '#4a5568' }} />
          <Bar dataKey="commits" radius={[6, 6, 0, 0]}
            fill="url(#mGrad)"
            shape={(props) => {
              const item = data.find(d => d.label === props.label)
              const yi = years.indexOf(item?.year)
              return <rect {...props} fill={`url(#mGrad${years[yi]})`} rx={6} ry={6} />
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── Composant principal ──────────────────────────────────── */
const TABS = [
  { key: 'daily',   label: 'Jours',    sub: '60j' },
  { key: 'weekly',  label: 'Semaines', sub: '16s' },
  { key: 'monthly', label: 'Mois',     sub: '12m' },
]

export default function ActivityChart({ dailyData, weeklyData, monthlyData, dayOfWeekData }) {
  const [tab, setTab] = useState('weekly')

  const totalCommits = useMemo(() => {
    if (tab === 'daily')   return dailyData.reduce((s, d) => s + d.commits, 0)
    if (tab === 'weekly')  return weeklyData.reduce((s, d) => s + d.commits, 0)
    if (tab === 'monthly') return monthlyData.reduce((s, d) => s + d.commits, 0)
    return 0
  }, [tab, dailyData, weeklyData, monthlyData])

  const periodLabel = { daily: '60 derniers jours', weekly: '16 dernières semaines', monthly: '12 derniers mois' }

  return (
    <div className="glass fade-up" style={{ animationDelay: '100ms', padding: '24px 24px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
            Activité des commits
          </h3>
          <p style={{ color: '#4a5568', fontSize: 12, marginTop: 3 }}>
            {periodLabel[tab]} · <span style={{ color: '#718096', fontWeight: 600 }}>{totalCommits} commits</span>
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 3,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: 4,
        }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: tab === t.key ? 'rgba(66,42,251,0.65)' : 'transparent',
              color: tab === t.key ? '#fff' : '#4a5568',
              transition: 'all 0.2s',
              boxShadow: tab === t.key ? '0 2px 8px rgba(66,42,251,0.35)' : 'none',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {t.label}
              <span style={{ fontSize: 9, opacity: 0.7, background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4 }}>
                {t.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Vue active */}
      {tab === 'daily'   && <DailyView   data={dailyData} />}
      {tab === 'weekly'  && <WeeklyView  data={weeklyData} dayOfWeekData={dayOfWeekData} />}
      {tab === 'monthly' && <MonthlyView data={monthlyData} />}
    </div>
  )
}

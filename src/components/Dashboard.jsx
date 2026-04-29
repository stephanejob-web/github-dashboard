import {
  GitCommit, Users, GitBranch, GitPullRequest,
  Flame, Calendar, Zap, TrendingUp,
  ArrowLeft, ExternalLink, Star, GitFork, Eye, RefreshCw, Key,
} from 'lucide-react'
import StatCard from './StatCard'
import ContributorsTable from './ContributorsTable'
import ActivityChart from './ActivityChart'
import LanguagesChart from './LanguagesChart'
import PRStats from './PRStats'
import RecentCommits from './RecentCommits'
import RateLimitBadge from './RateLimitBadge'
import DevTracker from './DevTracker'
import Podium from './Podium'
import CommitConventions from './CommitConventions'
import WorkflowPanel from './WorkflowPanel'
import SprintPanel from './SprintPanel'
import PRHealthPanel from './PRHealthPanel'
import RiskPanel from './RiskPanel'
import CIPanel from './CIPanel'
import QualityPanel from './QualityPanel'
import SMOverview from './SMOverview'
import { clearCache } from '../api/github'

function BgGlow() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-15%', left: '5%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(66,42,251,0.15) 0%,transparent 70%)', filter: 'blur(50px)' }} />
      <div style={{ position: 'absolute', top: '35%', right: '-8%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle,rgba(1,181,116,0.09) 0%,transparent 70%)', filter: 'blur(50px)' }} />
      <div style={{ position: 'absolute', bottom: '5%', left: '28%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(117,81,255,0.1) 0%,transparent 70%)', filter: 'blur(50px)' }} />
    </div>
  )
}

function MetaBadge({ icon, val, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
      padding: '6px 14px', borderRadius: 12,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      color: '#718096',
    }}>
      {icon}
      <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{val}</span>
      <span>{label}</span>
    </div>
  )
}

function TopBar({ info, owner, repo, onBack, token, onRefresh }) {
  return (
    <nav className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Logo GitPulse */}
        <span style={{
          fontSize: 15, fontWeight: 900, letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg,#868cff,#4ade80)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>GitPulse</span>

        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 16px',
          borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', color: '#a0aec0', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(66,42,251,0.2)'; e.currentTarget.style.borderColor = 'rgba(134,140,255,0.4)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#a0aec0' }}
        >
          <ArrowLeft size={14} /> Changer
        </button>

        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {info.owner?.avatar_url && (
            <img src={info.owner.avatar_url} alt={owner} style={{
              width: 30, height: 30, borderRadius: '50%',
              border: '2px solid rgba(134,140,255,0.4)',
              boxShadow: '0 0 10px rgba(66,42,251,0.3)',
            }} />
          )}
          <span style={{ color: '#718096', fontSize: 14 }}>{owner}</span>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 18, fontWeight: 300 }}>/</span>
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>{repo}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <RateLimitBadge token={token} />

        <div className="md:flex" style={{ display: 'none', alignItems: 'center', gap: 8 }}>
          <MetaBadge icon={<Star size={12} />} val={info.stargazers_count?.toLocaleString()} label="Stars" />
          <MetaBadge icon={<GitFork size={12} />} val={info.forks_count?.toLocaleString()} label="Forks" />
          <MetaBadge icon={<Eye size={12} />} val={info.watchers_count?.toLocaleString()} label="Watch" />
        </div>

        {token && (
          <div className="hide-mobile" style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '5px 10px',
            borderRadius: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
            color: '#4ade80',
          }}>
            <Key size={11} /> Token actif
          </div>
        )}

        <button onClick={() => { clearCache(); onRefresh() }} style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 14px',
          borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)', color: '#718096', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#e2e8f0' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#718096' }}
          title="Vider le cache et recharger"
        >
          <RefreshCw size={12} /> Actualiser
        </button>

        <a href={info.html_url} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 18px',
          borderRadius: 10, background: 'linear-gradient(135deg,#4318ff,#01b574)',
          color: '#fff', fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 0 20px rgba(66,42,251,0.4)',
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <ExternalLink size={13} /> GitHub
        </a>
      </div>
    </nav>
  )
}

function SectionHeader({ label, title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <p className="section-label">{label}</p>}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>{title}</h2>
        {sub && <span style={{ fontSize: 12, color: '#4a5568' }}>{sub}</span>}
      </div>
    </div>
  )
}

export default function Dashboard({ data, owner, repo, onBack, token, onRefresh }) {
  const {
    info, contributors, commits, dailyActivity, weeklyActivity, monthlyActivity, commitsByDay, authorCommits,
    warnings = [],
    prByMonth, prs, issues, languages, branches, branchAnalysis, prAnalysis, streak, mostActiveDay,
    daysSinceLastCommit, avgCommitsPerWeek, commitLint, commitLintByAuthor,
    milestones = [], prHealth, topReviewers = [], busFactor, busFactorList = [], labelDist = [], issuesAssignment, ci,
    quality, devTestActivity = [],
  } = data

  const topContributor = contributors[0]

  const cards = [
    {
      icon: <GitCommit size={20} />,
      label: 'Commits',
      value: commits.length >= 300 ? '300+' : commits.length,
      sub: `~${avgCommitsPerWeek} / semaine`,
      gradient: 'linear-gradient(135deg,#868cff,#4318ff)',
      glowClass: 'glow-blue',
      delay: 0,
    },
    {
      icon: <Users size={20} />,
      label: 'Contributeurs',
      value: contributors.length,
      sub: topContributor ? `Top : ${topContributor.login}` : '',
      gradient: 'linear-gradient(135deg,#4ade80,#01b574)',
      glowClass: 'glow-green',
      delay: 50,
    },
    {
      icon: <GitPullRequest size={20} />,
      label: 'Pull Requests',
      value: prs.total,
      sub: `${prs.mergeRate}% mergées`,
      gradient: 'linear-gradient(135deg,#f9a8d4,#e31a80)',
      glowClass: 'glow-pink',
      delay: 100,
    },
    {
      icon: <GitBranch size={20} />,
      label: 'Branches',
      value: branches,
      sub: 'actives',
      gradient: 'linear-gradient(135deg,#67e8f9,#0ea5e9)',
      glowClass: 'glow-cyan',
      delay: 150,
    },
    {
      icon: <Flame size={20} />,
      label: 'Série active',
      value: `${streak}j`,
      sub: 'jours consécutifs',
      gradient: 'linear-gradient(135deg,#fbbf24,#f97316)',
      delay: 200,
    },
    {
      icon: <Calendar size={20} />,
      label: 'Dernier commit',
      value: daysSinceLastCommit === 0 ? 'Auj.' : `${daysSinceLastCommit}j`,
      sub: daysSinceLastCommit === 0 ? "Actif aujourd'hui !" : 'depuis le dernier commit',
      gradient: 'linear-gradient(135deg,#86efac,#16a34a)',
      delay: 250,
    },
    {
      icon: <Zap size={20} />,
      label: 'Jour le + actif',
      value: mostActiveDay.day,
      sub: `${mostActiveDay.count} commits`,
      gradient: 'linear-gradient(135deg,#d8b4fe,#7c3aed)',
      delay: 300,
    },
    {
      icon: <TrendingUp size={20} />,
      label: 'Issues résolues',
      value: `${issues.resolutionRate}%`,
      sub: `${issues.closed} / ${issues.open + issues.closed} totales`,
      gradient: 'linear-gradient(135deg,#fed7aa,#ea580c)',
      delay: 350,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', position: 'relative' }}>
      <BgGlow />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <TopBar info={info} owner={owner} repo={repo} onBack={onBack} token={token} onRefresh={onRefresh} />

        <div className="dash-container">

          {/* Repo description */}
          {info.description && (
            <div className="fade-up" style={{ marginBottom: warnings.length ? 16 : 36 }}>
              <p style={{
                color: '#4a5568', fontSize: 14, lineHeight: 1.6,
                padding: '12px 18px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 12,
                display: 'inline-block',
              }}>{info.description}</p>
            </div>
          )}

          {/* Warnings endpoints partiels */}
          {warnings.length > 0 && (
            <div className="fade-up" style={{
              marginBottom: 28, padding: '12px 16px', borderRadius: 14,
              background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>
                  Données partielles — certains endpoints GitHub ont échoué (repo très large ou token requis)
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {warnings.map((w, i) => (
                    <li key={i} style={{ fontSize: 11, color: '#92400e' }}>· {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ══ VUE SCRUM MASTER ══ */}
          <div style={{ marginBottom: 32 }}>
            <SectionHeader label="Scrum Master · Vue principale" title="Métriques clés du projet" />
            <SMOverview
              authorCommits={authorCommits}
              commitLintByAuthor={commitLintByAuthor}
              topReviewers={topReviewers}
              devTestActivity={devTestActivity}
              prHealth={prHealth}
              busFactor={busFactor ?? 0}
              ci={ci}
              quality={quality}
              commitLint={commitLint}
              issuesAssignment={issuesAssignment ?? { assigned: 0, unassigned: 0 }}
              milestones={milestones}
            />
          </div>

          {/* ── Stat cards ── */}
          <div style={{ marginBottom: 32 }}>
            <SectionHeader label="Vue d'ensemble" title="Statistiques clés" />
            <div className="stats-grid">
              {cards.map((c, i) => <StatCard key={i} {...c} />)}
            </div>
          </div>

          {/* ── Activité + PR ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Activité" title="Commits & Pull Requests" />
            <div className="activity-grid">
              <ActivityChart dailyData={dailyActivity} weeklyData={weeklyActivity} monthlyData={monthlyActivity} dayOfWeekData={commitsByDay} />
              <PRStats prs={prs} issues={issues} prByMonth={prByMonth} />
            </div>
          </div>

          {/* ── Podium + Langages ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Équipe" title="Contributeurs & Langages" />
            <div className="contributors-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Podium contributors={contributors} />
                <ContributorsTable contributors={contributors} authorCommits={authorCommits} />
              </div>
              <LanguagesChart data={languages} />
            </div>
          </div>

          {/* ── Commits récents ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Historique" title="Derniers commits" />
            <RecentCommits commits={commits} />
          </div>

          {/* ── Conventions de commits ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Qualité · Scrum Master" title="Conventions de commits" sub={`${commitLint.score}% de conformité`} />
            <CommitConventions commitLint={commitLint} commitLintByAuthor={commitLintByAuthor} />
          </div>

          {/* ── Workflow & Process ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Qualité · Scrum Master" title="Workflow & Process" />
            <WorkflowPanel branchAnalysis={branchAnalysis} prAnalysis={prAnalysis} />
          </div>

          {/* ── Milestones / Sprints ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Scrum · Planning" title="Sprints & Milestones" />
            <SprintPanel milestones={milestones} />
          </div>

          {/* ── PR Health + Risk ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Qualité · Scrum Master" title="Santé des PRs & Risques" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20 }}>
              {prHealth && <PRHealthPanel prHealth={prHealth} topReviewers={topReviewers} />}
              <RiskPanel busFactor={busFactor ?? 0} busFactorList={busFactorList} labelDist={labelDist} issuesAssignment={issuesAssignment ?? { assigned: 0, unassigned: 0 }} />
            </div>
          </div>

          {/* ── Qualité & bonnes pratiques ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Qualité · Scrum Master" title="Normes & Bonnes pratiques" sub={quality ? `Score : ${quality.score}/100` : ''} />
            <QualityPanel quality={quality} devTestActivity={devTestActivity} />
          </div>

          {/* ── CI / GitHub Actions ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Automatisation" title="CI / CD · GitHub Actions" />
            <div style={{ maxWidth: 680 }}>
              <CIPanel ci={ci} />
            </div>
          </div>

          {/* ── Dev tracker ── */}
          <div>
            <SectionHeader label="Analyse individuelle" title="Suivi des développeurs" />
            <DevTracker authorCommits={authorCommits} collaboratorsError={warnings.length ? warnings.join(' | ') : null} token={token} />
          </div>

          <p style={{
            textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.1)',
            marginTop: 48, paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            GitPulse · {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}

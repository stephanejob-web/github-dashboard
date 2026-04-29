import { useState, useCallback, useRef } from 'react'
import { analyzeCommits, analyzeByAuthor } from '../utils/commitLint'
import { analyzeBranches, analyzePRs } from '../utils/workflowAnalysis'
import {
  fetchRepoInfo,
  fetchContributors,
  fetchCollaborators,
  fetchCommits,
  fetchPullRequests,
  fetchIssues,
  fetchLanguages,
  fetchBranches,
} from '../api/github'

function computeStreak(commits) {
  if (!commits.length) return 0
  const days = new Set(commits.map(c => c.commit.author.date.slice(0, 10)))
  const sorted = [...days].sort().reverse()
  let streak = 0
  let current = new Date()
  for (const day of sorted) {
    const d = new Date(day)
    const diff = Math.round((current - d) / 86400000)
    if (diff <= 1) { streak++; current = d }
    else break
  }
  return streak
}

function computeMostActiveDay(commits) {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const counts = [0, 0, 0, 0, 0, 0, 0]
  commits.forEach(c => {
    const d = new Date(c.commit.author.date).getDay()
    counts[d]++
  })
  const max = Math.max(...counts)
  return { day: days[counts.indexOf(max)], count: max }
}

function computeDailyActivity(commits) {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  return Array.from({ length: 60 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (59 - i))
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    const shortLabel = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    const count = commits.filter(c => c.commit.author.date.slice(0, 10) === key).length
    const dayName = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()]
    return { date: key, label, shortLabel, dayName, commits: count }
  })
}

function computeWeeklyActivity(commits) {
  const now = new Date()
  // Aligner sur le lundi de la semaine courante
  const startOfToday = new Date(now); startOfToday.setHours(0,0,0,0)
  const dayOfWeek = (startOfToday.getDay() + 6) % 7 // 0=lun
  const monday = new Date(startOfToday)
  monday.setDate(monday.getDate() - dayOfWeek)

  return Array.from({ length: 16 }, (_, i) => {
    const weekStart = new Date(monday)
    weekStart.setDate(monday.getDate() - (15 - i) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    const label = weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    const count = commits.filter(c => {
      const t = new Date(c.commit.author.date)
      return t >= weekStart && t < weekEnd
    }).length
    return { label, commits: count, weekStart: weekStart.toISOString().slice(0,10), weekEnd: weekEnd.toISOString().slice(0,10) }
  })
}

function computeMonthlyActivity(commits) {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const fullLabel = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const count = commits.filter(c => {
      const t = new Date(c.commit.author.date)
      return t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear()
    }).length
    return { label, fullLabel, commits: count, month: d.getMonth(), year: d.getFullYear() }
  })
}

function computeContributorActivity(commits, prsOpen, prsClosed, issuesOpen, issuesClosed) {
  const map = {}
  const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  commits.forEach(c => {
    const name = c.author?.login || c.commit.author.name
    const avatar = c.author?.avatar_url || null
    const date = c.commit.author.date
    const day = date.slice(0, 10)
    const hour = new Date(date).getHours()
    if (!map[name]) map[name] = {
      name, avatar, commits: 0,
      daySet: new Set(), dates: [],
      dayOfWeek: [0,0,0,0,0,0,0],
      hours: Array(24).fill(0),
      firstCommit: date, lastCommit: date,
      heatmap: {},
    }
    const a = map[name]
    a.commits++
    a.daySet.add(day)
    a.dates.push(date)
    a.dayOfWeek[new Date(date).getDay()]++
    a.hours[hour]++
    a.heatmap[day] = (a.heatmap[day] || 0) + 1
    if (date < a.firstCommit) a.firstCommit = date
    if (date > a.lastCommit) a.lastCommit = date
  })

  // PRs per author
  const allPRs = [...(prsOpen || []), ...(prsClosed || [])]
  const prMap = {}
  allPRs.forEach(pr => {
    const login = pr.user?.login
    if (login) prMap[login] = (prMap[login] || 0) + 1
  })

  // Issues per author
  const allIssues = [
    ...(issuesOpen || []).filter(i => !i.pull_request),
    ...(issuesClosed || []).filter(i => !i.pull_request),
  ]
  const issueMap = {}
  allIssues.forEach(issue => {
    const login = issue.user?.login
    if (login) issueMap[login] = (issueMap[login] || 0) + 1
  })

  return Object.values(map).map(a => {
    const activeDays = a.daySet.size
    const firstDate = new Date(a.firstCommit)
    const lastDate = new Date(a.lastCommit)
    const spanDays = Math.max(1, Math.round((lastDate - firstDate) / 86400000))
    const daysSinceLast = Math.floor((Date.now() - lastDate) / 86400000)
    const peakDayIdx = a.dayOfWeek.indexOf(Math.max(...a.dayOfWeek))
    const peakHour = a.hours.indexOf(Math.max(...a.hours))

    // Time-of-day buckets
    const timeSlots = {
      nuit:    a.hours.slice(0,6).reduce((s,v)=>s+v,0),
      matin:   a.hours.slice(6,12).reduce((s,v)=>s+v,0),
      apresmidi: a.hours.slice(12,18).reduce((s,v)=>s+v,0),
      soir:    a.hours.slice(18,24).reduce((s,v)=>s+v,0),
    }

    // Weekly commits (last 12 weeks)
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const weeklyCommits = Array.from({ length: 12 }, (_, i) => {
      const weeksAgo = 11 - i
      return a.dates.filter(d => {
        const t = new Date(d).getTime()
        return Math.floor((now - t) / weekMs) === weeksAgo
      }).length
    })

    // Heatmap: last 16 weeks (112 days)
    const heatmapDays = Array.from({ length: 112 }, (_, i) => {
      const d = new Date(now - (111 - i) * 86400000)
      const key = d.toISOString().slice(0, 10)
      return { date: key, count: a.heatmap[key] || 0 }
    })

    // Streak
    let streak = 0
    const sortedDays = [...a.daySet].sort().reverse()
    let cur = new Date(); cur.setHours(0,0,0,0)
    for (const day of sortedDays) {
      const d = new Date(day)
      const diff = Math.round((cur - d) / 86400000)
      if (diff <= 1) { streak++; cur = d } else break
    }

    return {
      name: a.name,
      avatar: a.avatar,
      commits: a.commits,
      activeDays,
      firstCommit: a.firstCommit,
      lastCommit: a.lastCommit,
      spanDays,
      daysSinceLast,
      commitsPerActiveDay: +(a.commits / activeDays).toFixed(1),
      intensity: Math.min(100, Math.round((activeDays / Math.max(spanDays, 1)) * 100)),
      peakDay: DAY_NAMES[peakDayIdx],
      peakHour: `${peakHour}h-${peakHour+1}h`,
      timeSlots,
      weeklyCommits,
      heatmapDays,
      streak,
      dayOfWeek: a.dayOfWeek,
      prs: prMap[a.name] || 0,
      issues: issueMap[a.name] || 0,
    }
  }).sort((a, b) => b.commits - a.commits)
}

// allMembers = fusion contributors (vrais totaux GitHub) + collaborators
function mergeWithCollaborators(activityList, allMembers) {
  const result = [...activityList]

  allMembers.forEach(member => {
    const existing = result.find(a => a.name === member.login)
    if (existing) {
      // On a de l'activité analysée pour ce membre.
      // Si GitHub dit qu'il a plus de commits que ce qu'on a chargé, on corrige le total affiché.
      if (member.contributions > existing.commits) {
        existing.commits = member.contributions
        existing.partialData = true // signale que l'analyse détaillée est incomplète
      }
    } else {
      // Membre présent dans contributors ou collaborators mais absent de notre analyse
      // (commits au-delà des pages chargées, ou aucun commit du tout)
      const hasCommits = member.contributions > 0
      result.push({
        name: member.login,
        avatar: member.avatar_url,
        commits: member.contributions || 0,
        partialData: hasCommits, // a des commits mais hors de notre fenêtre d'analyse
        activeDays: 0,
        firstCommit: null,
        lastCommit: null,
        spanDays: 0,
        daysSinceLast: hasCommits ? 999 : Infinity,
        commitsPerActiveDay: 0,
        intensity: 0,
        peakDay: '—',
        peakHour: '—',
        timeSlots: { nuit: 0, matin: 0, apresmidi: 0, soir: 0 },
        weeklyCommits: Array(12).fill(0),
        heatmapDays: Array(112).fill({ date: '', count: 0 }),
        streak: 0,
        dayOfWeek: [0,0,0,0,0,0,0],
        prs: 0,
        issues: 0,
      })
    }
  })

  // Tri final : d'abord par commits décroissants
  return result.sort((a, b) => b.commits - a.commits)
}

export function useGitHubData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const loadIdRef = useRef(0)

  const load = useCallback(async (owner, repo, token) => {
    const loadId = ++loadIdRef.current
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const [info, contributors, collaboratorsResult, commits, prs, issues, languages, branches] =
        await Promise.all([
          fetchRepoInfo(owner, repo, token),
          fetchContributors(owner, repo, token),
          fetchCollaborators(owner, repo, token).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e.message })),
          fetchCommits(owner, repo, token),
          fetchPullRequests(owner, repo, token),
          fetchIssues(owner, repo, token),
          fetchLanguages(owner, repo, token),
          fetchBranches(owner, repo, token),
        ])
      const collaborators = collaboratorsResult

      // Fusion : tous les collaborateurs + contributeurs sans doublons
      const allMembers = [...contributors]
      collaborators.data.forEach(collab => {
        const exists = allMembers.find(c => c.login === collab.login)
        if (!exists) {
          allMembers.push({ login: collab.login, avatar_url: collab.avatar_url, contributions: 0, isCollaborator: true })
        }
      })

      const merged = prs.closed.filter(pr => pr.merged_at)
      const totalPRs = prs.open.length + prs.closed.length
      const mergeRate = totalPRs > 0 ? Math.round((merged.length / totalPRs) * 100) : 0

      const daysSinceLastCommit = commits[0]
        ? Math.floor((Date.now() - new Date(commits[0].commit.author.date)) / 86400000)
        : null

      const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0)
      const langData = Object.entries(languages)
        .map(([lang, bytes]) => ({
          name: lang,
          value: Math.round((bytes / totalBytes) * 100),
          bytes,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)

      // Commits par jour de semaine pour le bar chart
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
      const dayMap = [0, 0, 0, 0, 0, 0, 0]
      commits.forEach(c => {
        const d = (new Date(c.commit.author.date).getDay() + 6) % 7
        dayMap[d]++
      })
      const commitsByDay = days.map((d, i) => ({ day: d, commits: dayMap[i] }))

      // PR par mois (6 derniers mois)
      const now = new Date()
      const prByMonth = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        const label = d.toLocaleDateString('fr-FR', { month: 'short' })
        const count = [...prs.open, ...prs.closed].filter(pr => {
          const created = new Date(pr.created_at)
          return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear()
        }).length
        return { label, count }
      })

      if (loadId !== loadIdRef.current) return
      setData({
        info,
        collaboratorsError: collaborators.error,
        contributors: allMembers.slice(0, 20),
        commits,
        dailyActivity: computeDailyActivity(commits),
        weeklyActivity: computeWeeklyActivity(commits),
        monthlyActivity: computeMonthlyActivity(commits),
        commitsByDay,
        authorCommits: mergeWithCollaborators(
          computeContributorActivity(commits, prs.open, prs.closed, issues.open, issues.closed),
          allMembers
        ),
        prByMonth,
        prs: {
          open: prs.open.length,
          closed: prs.closed.length,
          merged: merged.length,
          total: totalPRs,
          mergeRate,
          recentList: [...prs.open, ...prs.closed]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 6),
        },
        issues: {
          open: issues.open.length,
          closed: issues.closed.length,
          resolutionRate: issues.closed.length + issues.open.length > 0
            ? Math.round((issues.closed.length / (issues.closed.length + issues.open.length)) * 100)
            : 0,
        },
        languages: langData,
        branches: branches.length,
        branchAnalysis: analyzeBranches(branches.map(b => b.name)),
        prAnalysis: analyzePRs(prs.open, prs.closed),
        streak: computeStreak(commits),
        mostActiveDay: computeMostActiveDay(commits),
        daysSinceLastCommit,
        avgCommitsPerWeek: Math.round(commits.length / 16),
        commitLint: analyzeCommits(commits),
        commitLintByAuthor: analyzeByAuthor(commits),
      })
    } catch (e) {
      if (loadId !== loadIdRef.current) return
      setError(e.message)
    } finally {
      if (loadId === loadIdRef.current) setLoading(false)
    }
  }, [])

  const reset = useCallback(() => { setData(null); setError(null) }, [])

  return { data, loading, error, load, reset }
}

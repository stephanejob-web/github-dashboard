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
  fetchMilestones,
  fetchWorkflowRuns,
  fetchPRReviewComments,
  fetchQualitySignals,
  safe,
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
  const startOfToday = new Date(now); startOfToday.setHours(0,0,0,0)
  const dayOfWeek = (startOfToday.getDay() + 6) % 7
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

  const allPRs = [...(prsOpen || []), ...(prsClosed || [])]
  const prMap = {}
  allPRs.forEach(pr => {
    const login = pr.user?.login
    if (login) prMap[login] = (prMap[login] || 0) + 1
  })

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

    const timeSlots = {
      nuit:      a.hours.slice(0,6).reduce((s,v)=>s+v,0),
      matin:     a.hours.slice(6,12).reduce((s,v)=>s+v,0),
      apresmidi: a.hours.slice(12,18).reduce((s,v)=>s+v,0),
      soir:      a.hours.slice(18,24).reduce((s,v)=>s+v,0),
    }

    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const weeklyCommits = Array.from({ length: 12 }, (_, i) => {
      const weeksAgo = 11 - i
      return a.dates.filter(d => {
        const t = new Date(d).getTime()
        return Math.floor((now - t) / weekMs) === weeksAgo
      }).length
    })

    const heatmapDays = Array.from({ length: 112 }, (_, i) => {
      const d = new Date(now - (111 - i) * 86400000)
      const key = d.toISOString().slice(0, 10)
      return { date: key, count: a.heatmap[key] || 0 }
    })

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

function mergeWithCollaborators(activityList, allMembers) {
  const result = [...activityList]

  allMembers.forEach(member => {
    const existing = result.find(a => a.name === member.login)
    if (existing) {
      if (member.contributions > existing.commits) {
        existing.commits = member.contributions
        existing.partialData = true
      }
    } else {
      const hasCommits = member.contributions > 0
      result.push({
        name: member.login,
        avatar: member.avatar_url,
        commits: member.contributions || 0,
        partialData: hasCommits,
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
      // fetchRepoInfo is the only critical call — let it throw
      const info = await fetchRepoInfo(owner, repo, token)

      if (loadId !== loadIdRef.current) return

      // All other endpoints are optional — failures degrade gracefully
      const [
        contributorsResult,
        collaboratorsResult,
        commitsResult,
        prsResult,
        issuesResult,
        languagesResult,
        branchesResult,
        milestonesResult,
        workflowRunsResult,
        reviewCommentsResult,
        qualityResult,
      ] = await Promise.all([
        safe(fetchContributors(owner, repo, token), []),
        safe(fetchCollaborators(owner, repo, token), []),
        safe(fetchCommits(owner, repo, token), []),
        safe(fetchPullRequests(owner, repo, token), { open: [], closed: [] }),
        safe(fetchIssues(owner, repo, token), { open: [], closed: [] }),
        safe(fetchLanguages(owner, repo, token), {}),
        safe(fetchBranches(owner, repo, token), []),
        safe(fetchMilestones(owner, repo, token), { open: [], closed: [] }),
        safe(fetchWorkflowRuns(owner, repo, token), []),
        safe(fetchPRReviewComments(owner, repo, token), []),
        safe(fetchQualitySignals(owner, repo, token), { signals: {}, scoreItems: [], score: 0, hasTests: false }),
      ])

      if (loadId !== loadIdRef.current) return

      const contributors   = contributorsResult.data
      const collaborators  = collaboratorsResult.data
      const commits        = commitsResult.data
      const prs            = prsResult.data
      const issues         = issuesResult.data
      const languages      = languagesResult.data
      const branches       = branchesResult.data
      const milestones     = milestonesResult.data
      const workflowRuns   = workflowRunsResult.data
      const reviewComments = reviewCommentsResult.data
      const quality        = qualityResult.data

      // Collect warnings — only for unexpected failures, not known API limitations
      const warnings = []
      const isExpected = msg => !msg || [
        'too large to list',          // contributors: repo géant (linux, etc.)
        'push access',                 // collaborators: toujours refusé sur repo public
        'Not Found',                   // PRs/issues absents (repo sans PRs, ex: linux)
        'Must have',                   // permissions insuffisantes
      ].some(s => msg.includes(s))

      if (commitsResult.error && !isExpected(commitsResult.error))
        warnings.push(`Commits : ${commitsResult.error}`)
      if (languagesResult.error && !isExpected(languagesResult.error))
        warnings.push(`Langages : ${languagesResult.error}`)
      if (branchesResult.error && !isExpected(branchesResult.error))
        warnings.push(`Branches : ${branchesResult.error}`)
      if (prsResult.error && !isExpected(prsResult.error))
        warnings.push(`Pull Requests : ${prsResult.error}`)
      if (issuesResult.error && !isExpected(issuesResult.error))
        warnings.push(`Issues : ${issuesResult.error}`)

      // Merge contributors + collaborators, deduplicated
      const allMembers = [...contributors]
      collaborators.forEach(collab => {
        if (!allMembers.find(c => c.login === collab.login)) {
          allMembers.push({ login: collab.login, avatar_url: collab.avatar_url, contributions: 0, isCollaborator: true })
        }
      })

      const merged = (prs.closed || []).filter(pr => pr.merged_at)
      const totalPRs = (prs.open?.length || 0) + (prs.closed?.length || 0)
      const mergeRate = totalPRs > 0 ? Math.round((merged.length / totalPRs) * 100) : 0

      const daysSinceLastCommit = commits[0]
        ? Math.floor((Date.now() - new Date(commits[0].commit.author.date)) / 86400000)
        : null

      const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0)
      const langData = totalBytes > 0
        ? Object.entries(languages)
            .map(([lang, bytes]) => ({ name: lang, value: Math.round((bytes / totalBytes) * 100), bytes }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
        : []

      // ── Milestones / Sprints ──────────────────────────────────
      const allMilestones = [
        ...(milestones.open || []).map(m => ({ ...m, state: 'open' })),
        ...(milestones.closed || []).slice(0, 5).map(m => ({ ...m, state: 'closed' })),
      ].map(m => {
        const total = (m.open_issues || 0) + (m.closed_issues || 0)
        const progress = total > 0 ? Math.round((m.closed_issues / total) * 100) : 0
        const dueDate = m.due_on ? new Date(m.due_on) : null
        const daysLeft = dueDate ? Math.ceil((dueDate - new Date()) / 86400000) : null
        return { ...m, total, progress, daysLeft }
      })

      // ── PR Health ─────────────────────────────────────────────
      const mergedPRsList = (prs.closed || []).filter(pr => pr.merged_at)
      const mergeTimes = mergedPRsList.map(pr => {
        const hours = (new Date(pr.merged_at) - new Date(pr.created_at)) / 3600000
        return hours
      })
      const avgMergeTimeHours = mergeTimes.length
        ? mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length
        : 0
      const mergeTimeDist = {
        fast:   mergeTimes.filter(h => h < 24).length,
        normal: mergeTimes.filter(h => h >= 24 && h < 72).length,
        slow:   mergeTimes.filter(h => h >= 72 && h < 168).length,
        stuck:  mergeTimes.filter(h => h >= 168).length,
      }

      const openPRsAged = (prs.open || []).map(pr => {
        const ageHours = (Date.now() - new Date(pr.created_at)) / 3600000
        return { ...pr, ageHours, ageDays: Math.floor(ageHours / 24) }
      }).sort((a, b) => b.ageHours - a.ageHours).slice(0, 6)

      // ── Review participation ──────────────────────────────────
      const reviewerMap = {}
      reviewComments.forEach(c => {
        const login = c.user?.login
        if (!login) return
        reviewerMap[login] = (reviewerMap[login] || 0) + 1
      })
      const topReviewers = Object.entries(reviewerMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([login, count]) => {
          const avatar = reviewComments.find(c => c.user?.login === login)?.user?.avatar_url || null
          return { login, count, avatar }
        })

      // ── Bus factor ───────────────────────────────────────────
      const totalContribCommits = contributors.reduce((s, c) => s + (c.contributions || 0), 0)
      let busCumul = 0
      let busFactor = 0
      const busSorted = [...contributors].sort((a, b) => b.contributions - a.contributions)
      for (const c of busSorted) {
        busCumul += c.contributions || 0
        busFactor++
        if (totalContribCommits > 0 && busCumul / totalContribCommits >= 0.5) break
      }

      // ── Label distribution ────────────────────────────────────
      const labelMap = {}
      ;[...(issues.open || []), ...(issues.closed || [])].forEach(issue => {
        (issue.labels || []).forEach(l => {
          labelMap[l.name] = { count: (labelMap[l.name]?.count || 0) + 1, color: l.color }
        })
      })
      const labelDist = Object.entries(labelMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([name, { count, color }]) => ({ name, count, color }))

      // ── Issues sans assignee ──────────────────────────────────
      const issuesUnassigned = (issues.open || []).filter(i => !i.assignee && !i.assignees?.length).length
      const issuesAssigned   = (issues.open || []).length - issuesUnassigned

      // ── CI / GitHub Actions ───────────────────────────────────
      const ciRuns = workflowRuns.slice(0, 20)
      const ciByWorkflow = {}
      ciRuns.forEach(run => {
        const name = run.name || run.workflow_id
        if (!ciByWorkflow[name]) ciByWorkflow[name] = { name, runs: [], successCount: 0, failCount: 0 }
        ciByWorkflow[name].runs.push(run)
        if (run.conclusion === 'success') ciByWorkflow[name].successCount++
        else if (['failure', 'timed_out', 'cancelled'].includes(run.conclusion)) ciByWorkflow[name].failCount++
      })
      const ciWorkflows = Object.values(ciByWorkflow).map(w => ({
        ...w,
        successRate: w.runs.length > 0 ? Math.round((w.successCount / w.runs.length) * 100) : 0,
        lastRun: w.runs[0] || null,
      }))
      // ── Analyse commits test par développeur ─────────────────
      const TEST_KW = /\btest(s|ing)?\b|spec\b|unit\b|e2e\b|coverage\b|jest\b|vitest\b|pytest\b|fixture/i
      const commitTestActivity = {}
      commits.forEach(c => {
        const msg = c.commit.message || ''
        const author = c.author?.login || c.commit.author.name
        if (!commitTestActivity[author]) commitTestActivity[author] = { total: 0, testRelated: 0, avatar: c.author?.avatar_url || null }
        commitTestActivity[author].total++
        if (TEST_KW.test(msg)) commitTestActivity[author].testRelated++
      })
      const devTestActivity = Object.entries(commitTestActivity)
        .map(([login, d]) => ({
          login,
          avatar: d.avatar,
          total: d.total,
          testRelated: d.testRelated,
          testPct: d.total > 0 ? Math.round((d.testRelated / d.total) * 100) : 0,
        }))
        .filter(d => d.total >= 2)
        .sort((a, b) => b.testPct - a.testPct)

      const ciTotalSuccess = ciRuns.filter(r => r.conclusion === 'success').length
      const ciSuccessRate  = ciRuns.length > 0 ? Math.round((ciTotalSuccess / ciRuns.length) * 100) : null

      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
      const dayMap = [0, 0, 0, 0, 0, 0, 0]
      commits.forEach(c => {
        const d = (new Date(c.commit.author.date).getDay() + 6) % 7
        dayMap[d]++
      })
      const commitsByDay = days.map((d, i) => ({ day: d, commits: dayMap[i] }))

      const now = new Date()
      const prByMonth = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        const label = d.toLocaleDateString('fr-FR', { month: 'short' })
        const count = [...(prs.open || []), ...(prs.closed || [])].filter(pr => {
          const created = new Date(pr.created_at)
          return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear()
        }).length
        return { label, count }
      })

      setData({
        info,
        warnings,
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
          open: prs.open?.length || 0,
          closed: prs.closed?.length || 0,
          merged: merged.length,
          total: totalPRs,
          mergeRate,
          recentList: [...(prs.open || []), ...(prs.closed || [])]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 6),
        },
        issues: {
          open: issues.open?.length || 0,
          closed: issues.closed?.length || 0,
          resolutionRate: (issues.closed?.length || 0) + (issues.open?.length || 0) > 0
            ? Math.round(((issues.closed?.length || 0) / ((issues.closed?.length || 0) + (issues.open?.length || 0))) * 100)
            : 0,
        },
        languages: langData,
        branches: branches.length,
        branchAnalysis: analyzeBranches(branches.map(b => b.name)),
        prAnalysis: analyzePRs(prs.open || [], prs.closed || []),
        streak: computeStreak(commits),
        mostActiveDay: computeMostActiveDay(commits),
        daysSinceLastCommit,
        avgCommitsPerWeek: Math.round(commits.length / 16),
        commitLint: analyzeCommits(commits),
        commitLintByAuthor: analyzeByAuthor(commits),
        // Scrum Master — nouvelles métriques
        milestones: allMilestones,
        prHealth: { avgMergeTimeHours, mergeTimeDist, openPRsAged },
        topReviewers,
        busFactor,
        busFactorList: busSorted.slice(0, 8).map(c => ({
          login: c.login,
          avatar: c.avatar_url,
          contributions: c.contributions,
          pct: totalContribCommits > 0 ? Math.round((c.contributions / totalContribCommits) * 100) : 0,
        })),
        labelDist,
        issuesAssignment: { assigned: issuesAssigned, unassigned: issuesUnassigned },
        ci: { runs: ciRuns.slice(0, 10), workflows: ciWorkflows, successRate: ciSuccessRate },
        quality,
        devTestActivity,
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

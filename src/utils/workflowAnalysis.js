// Branch naming convention rules
const BRANCH_RULES = [
  { pattern: /^(feature|feat)\//i,                                    type: 'feature',   color: '#4ade80',  label: 'Feature' },
  { pattern: /^(fix|bugfix|hotfix|patch)\//i,                         type: 'fix',       color: '#f87171',  label: 'Fix' },
  { pattern: /^(release|rel)\//i,                                     type: 'release',   color: '#fbbf24',  label: 'Release' },
  { pattern: /^(chore|docs|test|refactor|perf|ci|style|build)\//i,   type: 'chore',     color: '#818cf8',  label: 'Chore' },
  { pattern: /^(main|master|develop|dev|staging|production|prod|preprod)$/i, type: 'protected', color: '#94a3b8', label: 'Protégée' },
]

const ISSUE_REF_RE = /#\d+|(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#\d+/i

export function analyzeBranches(branchNames) {
  const results = branchNames.map(name => {
    const rule = BRANCH_RULES.find(r => r.pattern.test(name))
    return {
      name,
      type: rule?.type || 'non-conforme',
      label: rule?.label || 'Non conforme',
      color: rule?.color || '#ef4444',
      compliant: !!rule,
      isProtected: rule?.type === 'protected',
    }
  })

  const unprotected = results.filter(r => !r.isProtected)
  const compliant = unprotected.filter(r => r.compliant)
  const violations = unprotected.filter(r => !r.compliant)
  const score = unprotected.length > 0
    ? Math.round((compliant.length / unprotected.length) * 100)
    : 100

  const distribution = {}
  results.forEach(r => {
    distribution[r.type] = (distribution[r.type] || 0) + 1
  })

  return {
    total: branchNames.length,
    unprotectedTotal: unprotected.length,
    compliantCount: compliant.length,
    violations,
    score,
    distribution,
    protectedCount: results.filter(r => r.isProtected).length,
  }
}

export function analyzePRs(prsOpen, prsClosed) {
  const allPRs = [...prsOpen, ...prsClosed]
  const merged = prsClosed.filter(pr => pr.merged_at)

  if (allPRs.length === 0) {
    return {
      total: 0, withDescription: 0, descriptionRate: 100,
      withIssueRef: 0, issueRefRate: 100,
      cycleTimes: [], avgCycleHours: 0, avgCycleDays: '0',
      noDescriptionList: [],
    }
  }

  // Description quality (> 50 chars = substantielle)
  const withDesc = allPRs.filter(pr => pr.body && pr.body.trim().length > 50)
  const noDescList = allPRs
    .filter(pr => !pr.body || pr.body.trim().length <= 50)
    .slice(0, 10)
    .map(pr => ({ title: pr.title, number: pr.number, author: pr.user?.login, url: pr.html_url }))

  // Issue references in title or body
  const withIssueRef = allPRs.filter(pr => {
    const text = (pr.title || '') + ' ' + (pr.body || '')
    return ISSUE_REF_RE.test(text)
  })

  // Cycle time: open → merge (hours)
  const cycleTimes = merged
    .map(pr => {
      const hours = Math.round((new Date(pr.merged_at) - new Date(pr.created_at)) / 3600000)
      return { title: pr.title, number: pr.number, hours, author: pr.user?.login, url: pr.html_url }
    })
    .sort((a, b) => a.hours - b.hours)

  const avgCycleHours = cycleTimes.length > 0
    ? Math.round(cycleTimes.reduce((s, p) => s + p.hours, 0) / cycleTimes.length)
    : 0

  return {
    total: allPRs.length,
    withDescription: withDesc.length,
    descriptionRate: Math.round((withDesc.length / allPRs.length) * 100),
    withIssueRef: withIssueRef.length,
    issueRefRate: Math.round((withIssueRef.length / allPRs.length) * 100),
    cycleTimes,
    avgCycleHours,
    avgCycleDays: (avgCycleHours / 24).toFixed(1),
    noDescriptionList: noDescList,
  }
}

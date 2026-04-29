export const CONVENTIONAL_TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'test', 'chore', 'perf', 'ci', 'build', 'revert',
]

const TYPE_LABELS = {
  feat:     { label: 'Feature',     color: '#4ade80' },
  fix:      { label: 'Bug Fix',     color: '#f87171' },
  docs:     { label: 'Docs',        color: '#67e8f9' },
  style:    { label: 'Style',       color: '#d8b4fe' },
  refactor: { label: 'Refactor',    color: '#fbbf24' },
  test:     { label: 'Test',        color: '#a3e635' },
  chore:    { label: 'Chore',       color: '#94a3b8' },
  perf:     { label: 'Perf',        color: '#f9a8d4' },
  ci:       { label: 'CI',          color: '#7dd3fc' },
  build:    { label: 'Build',       color: '#fdba74' },
  revert:   { label: 'Revert',      color: '#fb923c' },
}

export function getTypeLabel(type) {
  return TYPE_LABELS[type] || { label: type || 'inconnu', color: '#718096' }
}

/**
 * Valide un message de commit selon la convention Conventional Commits.
 * Retourne { valid, errors, type, scope, breaking, description }
 */
export function lintCommit(rawMessage) {
  const firstLine = rawMessage.split('\n')[0].trim()
  const errors = []

  if (!firstLine) {
    return { valid: false, errors: ['Message vide'], type: null, scope: null, breaking: false, description: '', firstLine }
  }

  // Format attendu : type(scope)!: description
  // Le séparateur ": " (colon + espace) est obligatoire
  const colonIdx = firstLine.indexOf(': ')
  if (colonIdx === -1) {
    errors.push('Séparateur ": " manquant — format attendu : type(scope): description')
    return { valid: false, errors, type: null, scope: null, breaking: false, description: firstLine, firstLine }
  }

  const prefix = firstLine.slice(0, colonIdx)
  const description = firstLine.slice(colonIdx + 2)

  // Extraire type, scope, breaking depuis le préfixe
  const prefixMatch = prefix.match(/^([a-zA-Z]+)(\(([^)]*)\))?(!)?\s*$/)

  if (!prefixMatch) {
    errors.push(`Préfixe invalide : "${prefix}" — attendu : type ou type(scope) ou type(scope)!`)
    return { valid: false, errors, type: null, scope: null, breaking: false, description, firstLine }
  }

  const [, rawType, , rawScope, breaking] = prefixMatch

  // ── Validation du type ──
  if (rawType !== rawType.toLowerCase()) {
    errors.push(`Type en majuscule : "${rawType}" → utilise "${rawType.toLowerCase()}"`)
  }
  const type = rawType.toLowerCase()
  if (!CONVENTIONAL_TYPES.includes(type)) {
    errors.push(`Type inconnu : "${type}" — types valides : ${CONVENTIONAL_TYPES.join(', ')}`)
  }

  // ── Validation du scope ──
  if (rawScope !== undefined) {
    if (rawScope.trim() === '') {
      errors.push('Scope vide : retire les parenthèses ou ajoute un scope')
    } else if (rawScope !== rawScope.toLowerCase()) {
      errors.push(`Scope en majuscule : "${rawScope}" → utilise "${rawScope.toLowerCase()}"`)
    } else if (/\s/.test(rawScope)) {
      errors.push(`Scope avec espace : "${rawScope}" → utilise un tiret ex: "feat(mon-module)"`)
    }
  }

  // ── Validation de la description ──
  if (!description || description.trim().length === 0) {
    errors.push('Description vide après le ":"')
  } else {
    if (description.trim().length < 3) {
      errors.push('Description trop courte (minimum 3 caractères)')
    }
    if (description.endsWith('.')) {
      errors.push('Description ne doit pas finir par un point "."')
    }
    if (/^[A-Z]/.test(description)) {
      errors.push(`Description commence par une majuscule : "${description[0]}" → utilise des minuscules`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    type: CONVENTIONAL_TYPES.includes(type) ? type : null,
    scope: rawScope || null,
    breaking: !!breaking,
    description,
    firstLine,
  }
}

// Commits parasites : wip, tmp, test seul, aaaa, etc.
const PARASITE_RE = [
  /^wip[\s:!]/i, /^wip$/i,
  /^tmp[\s:]?$/i, /^temp[\s:]?$/i,
  /^fixup[!\s:]?/i, /^squash[!\s:]?/i,
  /^debug[\s:]?$/i,
  /^test[\s!]?$/i, /^testing[\s!]?$/i,
  /^(update|changes?|stuff|misc|oops|asdf|qwerty|blabla|lol|ok|done|commit)$/i,
  /^\.{2,}$/, /^-{2,}$/,
  /^[a-z]{1,2}$/i,      // "aa", "ok", "x"
  /^(.)\1{3,}$/i,        // "aaaa", "xxxx"
]

// Références d'issues dans le message complet
const ISSUE_REF_RE = /#\d+|(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#\d+/i

function isParasite(msg) {
  return PARASITE_RE.some(r => r.test(msg.trim()))
}

/**
 * Analyse un tableau de commits GitHub et retourne les stats de conformité.
 */
export function analyzeCommits(commits) {
  const results = commits.map(c => {
    const firstLine = c.commit.message.split('\n')[0].trim()
    const lint = lintCommit(c.commit.message)
    const parasite = isParasite(firstLine)
    const hasIssueRef = ISSUE_REF_RE.test(c.commit.message)
    return {
      sha: c.sha.slice(0, 7),
      fullSha: c.sha,
      author: c.author?.login || c.commit.author.name,
      avatar: c.author?.avatar_url || null,
      date: c.commit.author.date,
      url: c.html_url,
      message: firstLine,
      parasite,
      hasIssueRef,
      ...lint,
    }
  })

  const total = results.length
  const valid = results.filter(r => r.valid).length
  const score = total > 0 ? Math.round((valid / total) * 100) : 100
  const parasites = results.filter(r => r.parasite)
  const withIssueRef = results.filter(r => r.hasIssueRef).length

  const violations = results.filter(r => !r.valid)
  const typeDistribution = {}
  results.filter(r => r.type).forEach(r => {
    typeDistribution[r.type] = (typeDistribution[r.type] || 0) + 1
  })

  return {
    results, total, valid, score, violations, typeDistribution,
    parasites,
    parasiteCount: parasites.length,
    parasiteRate: total > 0 ? Math.round((parasites.length / total) * 100) : 0,
    withIssueRef,
    issueRefRate: total > 0 ? Math.round((withIssueRef / total) * 100) : 0,
  }
}

/**
 * Stats de conformité par auteur.
 */
export function analyzeByAuthor(commits) {
  const byAuthor = {}
  commits.forEach(c => {
    const author = c.author?.login || c.commit.author.name
    if (!byAuthor[author]) byAuthor[author] = []
    byAuthor[author].push(c)
  })

  return Object.entries(byAuthor).map(([author, authorCommits]) => {
    const stats = analyzeCommits(authorCommits)
    return { author, ...stats }
  }).sort((a, b) => b.total - a.total)
}

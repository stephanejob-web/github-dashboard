import { useUser } from '@clerk/clerk-react'
import { useCallback } from 'react'

function key(userId, suffix) {
  return `gitpulse_${userId}_${suffix}`
}

export function useUserStorage() {
  const { user } = useUser()
  const uid = user?.id

  const getToken = useCallback(() => {
    if (!uid) return ''
    try { return localStorage.getItem(key(uid, 'gh_token')) || '' } catch { return '' }
  }, [uid])

  const saveToken = useCallback((token) => {
    if (!uid) return
    try {
      if (token) localStorage.setItem(key(uid, 'gh_token'), token)
      else localStorage.removeItem(key(uid, 'gh_token'))
    } catch {}
  }, [uid])

  const getFavorites = useCallback(() => {
    if (!uid) return []
    try {
      return JSON.parse(localStorage.getItem(key(uid, 'favorites')) || '[]')
    } catch { return [] }
  }, [uid])

  const saveFavorites = useCallback((favs) => {
    if (!uid) return
    try { localStorage.setItem(key(uid, 'favorites'), JSON.stringify(favs)) } catch {}
  }, [uid])

  const addFavorite = useCallback((owner, repo, label = '') => {
    const favs = getFavorites()
    if (favs.find(f => f.owner === owner && f.repo === repo)) return
    saveFavorites([...favs, { owner, repo, label: label || `${owner}/${repo}`, addedAt: Date.now() }])
  }, [getFavorites, saveFavorites])

  const removeFavorite = useCallback((owner, repo) => {
    saveFavorites(getFavorites().filter(f => !(f.owner === owner && f.repo === repo)))
  }, [getFavorites, saveFavorites])

  const isFavorite = useCallback((owner, repo) => {
    return getFavorites().some(f => f.owner === owner && f.repo === repo)
  }, [getFavorites])

  const getGGToken = useCallback(() => {
    if (!uid) return ''
    try { return localStorage.getItem(key(uid, 'gg_token')) || '' } catch { return '' }
  }, [uid])

  const saveGGToken = useCallback((token) => {
    if (!uid) return
    try {
      if (token) localStorage.setItem(key(uid, 'gg_token'), token)
      else localStorage.removeItem(key(uid, 'gg_token'))
    } catch {}
  }, [uid])

  return { getToken, saveToken, getFavorites, addFavorite, removeFavorite, isFavorite, getGGToken, saveGGToken }
}

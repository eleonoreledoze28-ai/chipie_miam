import { useCallback, useSyncExternalStore } from 'react'

export interface ProfileMeta {
  id: string
  nom: string
  avatar: string
}

interface ProfilesState {
  activeId: string
  profiles: ProfileMeta[]
}

const META_KEY = 'chipie_profiles_meta'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Migration: if old single-profile data exists, migrate it
function migrate(): ProfilesState {
  const oldProfil = localStorage.getItem('chipie_profil')
  const defaultId = 'chipie'

  // Already migrated?
  const existing = localStorage.getItem(META_KEY)
  if (existing) {
    try { return JSON.parse(existing) } catch { /* fall through */ }
  }

  // Migrate old data
  if (oldProfil) {
    try {
      const p = JSON.parse(oldProfil)
      // Move old keys to prefixed keys
      localStorage.setItem(`chipie_profil_${defaultId}`, oldProfil)
      const journal = localStorage.getItem('chipie_journal')
      if (journal) localStorage.setItem(`chipie_journal_${defaultId}`, journal)
      const images = localStorage.getItem('chipie_custom_images')
      if (images) localStorage.setItem(`chipie_custom_images_${defaultId}`, images)

      // Remove old keys
      localStorage.removeItem('chipie_profil')
      localStorage.removeItem('chipie_journal')
      localStorage.removeItem('chipie_custom_images')

      const meta: ProfilesState = {
        activeId: defaultId,
        profiles: [{ id: defaultId, nom: p.nom || 'Chipie', avatar: p.avatar || '' }],
      }
      localStorage.setItem(META_KEY, JSON.stringify(meta))
      return meta
    } catch { /* fall through */ }
  }

  // Fresh install
  const meta: ProfilesState = {
    activeId: defaultId,
    profiles: [{ id: defaultId, nom: 'Chipie', avatar: '' }],
  }
  localStorage.setItem(META_KEY, JSON.stringify(meta))
  // Create default profile data
  localStorage.setItem(`chipie_profil_${defaultId}`, JSON.stringify({
    nom: 'Chipie', sousTitre: 'Lapin nain', race: '', age: '', poids: '', sterilise: '', avatar: '',
  }))
  return meta
}

let cachedState: ProfilesState = migrate()

let listeners: (() => void)[] = []
function subscribe(cb: () => void) {
  listeners.push(cb)
  return () => { listeners = listeners.filter(l => l !== cb) }
}

function getSnapshot(): ProfilesState { return cachedState }
function getServerSnapshot(): ProfilesState { return cachedState }

function notify() {
  listeners.forEach(l => l())
}

function saveMeta(state: ProfilesState) {
  cachedState = state
  localStorage.setItem(META_KEY, JSON.stringify(state))
  notify()
}

/** Get the active profile ID (can be called outside React) */
export function getActiveProfileId(): string {
  return cachedState.activeId
}

export function useProfiles() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const switchProfile = useCallback((id: string) => {
    if (state.profiles.some(p => p.id === id)) {
      saveMeta({ ...state, activeId: id })
      // Force reload to reset all hooks
      window.location.reload()
    }
  }, [state])

  const addProfile = useCallback((nom: string) => {
    const id = generateId()
    const newProfile: ProfileMeta = { id, nom, avatar: '' }
    // Create empty profile data
    localStorage.setItem(`chipie_profil_${id}`, JSON.stringify({
      nom, sousTitre: 'Lapin', race: '', age: '', poids: '', sterilise: '', avatar: '',
    }))
    const updated = {
      activeId: id,
      profiles: [...state.profiles, newProfile],
    }
    saveMeta(updated)
    window.location.reload()
  }, [state])

  const removeProfile = useCallback((id: string) => {
    if (state.profiles.length <= 1) return
    // Clean up localStorage
    localStorage.removeItem(`chipie_profil_${id}`)
    localStorage.removeItem(`chipie_journal_${id}`)
    localStorage.removeItem(`chipie_custom_images_${id}`)
    const remaining = state.profiles.filter(p => p.id !== id)
    const newActive = state.activeId === id ? remaining[0].id : state.activeId
    saveMeta({ activeId: newActive, profiles: remaining })
    if (state.activeId === id) window.location.reload()
  }, [state])

  const updateProfileMeta = useCallback((id: string, updates: Partial<ProfileMeta>) => {
    const updated = state.profiles.map(p => p.id === id ? { ...p, ...updates } : p)
    saveMeta({ ...state, profiles: updated })
  }, [state])

  return {
    profiles: state.profiles,
    activeId: state.activeId,
    switchProfile,
    addProfile,
    removeProfile,
    updateProfileMeta,
  }
}

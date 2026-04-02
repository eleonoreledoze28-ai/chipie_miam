import { useCallback, useSyncExternalStore } from 'react'

export interface Profil {
  nom: string
  sousTitre: string
  race: string
  age: string
  poids: string
  sterilise: string
  avatar: string // base64 data URL or empty for default
}

const STORAGE_KEY = 'chipie_profil'

const DEFAULTS: Profil = {
  nom: 'Chipie',
  sousTitre: 'Lapin nain',
  race: '',
  age: '',
  poids: '',
  sterilise: '',
  avatar: '',
}

function load(): Profil {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

function save(profil: Profil) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profil))
}

// Cache the snapshot to avoid infinite loops with useSyncExternalStore
let cachedSnapshot: Profil = load()

let listeners: (() => void)[] = []
function subscribe(cb: () => void) {
  listeners.push(cb)
  return () => { listeners = listeners.filter(l => l !== cb) }
}

function getSnapshot(): Profil {
  return cachedSnapshot
}

function getServerSnapshot(): Profil {
  return DEFAULTS
}

function notify() {
  cachedSnapshot = load()
  listeners.forEach(l => l())
}

export function useProfil() {
  const profil = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const updateProfil = useCallback((updates: Partial<Profil>) => {
    const updated = { ...cachedSnapshot, ...updates }
    save(updated)
    notify()
  }, [])

  return { profil, updateProfil } as const
}

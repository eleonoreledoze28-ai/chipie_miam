import { useCallback, useSyncExternalStore } from 'react'

export type ThemeId = 'dark' | 'lavender' | 'aqua' | 'aqua-dark' | 'autumn' | 'autumn-dark' | 'amalfi'

const STORAGE_KEY = 'chipie_theme'

// Thèmes à fond clair : le ciel et les étincelles s'y adaptent pour rester lisibles
const LIGHT_THEMES: ReadonlySet<ThemeId> = new Set<ThemeId>(['lavender', 'aqua', 'autumn', 'amalfi'])

export function isLightTheme(id: ThemeId): boolean {
  return LIGHT_THEMES.has(id)
}

function getSnapshot(): ThemeId {
  return (localStorage.getItem(STORAGE_KEY) as ThemeId) || 'dark'
}

function getServerSnapshot(): ThemeId {
  return 'dark'
}

let listeners: (() => void)[] = []
function subscribe(cb: () => void) {
  listeners.push(cb)
  return () => { listeners = listeners.filter(l => l !== cb) }
}

function applyTheme(id: ThemeId) {
  if (id === 'dark') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', id)
  }
}

// Apply on load
applyTheme(getSnapshot())

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setTheme = useCallback((id: ThemeId) => {
    localStorage.setItem(STORAGE_KEY, id)
    applyTheme(id)
    listeners.forEach(l => l())
  }, [])

  return { theme, setTheme } as const
}

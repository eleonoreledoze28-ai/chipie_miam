import { useCallback, useSyncExternalStore } from 'react'

export type ThemeId = 'dark' | 'lavender'

const STORAGE_KEY = 'chipie_theme'

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

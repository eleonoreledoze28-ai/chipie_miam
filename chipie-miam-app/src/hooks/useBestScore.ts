import { useCallback, useState } from 'react'

function read(key: string): number {
  try { return parseInt(localStorage.getItem(key) || '0', 10) || 0 } catch { return 0 }
}

/** Meilleur score persistant d'un jeu. `submit` renvoie true si c'est un nouveau record. */
export function useBestScore(key: string) {
  const [best, setBest] = useState(() => read(key))

  const submit = useCallback((score: number): boolean => {
    if (score <= read(key)) return false
    try { localStorage.setItem(key, String(score)) } catch { /* stockage indisponible */ }
    setBest(score)
    return true
  }, [key])

  return { best, submit }
}

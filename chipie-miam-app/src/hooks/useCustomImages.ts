import { useState, useCallback } from 'react'

const STORAGE_KEY = 'chipie_custom_images'

function load(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(data: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * Hook to manage custom image URLs per vegetal.
 * Returns getImage(vegetalId, defaultUrl) and setImage(vegetalId, url).
 */
export function useCustomImages() {
  const [overrides, setOverrides] = useState<Record<string, string>>(load)

  const getImage = useCallback(
    (vegetalId: string, defaultUrl: string) => overrides[vegetalId] || defaultUrl,
    [overrides],
  )

  const setImage = useCallback((vegetalId: string, url: string) => {
    setOverrides((prev) => {
      const next = { ...prev }
      if (url.trim()) {
        next[vegetalId] = url.trim()
      } else {
        delete next[vegetalId]
      }
      save(next)
      return next
    })
  }, [])

  return { getImage, setImage, overrides }
}

import { useState, useCallback } from 'react'
import { assetUrl } from '../utils/assetUrl'
import { getActiveProfileId } from './useProfiles'

function getStorageKey() {
  return `chipie_custom_images_${getActiveProfileId()}`
}

function load(): Record<string, string> {
  try {
    const raw = localStorage.getItem(getStorageKey())
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(data: Record<string, string>) {
  localStorage.setItem(getStorageKey(), JSON.stringify(data))
}

export function useCustomImages() {
  const [overrides, setOverrides] = useState<Record<string, string>>(load)

  const getImage = useCallback(
    (vegetalId: string, defaultUrl: string) =>
      overrides[vegetalId] || assetUrl(defaultUrl),
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

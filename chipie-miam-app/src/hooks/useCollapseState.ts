import { useState, useCallback } from 'react'
import { CATEGORIES } from '../data/vegetaux'

const STORAGE_KEY = 'chipie_collapsed_categories'

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr: string[] = JSON.parse(raw)
    return new Set(arr)
  } catch {
    return new Set()
  }
}

function saveCollapsed(collapsed: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]))
}

/**
 * Returns the set of OPEN categories (inverse of collapsed)
 * and persists collapse state in localStorage.
 */
export function useCollapseState() {
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed)

  const allCatIds = CATEGORIES.map((c) => c.id)

  const openCategories = new Set(allCatIds.filter((id) => !collapsed.has(id)))
  const allCollapsed = collapsed.size >= allCatIds.length

  const toggleCategory = useCallback((catId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      saveCollapsed(next)
      return next
    })
  }, [])

  const toggleCollapseAll = useCallback(() => {
    setCollapsed((prev) => {
      const isAllCollapsed = prev.size >= allCatIds.length
      const next = isAllCollapsed ? new Set<string>() : new Set(allCatIds)
      saveCollapsed(next)
      return next
    })
  }, [allCatIds])

  return { openCategories, allCollapsed, toggleCategory, toggleCollapseAll }
}

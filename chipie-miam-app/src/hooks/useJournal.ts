import { useState, useEffect, useCallback } from 'react'

export interface JournalEntry {
  id: string
  vegetalId: string
  date: string       // YYYY-MM-DD
  quantite: string   // 'une feuille', 'une poignee', etc.
  notes: string
  timestamp: number
}

const STORAGE_KEY = 'chipie_journal'

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>(loadEntries)

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  const addEntry = useCallback((entry: Omit<JournalEntry, 'id' | 'timestamp'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    }
    setEntries((prev) => [newEntry, ...prev])
    return newEntry
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const getEntriesForDate = useCallback(
    (date: string) => entries.filter((e) => e.date === date),
    [entries],
  )

  const getEntriesForWeek = useCallback(
    (dateInWeek: string) => {
      const d = new Date(dateInWeek)
      const day = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((day + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      const startStr = monday.toISOString().split('T')[0]
      const endStr = sunday.toISOString().split('T')[0]

      return entries.filter((e) => e.date >= startStr && e.date <= endStr)
    },
    [entries],
  )

  const getEntriesForMonth = useCallback(
    (dateInMonth: string) => {
      const d = new Date(dateInMonth + 'T00:00:00')
      const year = d.getFullYear()
      const month = d.getMonth()
      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      return entries.filter((e) => e.date >= startStr && e.date <= endStr)
    },
    [entries],
  )

  const getUniqueVegetauxCount = useCallback(
    (dateRange: JournalEntry[]) => {
      return new Set(dateRange.map((e) => e.vegetalId)).size
    },
    [],
  )

  const getCategoryBreakdown = useCallback(
    (dateRange: JournalEntry[], vegetauxMap: Map<string, string>) => {
      const counts: Record<string, number> = {}
      dateRange.forEach((e) => {
        const cat = vegetauxMap.get(e.vegetalId) || 'inconnu'
        counts[cat] = (counts[cat] || 0) + 1
      })
      return counts
    },
    [],
  )

  return {
    entries,
    addEntry,
    removeEntry,
    getEntriesForDate,
    getEntriesForWeek,
    getEntriesForMonth,
    getUniqueVegetauxCount,
    getCategoryBreakdown,
  }
}

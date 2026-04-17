import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import type { Vegetal } from '../../data/vegetaux'
import styles from './CoursesListePage.module.css'

// ── Types ────────────────────────────────────────────────────────────────────
interface CourseItem {
  id: string
  vegetalId: string
  checked: boolean
  addedAt: number
}

// ── Persistence ───────────────────────────────────────────────────────────────
function storageKey() { return `chipie-courses-${getActiveProfileId()}` }

function loadItems(): CourseItem[] {
  try {
    const raw = localStorage.getItem(storageKey())
    return raw ? JSON.parse(raw) as CourseItem[] : []
  } catch { return [] }
}

function saveItems(list: CourseItem[]) {
  localStorage.setItem(storageKey(), JSON.stringify(list))
}

// ── Season detection ──────────────────────────────────────────────────────────
function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return 'printemps'
  if (month >= 6 && month <= 8) return 'ete'
  if (month >= 9 && month <= 11) return 'automne'
  return 'hiver'
}

const SEASON_LABELS: Record<string, string> = {
  printemps: 'Printemps',
  ete: 'Été',
  automne: 'Automne',
  hiver: 'Hiver',
}

function isInSeason(v: Vegetal, season: string): boolean {
  if (!v.saisonnalite) return true
  const s = v.saisonnalite.toLowerCase()
  if (s.includes("toute") || s.includes("annee") || s.includes("année")) return true
  if (season === 'printemps') return s.includes('printemps')
  if (season === 'ete') return s.includes('ete') || s.includes('été')
  if (season === 'automne') return s.includes('automne')
  if (season === 'hiver') return s.includes('hiver')
  return false
}

const RESTRICTION_BADGE: Record<string, { label: string; color: string }> = {
  aucune:         { label: '✓ OK',        color: 'var(--accent-green)' },
  petite_quantite: { label: '⚠ Peu',      color: 'var(--accent-yellow)' },
  a_eviter:       { label: '✗ Éviter',    color: 'var(--accent-red)' },
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CoursesListePage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CourseItem[]>(loadItems)
  const [tab, setTab] = useState<'liste' | 'explorer'>('liste')
  const [search, setSearch] = useState('')
  const [filterSeason, setFilterSeason] = useState(false)
  const [filterSafe, setFilterSafe] = useState(false)

  const season = useMemo(getCurrentSeason, [])
  const seasonLabel = SEASON_LABELS[season]

  const inListIds = useMemo(() => new Set(items.map(i => i.vegetalId)), [items])

  const filteredVegetaux = useMemo(() => {
    let list = VEGETAUX.filter(v => v.restriction !== 'a_eviter')
    if (filterSeason) list = list.filter(v => isInSeason(v, season))
    if (filterSafe) list = list.filter(v => v.restriction === 'aucune')
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(v => v.nom.toLowerCase().includes(q))
    }
    return list
  }, [search, filterSeason, filterSafe, season])

  const addToList = useCallback((vegetalId: string) => {
    if (inListIds.has(vegetalId)) return
    setItems(prev => {
      const next = [...prev, { id: Date.now().toString(), vegetalId, checked: false, addedAt: Date.now() }]
      saveItems(next)
      return next
    })
  }, [inListIds])

  const toggleChecked = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
      saveItems(next)
      return next
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      saveItems(next)
      return next
    })
  }, [])

  const clearChecked = useCallback(() => {
    setItems(prev => {
      const next = prev.filter(i => !i.checked)
      saveItems(next)
      return next
    })
  }, [])

  const uncheckedCount = items.filter(i => !i.checked).length
  const checkedCount = items.filter(i => i.checked).length

  // Group explorer by category
  const grouped = useMemo(() => {
    const map = new Map<string, Vegetal[]>()
    for (const v of filteredVegetaux) {
      const list = map.get(v.categorie) ?? []
      list.push(v)
      map.set(v.categorie, list)
    }
    return map
  }, [filteredVegetaux])

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
        {tab === 'liste' && checkedCount > 0 && (
          <button className={styles.clearBtn} onClick={clearChecked}>
            Supprimer achetés ({checkedCount})
          </button>
        )}
      </div>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerEmoji}>🛒</span>
        <div>
          <h1 className={styles.title}>Liste de courses</h1>
          <p className={styles.subtitle}>Saison : {seasonLabel}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${tab === 'liste' ? styles.tabActive : ''}`}
          onClick={() => setTab('liste')}
        >
          Ma liste {items.length > 0 && <span className={styles.badge}>{uncheckedCount}</span>}
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'explorer' ? styles.tabActive : ''}`}
          onClick={() => setTab('explorer')}
        >
          Explorer
        </button>
      </div>

      {/* ── LISTE TAB ── */}
      {tab === 'liste' && (
        <>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🥬</span>
              <p>Ta liste est vide</p>
              <button className={styles.emptyBtn} onClick={() => setTab('explorer')}>
                Explorer les aliments
              </button>
            </div>
          ) : (
            <div className={styles.list}>
              {items.map(item => {
                const v = VEGETAUX.find(x => x.id === item.vegetalId)
                if (!v) return null
                const badge = RESTRICTION_BADGE[v.restriction]
                return (
                  <div
                    key={item.id}
                    className={`${styles.listItem} ${item.checked ? styles.listItemChecked : ''}`}
                    onClick={() => toggleChecked(item.id)}
                  >
                    <div className={`${styles.checkbox} ${item.checked ? styles.checkboxDone : ''}`}>
                      {item.checked && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className={styles.listItemInfo}>
                      <span className={styles.listItemName}>{v.nom}</span>
                      <span className={styles.listItemCat}>
                        {CATEGORIES.find(c => c.id === v.categorie)?.nom ?? v.categorie}
                      </span>
                    </div>
                    <span
                      className={styles.restrictionBadge}
                      style={{ color: badge.color, borderColor: badge.color }}
                    >
                      {badge.label}
                    </span>
                    <button
                      className={styles.deleteBtn}
                      onClick={e => { e.stopPropagation(); removeItem(item.id) }}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── EXPLORER TAB ── */}
      {tab === 'explorer' && (
        <>
          {/* Search */}
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Rechercher un aliment…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filterSeason ? styles.filterActive : ''}`}
              onClick={() => setFilterSeason(v => !v)}
            >
              🌿 En saison
            </button>
            <button
              className={`${styles.filterBtn} ${filterSafe ? styles.filterActive : ''}`}
              onClick={() => setFilterSafe(v => !v)}
            >
              ✓ Sans restriction
            </button>
          </div>

          {/* Grouped list */}
          {grouped.size === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🔍</span>
              <p>Aucun résultat</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([catId, vegetaux]) => {
              const cat = CATEGORIES.find(c => c.id === catId)
              return (
                <div key={catId} className={styles.catGroup}>
                  <div className={styles.catTitle}>
                    <span>{cat?.emoji ?? '🌿'}</span>
                    <span>{cat?.nom ?? catId}</span>
                    <span className={styles.catCount}>{vegetaux.length}</span>
                  </div>
                  {vegetaux.map(v => {
                    const badge = RESTRICTION_BADGE[v.restriction]
                    const inList = inListIds.has(v.id)
                    const inSeason = isInSeason(v, season)
                    return (
                      <div key={v.id} className={styles.explorerItem}>
                        <div className={styles.explorerInfo}>
                          <span className={styles.explorerName}>{v.nom}</span>
                          <div className={styles.explorerMeta}>
                            <span
                              className={styles.restrictionBadge}
                              style={{ color: badge.color, borderColor: badge.color }}
                            >
                              {badge.label}
                            </span>
                            {v.saisonnalite && (
                              <span className={`${styles.seasonBadge} ${inSeason ? styles.seasonOk : styles.seasonOut}`}>
                                {inSeason ? '🌿 En saison' : `⏳ ${v.saisonnalite}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className={`${styles.addBtn} ${inList ? styles.addBtnDone : ''}`}
                          onClick={() => !inList && addToList(v.id)}
                          disabled={inList}
                        >
                          {inList ? '✓' : '+'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </>
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import type { CategorieId } from '../../data/vegetaux'
import styles from './SearchBar.module.css'

type SortOption = 'categorie' | 'alpha' | 'restriction'
type FilterOption = 'tous' | CategorieId

const SORT_LABELS: Record<SortOption, string> = {
  categorie: 'Catégorie',
  alpha: 'A → Z',
  restriction: 'Restriction',
}

const FILTER_LABELS: Record<string, string> = {
  tous: 'Toutes',
  aromatiques: 'Aromatiques',
  potageres: 'Potagères',
  sauvages: 'Sauvages',
  branchages: 'Branchages',
  salades: 'Salades',
  racines: 'Racines',
  fruits: 'Fruits',
}

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  sort: SortOption
  onSortChange: (sort: SortOption) => void
  filter: FilterOption
  onFilterChange: (filter: FilterOption) => void
  allCollapsed: boolean
  onToggleCollapseAll: () => void
}

export default function SearchBar({
  value, onChange, sort, onSortChange, filter, onFilterChange,
  allCollapsed, onToggleCollapseAll,
}: SearchBarProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  return (
    <div className={styles.bar}>
      {/* Search row */}
      <div className={styles.row}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className={styles.input}
            placeholder="Rechercher un aliment…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {value && (
            <button className={styles.clear} onClick={() => onChange('')}>
              ✕
            </button>
          )}
        </div>

        {/* Collapse all button — standalone */}
        <button
          className={styles.collapseBtn}
          onClick={onToggleCollapseAll}
          title={allCollapsed ? 'Tout déplier' : 'Tout replier'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            {allCollapsed ? (
              <path d="M4 8l4 4 4-4M12 8l4 4 4-4" />
            ) : (
              <path d="M4 12l4-4 4 4M12 12l4-4 4 4" />
            )}
          </svg>
        </button>

        {/* Sort / Filter trigger */}
        <div className={styles.menuWrap} ref={menuRef}>
          <button className={styles.sortBtn} onClick={() => setShowMenu(!showMenu)}>
            <span className={styles.sortLabel}>Trier par :</span>
            <span className={styles.sortValue}>{SORT_LABELS[sort]}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showMenu && (
            <div className={styles.dropdown}>
              <p className={styles.dropdownTitle}>Trier par</p>
              {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                <button
                  key={s}
                  className={`${styles.dropdownItem} ${sort === s ? styles.dropdownActive : ''}`}
                  onClick={() => { onSortChange(s); setShowMenu(false) }}
                >
                  {SORT_LABELS[s]}
                </button>
              ))}

              <div className={styles.dropdownDivider} />
              <p className={styles.dropdownTitle}>Filtrer par catégorie</p>
              {Object.entries(FILTER_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`${styles.dropdownItem} ${filter === key ? styles.dropdownActive : ''}`}
                  onClick={() => { onFilterChange(key as FilterOption); setShowMenu(false) }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

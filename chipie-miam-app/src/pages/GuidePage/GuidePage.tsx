import { useState, useMemo, useCallback } from 'react'
import SearchBar from '../../components/SearchBar/SearchBar'
import CategorySection from '../../components/CategorySection/CategorySection'
import VegetalCard from '../../components/VegetalCard/VegetalCard'
import AddEntryModal from '../../components/AddEntryModal/AddEntryModal'
import { VEGETAUX, CATEGORIES, type CategorieId } from '../../data/vegetaux'
import { useCustomImages } from '../../hooks/useCustomImages'
import { useCollapseState } from '../../hooks/useCollapseState'
import { useJournal } from '../../hooks/useJournal'
import { todayStr, formatDateFr } from '../../utils/dates'
import styles from './GuidePage.module.css'

type SortOption = 'categorie' | 'alpha' | 'restriction'
type FilterOption = 'tous' | CategorieId

export default function GuidePage() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('categorie')
  const [filter, setFilter] = useState<FilterOption>('tous')
  const [modalVegetalId, setModalVegetalId] = useState<string | null>(null)

  const { openCategories, allCollapsed, toggleCategory, toggleCollapseAll } = useCollapseState()
  const { getImage, setImage } = useCustomImages()
  const { entries, addEntry, removeEntry, getEntriesForDate } = useJournal()

  const today = todayStr()
  const todayEntries = useMemo(() => getEntriesForDate(today), [entries, today])

  // Count per vegetal for today
  const todayCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    todayEntries.forEach((e) => {
      counts[e.vegetalId] = (counts[e.vegetalId] || 0) + 1
    })
    return counts
  }, [todayEntries])

  const handleAddClick = useCallback((vegetalId: string) => {
    setModalVegetalId(vegetalId)
  }, [])

  const handleRemoveClick = useCallback((vegetalId: string) => {
    // Remove the most recent entry for this vegetal today
    const todayForVeg = todayEntries
      .filter(e => e.vegetalId === vegetalId)
      .sort((a, b) => b.timestamp - a.timestamp)
    if (todayForVeg.length > 0) {
      removeEntry(todayForVeg[0].id)
    }
  }, [todayEntries, removeEntry])

  const handleModalAdd = useCallback((vegetalId: string, quantite: string, notes: string) => {
    addEntry({ vegetalId, date: today, quantite, notes })
  }, [addEntry, today])

  const filtered = useMemo(() => {
    let result = VEGETAUX

    if (search.trim()) {
      const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      result = result.filter((v) => {
        const nom = v.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const latin = v.nomLatin.toLowerCase()
        return nom.includes(q) || latin.includes(q)
      })
    }

    if (filter !== 'tous') {
      result = result.filter((v) => v.categorie === filter)
    }

    if (sort === 'alpha') {
      result = [...result].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    } else if (sort === 'restriction') {
      const order = { a_eviter: 0, petite_quantite: 1, aucune: 2 }
      result = [...result].sort((a, b) => order[a.restriction] - order[b.restriction])
    }

    return result
  }, [search, filter, sort])

  const showByCategory = sort === 'categorie'

  const renderCard = (v: typeof VEGETAUX[number]) => (
    <VegetalCard
      key={v.id}
      vegetal={v}
      imageUrl={getImage(v.id, v.image)}
      todayCount={todayCounts[v.id] || 0}
      onAddToJournal={handleAddClick}
      onRemoveFromJournal={handleRemoveClick}
      onChangeImage={setImage}
    />
  )

  return (
    <div className={styles.page}>
      <SearchBar
        value={search}
        onChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        filter={filter}
        onFilterChange={setFilter}
        allCollapsed={allCollapsed}
        onToggleCollapseAll={toggleCollapseAll}
      />

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔍</span>
          <p>Aucun aliment trouvé pour « {search} »</p>
        </div>
      ) : showByCategory ? (
        CATEGORIES.map((cat) => {
          const items = filtered.filter((v) => v.categorie === cat.id)
          return (
            <CategorySection
              key={cat.id}
              categorie={cat}
              vegetaux={items}
              open={openCategories.has(cat.id)}
              onToggle={() => toggleCategory(cat.id)}
            >
              {items.map(renderCard)}
            </CategorySection>
          )
        })
      ) : (
        <div className={styles.flatList}>
          {filtered.map(renderCard)}
        </div>
      )}

      {modalVegetalId && (
        <AddEntryModal
          date={formatDateFr(today)}
          preSelectedId={modalVegetalId}
          onAdd={handleModalAdd}
          onClose={() => setModalVegetalId(null)}
        />
      )}
    </div>
  )
}

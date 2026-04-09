import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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

// ===== Season helpers =====
type SeasonName = 'Printemps' | 'Ete' | 'Automne' | 'Hiver'

function getCurrentSeason(): SeasonName {
  const month = new Date().getMonth() // 0-11
  if (month >= 2 && month <= 4) return 'Printemps'
  if (month >= 5 && month <= 7) return 'Ete'
  if (month >= 8 && month <= 10) return 'Automne'
  return 'Hiver'
}

const SEASON_LABELS: Record<SeasonName, string> = {
  Printemps: 'Printemps',
  Ete: '\u00c9t\u00e9',
  Automne: 'Automne',
  Hiver: 'Hiver',
}

function isInSeason(saisonnalite: string | undefined, season: SeasonName): boolean {
  if (!saisonnalite) return true // no data = always show
  const s = saisonnalite.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (s.includes("toute l'annee") || s.includes('toute l')) return true
  const seasonMap: Record<SeasonName, string[]> = {
    Printemps: ['printemps'],
    Ete: ['ete'],
    Automne: ['automne'],
    Hiver: ['hiver'],
  }
  return seasonMap[season].some(keyword => s.includes(keyword))
}

const TIPS = [
  '🥬 Un lapin doit manger chaque jour une quantité de verdure équivalente à la taille de sa tête.',
  '💧 Les légumes frais apportent de l\'eau en complément du biberon.',
  '🌿 Variez les aromatiques pour stimuler l\'appétit de votre lapin.',
  '⚠️ Introduisez toujours un nouvel aliment progressivement sur plusieurs jours.',
  '🥕 Les légumes racines sont riches en sucre, à donner avec modération.',
  '🍎 Les fruits sont des friandises, pas un repas : max 1-2 fois par semaine.',
  '🌾 Le foin doit rester la base de l\'alimentation (80% de la ration).',
  '🧹 Retirez les légumes non consommés après 4h pour éviter la fermentation.',
  '🌱 Les fanes de carottes sont excellentes et plus saines que la carotte elle-même.',
  '🐰 Un lapin adulte a besoin d\'au moins 5 végétaux différents par semaine.',
  '🌿 Le persil est très riche en calcium, à alterner avec d\'autres herbes.',
  '❄️ Ne donnez jamais de légumes sortis directement du réfrigérateur, laissez-les revenir à température ambiante.',
  '🌳 Les branches d\'arbres fruitiers sont excellentes pour l\'usure des dents.',
  '🥗 La roquette et le pissenlit sont parmi les aliments préférés des lapins.',
]

export default function GuidePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('categorie')
  const [filter, setFilter] = useState<FilterOption>('tous')
  const [seasonFilter, setSeasonFilter] = useState(false)
  const [modalVegetalId, setModalVegetalId] = useState<string | null>(null)
  const currentSeason = getCurrentSeason()

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

  // Today summary
  const todayTotal = todayEntries.length
  const todayUniqueCount = new Set(todayEntries.map(e => e.vegetalId)).size
  const todayCategoryCount = new Set(todayEntries.map(e => {
    const v = VEGETAUX.find(vv => vv.id === e.vegetalId)
    return v?.categorie
  }).filter(Boolean)).size

  // Tip of the day (changes daily based on date)
  const tipIndex = useMemo(() => {
    const d = new Date()
    return (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % TIPS.length
  }, [])
  const dailyTip = TIPS[tipIndex]

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

    if (seasonFilter) {
      result = result.filter((v) => isInSeason(v.saisonnalite, currentSeason))
    }

    if (sort === 'alpha') {
      result = [...result].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    } else if (sort === 'restriction') {
      const order = { a_eviter: 0, petite_quantite: 1, aucune: 2 }
      result = [...result].sort((a, b) => order[a.restriction] - order[b.restriction])
    }

    return result
  }, [search, filter, sort, seasonFilter, currentSeason])

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
        seasonFilter={seasonFilter}
        onSeasonFilterChange={setSeasonFilter}
        currentSeason={SEASON_LABELS[currentSeason]}
      />

      {seasonFilter && (
        <div className={styles.seasonBanner}>
          <span>🌿 Aliments de saison : <strong>{SEASON_LABELS[currentSeason]}</strong></span>
          <span className={styles.seasonCount}>{filtered.length} aliments</span>
        </div>
      )}

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

      {/* Essentials + Today summary */}
      <div className={styles.summarySection}>
        <div className={styles.essentialsCard}>
          <span className={styles.essentialsTitle}>🐰 Les essentiels au quotidien</span>
          <div className={styles.essentialsList}>
            <div className={styles.essentialItem}>
              <span className={styles.essentialIcon}>🥬</span>
              <span>100g de végétaux frais par jour (matin et soir)</span>
            </div>
            <div className={styles.essentialItem}>
              <span className={styles.essentialIcon}>🌾</span>
              <span>Du foin à volonté, toujours à disposition</span>
            </div>
            <div className={styles.essentialItem}>
              <span className={styles.essentialIcon}>💧</span>
              <span>Une gamelle d'eau fraîche et propre en permanence</span>
            </div>
          </div>
          <button className={styles.dangerLink} onClick={() => navigate('/danger')}>
            ⚠️ Voir les aliments dangereux
          </button>
          <button className={styles.encyclopediaLink} onClick={() => navigate('/encyclopedie')}>
            📖 Encyclopédie lapin
          </button>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <span className={styles.summaryEmoji}>📋</span>
            <span className={styles.summaryTitle}>Aujourd'hui</span>
          </div>
          {todayTotal === 0 ? (
            <p className={styles.summaryEmpty}>Aucun aliment enregistré aujourd'hui. Appuyez sur + pour commencer !</p>
          ) : (
            <div className={styles.summaryStats}>
              <div className={styles.stat}>
                <span className={styles.statNum}>{todayTotal}</span>
                <span className={styles.statLabel}>portion{todayTotal > 1 ? 's' : ''}</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>{todayUniqueCount}</span>
                <span className={styles.statLabel}>aliment{todayUniqueCount > 1 ? 's' : ''}</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>{todayCategoryCount}</span>
                <span className={styles.statLabel}>catégorie{todayCategoryCount > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.tipCard}>
          <div className={styles.tipHeader}>
            <span className={styles.tipLabel}>💡 Conseil du jour</span>
          </div>
          <p className={styles.tipText}>{dailyTip}</p>
        </div>

      </div>

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

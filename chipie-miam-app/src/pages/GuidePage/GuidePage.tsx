import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '../../components/SearchBar/SearchBar'
import BonjourChipie from '../../components/BonjourChipie/BonjourChipie'
import CategorySection from '../../components/CategorySection/CategorySection'
import VegetalCard from '../../components/VegetalCard/VegetalCard'
import AddEntryModal from '../../components/AddEntryModal/AddEntryModal'
import { VEGETAUX, CATEGORIES, type CategorieId, type Vegetal } from '../../data/vegetaux'
import { searchVegetaux } from '../../utils/textSearch'
import { useCustomImages } from '../../hooks/useCustomImages'
import { useCollapseState } from '../../hooks/useCollapseState'
import { useJournal } from '../../hooks/useJournal'
import { todayStr, formatDateFr } from '../../utils/dates'
import styles from './GuidePage.module.css'

type ChipId = 'aucune' | 'petite_quantite' | 'a_eviter' | 'nouveau'
const CHIPS: ReadonlyArray<{ id: ChipId; label: string; dot: string }> = [
  { id: 'aucune', label: 'À volonté', dot: '#4cd964' },
  { id: 'petite_quantite', label: 'Avec modération', dot: '#f5a623' },
  { id: 'a_eviter', label: 'À éviter', dot: '#ff5a5f' },
  { id: 'nouveau', label: 'Pas encore mangé', dot: '#af8cff' },
]

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

// ── Checklist quotidienne ──────────────────────────────────────────────────
const CHECKLIST_ITEMS = [
  { id: 'foin',   label: 'Foin renouvelé',   emoji: '🌾' },
  { id: 'eau',    label: 'Eau fraîche',       emoji: '💧' },
  { id: 'legumes',label: 'Légumes donnés',    emoji: '🥕' },
  { id: 'sortie', label: 'Sortie de cage',    emoji: '🐇' },
]

function loadChecklist(today: string): Set<string> {
  try {
    const raw = localStorage.getItem(`chipie-checklist-${today}`)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function saveChecklist(today: string, checked: Set<string>) {
  localStorage.setItem(`chipie-checklist-${today}`, JSON.stringify([...checked]))
}

export default function GuidePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('categorie')
  const [filter, setFilter] = useState<FilterOption>('tous')
  const [seasonFilter, setSeasonFilter] = useState(false)
  const [chips, setChips] = useState<Set<ChipId>>(new Set())
  const [modalVegetalId, setModalVegetalId] = useState<string | null>(null)
  const currentSeason = getCurrentSeason()

  const { openCategories, allCollapsed, toggleCategory, toggleCollapseAll } = useCollapseState()
  const { getImage, setImage } = useCustomImages()
  const { entries, addEntry, removeEntry, getEntriesForDate } = useJournal()

  const today = todayStr()
  const todayEntries = useMemo(() => getEntriesForDate(today), [entries, today])

  // Checklist state
  const [checked, setChecked] = useState<Set<string>>(() => loadChecklist(today))
  useEffect(() => { saveChecklist(today, checked) }, [checked, today])
  const allDone = checked.size === CHECKLIST_ITEMS.length
  const toggleCheck = useCallback((id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Aliments déjà donnés à Chipie (tout le journal) — les aliments « à éviter » ne comptent jamais comme à goûter
  const tastedIds = useMemo(() => new Set(entries.map(e => e.vegetalId)), [entries])
  const tastable = useMemo(() => VEGETAUX.filter(v => v.restriction !== 'a_eviter'), [])
  const tastedCount = useMemo(() => tastable.filter(v => tastedIds.has(v.id)).length, [tastable, tastedIds])
  const progressByCat = useMemo(() => {
    const out: Record<string, { done: number; total: number }> = {}
    for (const v of tastable) {
      const p = out[v.categorie] ?? (out[v.categorie] = { done: 0, total: 0 })
      p.total++
      if (tastedIds.has(v.id)) p.done++
    }
    return out
  }, [tastable, tastedIds])

  const toggleChip = useCallback((id: ChipId) => {
    setChips(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

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

  // Recherche tol\u00e9rante : accents, pluriels, fautes de frappe, synonymes (\u00ab doucette \u00bb \u2192 m\u00e2che)
  const searchResult = useMemo(
    () => (search.trim() ? searchVegetaux(search, VEGETAUX) : null),
    [search],
  )

  const filtered = useMemo(() => {
    let result: readonly Vegetal[] = searchResult ? searchResult.results.map(r => r.vegetal) : VEGETAUX

    if (filter !== 'tous') {
      result = result.filter((v) => v.categorie === filter)
    }

    if (seasonFilter) {
      result = result.filter((v) => isInSeason(v.saisonnalite, currentSeason))
    }

    // Pastilles : les niveaux de restriction s'additionnent (« à volonté » OU « modération »),
    // « pas encore mangé » restreint ensuite la liste
    const levels = (['aucune', 'petite_quantite', 'a_eviter'] as const).filter(l => chips.has(l))
    if (levels.length > 0) result = result.filter(v => levels.includes(v.restriction))
    if (chips.has('nouveau')) result = result.filter(v => !tastedIds.has(v.id) && v.restriction !== 'a_eviter')

    if (sort === 'alpha') {
      result = [...result].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    } else if (sort === 'restriction') {
      const order = { a_eviter: 0, petite_quantite: 1, aucune: 2 }
      result = [...result].sort((a, b) => order[a.restriction] - order[b.restriction])
    }

    return result
  }, [searchResult, filter, sort, seasonFilter, currentSeason, chips, tastedIds])

  // Pendant une recherche, les résultats restent classés par pertinence (pas regroupés par catégorie)
  const showByCategory = sort === 'categorie' && !searchResult

  const renderCard = (v: typeof VEGETAUX[number]) => (
    <VegetalCard
      key={v.id}
      vegetal={v}
      imageUrl={getImage(v.id, v.image)}
      todayCount={todayCounts[v.id] || 0}
      isNew={!tastedIds.has(v.id) && v.restriction !== 'a_eviter'}
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
      >
        <div className={styles.chips} role="group" aria-label="Filtres">
          <button
            className={`${styles.chip} ${seasonFilter ? styles.chipOn : ''}`}
            aria-pressed={seasonFilter}
            onClick={() => setSeasonFilter(s => !s)}
          >
            <span className={styles.chipDot} style={{ background: '#5ac8fa' }} />De saison
          </button>
          {CHIPS.map(c => (
            <button
              key={c.id}
              className={`${styles.chip} ${chips.has(c.id) ? styles.chipOn : ''}`}
              aria-pressed={chips.has(c.id)}
              onClick={() => toggleChip(c.id)}
            >
              <span className={styles.chipDot} style={{ background: c.dot }} />{c.label}
            </button>
          ))}
          {(chips.size > 0 || seasonFilter) && (
            <button className={styles.chipReset} onClick={() => { setChips(new Set()); setSeasonFilter(false) }}>Effacer</button>
          )}
        </div>
      </SearchBar>

      <div className={styles.tastedCard}>
        <span className={styles.tastedText}>
          🐰 Chipie a goûté <strong>{tastedCount}</strong> aliment{tastedCount > 1 ? 's' : ''} sur {tastable.length}
        </span>
        <span className={styles.tastedTrack}>
          <span className={styles.tastedFill} style={{ width: `${Math.round((tastedCount / tastable.length) * 100)}%` }} />
        </span>
      </div>

      {seasonFilter && (
        <div className={styles.seasonBanner}>
          <span>🌿 Aliments de saison : <strong>{SEASON_LABELS[currentSeason]}</strong></span>
          <span className={styles.seasonCount}>{filtered.length} aliments</span>
        </div>
      )}

      {searchResult && filtered.length > 0 && !searchResult.exact && (
        <p className={styles.searchHint}>
          Pas de correspondance exacte pour « {search} » : voici les résultats les plus proches.
        </p>
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
              progress={progressByCat[cat.id]}
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
        <BonjourChipie
          todayTotal={todayTotal}
          checkedCount={checked.size}
          checklistTotal={CHECKLIST_ITEMS.length}
        />
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
          <button className={styles.encyclopediaLink} onClick={() => navigate('/conseils-saison')}>
            🍃 Conseils de saison
          </button>
          <button className={styles.encyclopediaLink} onClick={() => navigate('/foin')}>
            🌾 Stock de foin
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

        <div className={`${styles.checklistCard} ${allDone ? styles.checklistDone : ''}`}>
          <div className={styles.checklistHeader}>
            <span className={styles.checklistTitle}>✅ Checklist du jour</span>
            {allDone && <span className={styles.checklistBadge}>Tout fait ! 🎉</span>}
          </div>
          <div className={styles.checklistItems}>
            {CHECKLIST_ITEMS.map(item => (
              <button
                key={item.id}
                className={`${styles.checkItem} ${checked.has(item.id) ? styles.checkItemDone : ''}`}
                onClick={() => toggleCheck(item.id)}
              >
                <span className={styles.checkItemEmoji}>{item.emoji}</span>
                <span className={styles.checkItemLabel}>{item.label}</span>
                <span className={styles.checkItemBox}>{checked.has(item.id) ? '✓' : ''}</span>
              </button>
            ))}
          </div>
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

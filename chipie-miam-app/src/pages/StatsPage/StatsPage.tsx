import { useMemo } from 'react'
import { useJournal } from '../../hooks/useJournal'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { todayStr } from '../../utils/dates'
import { assetUrl } from '../../utils/assetUrl'
import styles from './StatsPage.module.css'

const vegetauxMap = new Map(VEGETAUX.map((v) => [v.id, v]))
const catMap = new Map(CATEGORIES.map((c) => [c.id, c]))

export default function StatsPage() {
  const { entries, getEntriesForWeek, getUniqueVegetauxCount } = useJournal()

  const weekEntries = useMemo(() => getEntriesForWeek(todayStr()), [entries])
  const uniqueThisWeek = getUniqueVegetauxCount(weekEntries)
  const totalEntries = entries.length

  // Category breakdown for this week
  const catBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    weekEntries.forEach((e) => {
      const v = vegetauxMap.get(e.vegetalId)
      if (v) counts[v.categorie] = (counts[v.categorie] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([catId, count]) => ({
        categorie: catMap.get(catId as any),
        count,
      }))
  }, [weekEntries])

  const maxCount = catBreakdown.length > 0 ? Math.max(...catBreakdown.map((c) => c.count)) : 1

  // Most given vegetables (all time)
  const topVegetaux = useMemo(() => {
    const counts: Record<string, number> = {}
    entries.forEach((e) => {
      counts[e.vegetalId] = (counts[e.vegetalId] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        vegetal: vegetauxMap.get(id),
        count,
      }))
  }, [entries])

  // Fruits count this week
  const fruitsThisWeek = weekEntries.filter((e) => {
    const v = vegetauxMap.get(e.vegetalId)
    return v?.categorie === 'fruits'
  }).length

  return (
    <div className={styles.page}>
      {/* Summary cards */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardValue}>{weekEntries.length}</span>
          <span className={styles.cardLabel}>Repas cette semaine</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{uniqueThisWeek}</span>
          <span className={styles.cardLabel}>Végétaux différents</span>
        </div>
        <div className={styles.card}>
          <span className={`${styles.cardValue} ${fruitsThisWeek > 7 ? styles.warning : ''}`}>
            {fruitsThisWeek}
          </span>
          <span className={styles.cardLabel}>Fruits (sucre)</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{totalEntries}</span>
          <span className={styles.cardLabel}>Total historique</span>
        </div>
      </div>

      {/* Category chart */}
      {catBreakdown.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Répartition par catégorie</h2>
          <div className={styles.chart}>
            {catBreakdown.map(({ categorie, count }) => (
              <div key={categorie?.id} className={styles.barRow}>
                <span className={styles.barLabel}>
                  {categorie?.emoji} {categorie?.nom}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className={styles.barCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top vegetables */}
      {topVegetaux.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Les favoris de Chipie</h2>
          <div className={styles.topList}>
            {topVegetaux.map(({ vegetal, count }, i) => {
              if (!vegetal) return null
              return (
                <div key={vegetal.id} className={styles.topItem}>
                  <span className={styles.topRank}>#{i + 1}</span>
                  <img src={assetUrl(vegetal.image)} alt="" className={styles.topImg} />
                  <span className={styles.topName}>{vegetal.nom}</span>
                  <span className={styles.topCount}>{count}x</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📊</span>
          <p>Commencez à enregistrer les repas de Chipie pour voir les statistiques</p>
        </div>
      )}
    </div>
  )
}

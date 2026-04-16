import { useMemo, useState } from 'react'
import { useJournal } from '../../hooks/useJournal'
import { useProfil } from '../../hooks/useProfil'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { todayStr, addDays } from '../../utils/dates'
import { assetUrl } from '../../utils/assetUrl'
import styles from './StatsPage.module.css'

const vegetauxMap = new Map(VEGETAUX.map((v) => [v.id, v]))
const catMap = new Map(CATEGORIES.map((c) => [c.id, c]))

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_LABELS[d.getDay()]
}

function getDayNum(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').getDate().toString()
}

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - ((day + 6) % 7))
  return d.toISOString().split('T')[0]
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

function uniqueCount(entries: { vegetalId: string }[]): number {
  return new Set(entries.map(e => e.vegetalId)).size
}

type HistoryView = 'days' | 'weeks'

export default function StatsPage() {
  const { entries, getEntriesForWeek, getUniqueVegetauxCount } = useJournal()
  const { profil } = useProfil()
  const rabbitName = profil.nom || 'mon lapin'
  const [historyView, setHistoryView] = useState<HistoryView>('days')

  const today = todayStr()
  const weekEntries = useMemo(() => getEntriesForWeek(today), [entries, today, getEntriesForWeek])
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
        categorie: catMap.get(catId as never),
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

  // ===== History: 7 last days =====
  const dailyData = useMemo(() => {
    const data: { date: string; label: string; day: string; count: number; unique: number; isToday: boolean }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = addDays(today, -i)
      const dayEntries = entries.filter(e => e.date === date)
      data.push({
        date,
        label: getDayLabel(date),
        day: getDayNum(date),
        count: dayEntries.length,
        unique: uniqueCount(dayEntries),
        isToday: i === 0,
      })
    }
    return data
  }, [entries, today])

  const dailyMax = Math.max(1, ...dailyData.map(d => d.count))

  // ===== History: 4 last weeks =====
  const weeklyData = useMemo(() => {
    const data: { weekStart: string; label: string; count: number; unique: number; isCurrent: boolean }[] = []
    for (let i = 3; i >= 0; i--) {
      const refDate = addDays(today, -i * 7)
      const weekStart = getMondayOf(refDate)
      const wEntries = getEntriesForWeek(weekStart)
      data.push({
        weekStart,
        label: `Sem. du ${formatShortDate(weekStart)}`,
        count: wEntries.length,
        unique: uniqueCount(wEntries),
        isCurrent: i === 0,
      })
    }
    return data
  }, [entries, today, getEntriesForWeek])

  const weeklyMax = Math.max(1, ...weeklyData.map(w => w.count))

  // Trend: compare current week to previous
  const trend = useMemo(() => {
    if (weeklyData.length < 2) return 0
    const current = weeklyData[weeklyData.length - 1].count
    const previous = weeklyData[weeklyData.length - 2].count
    if (current > previous) return 1
    if (current < previous) return -1
    return 0
  }, [weeklyData])

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
          <span className={styles.cardLabel}>Vegetaux differents</span>
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

      {/* ===== History charts ===== */}
      {entries.length > 0 && (
        <div className={styles.section}>
          <div className={styles.historyHeader}>
            <h2 className={styles.sectionTitle}>Historique</h2>
            <div className={styles.toggle}>
              <button
                className={`${styles.toggleBtn} ${historyView === 'days' ? styles.toggleActive : ''}`}
                onClick={() => setHistoryView('days')}
              >7 jours</button>
              <button
                className={`${styles.toggleBtn} ${historyView === 'weeks' ? styles.toggleActive : ''}`}
                onClick={() => setHistoryView('weeks')}
              >4 semaines</button>
            </div>
          </div>

          {/* Legend */}
          <div className={styles.histLegend}>
            <span className={styles.histLegendItem}>
              <span className={styles.histLegendDot} style={{ background: 'var(--accent-orange)' }} />
              Repas
            </span>
            <span className={styles.histLegendItem}>
              <span className={styles.histLegendDot} style={{ background: 'var(--accent-violet, #B07CFF)' }} />
              Uniques
            </span>
            {historyView === 'weeks' && trend !== 0 && (
              <span className={`${styles.trendBadge} ${trend > 0 ? styles.trendUp : styles.trendDown}`}>
                {trend > 0 ? '↗' : '↘'} {trend > 0 ? 'En hausse' : 'En baisse'}
              </span>
            )}
          </div>

          {/* 7 days vertical bars */}
          {historyView === 'days' && (
            <div className={styles.dailyChart}>
              {dailyData.map(d => (
                <div key={d.date} className={`${styles.dailyCol} ${d.isToday ? styles.dailyToday : ''}`}>
                  <div className={styles.dailyBars}>
                    <div className={styles.dailyBarWrap} style={{ height: 100 }}>
                      <div
                        className={styles.dailyBar}
                        style={{ height: `${(d.count / dailyMax) * 100}%` }}
                      />
                      <div
                        className={styles.dailyBarUnique}
                        style={{ height: `${(d.unique / dailyMax) * 100}%` }}
                      />
                    </div>
                  </div>
                  {d.count > 0 && <span className={styles.dailyCount}>{d.count}</span>}
                  <span className={styles.dailyLabel}>{d.label}</span>
                  <span className={styles.dailyDay}>{d.day}</span>
                </div>
              ))}
            </div>
          )}

          {/* 4 weeks horizontal bars */}
          {historyView === 'weeks' && (
            <div className={styles.weeklyChart}>
              {weeklyData.map(w => (
                <div key={w.weekStart} className={`${styles.weeklyRow} ${w.isCurrent ? styles.weeklyCurrent : ''}`}>
                  <span className={styles.weeklyLabel}>{w.label}</span>
                  <div className={styles.weeklyBarTrack}>
                    <div
                      className={styles.weeklyBar}
                      style={{ width: `${(w.count / weeklyMax) * 100}%` }}
                    />
                    <div
                      className={styles.weeklyBarUnique}
                      style={{ width: `${(w.unique / weeklyMax) * 100}%` }}
                    />
                  </div>
                  <div className={styles.weeklyNums}>
                    <span className={styles.weeklyCount}>{w.count}</span>
                    <span className={styles.weeklyUnique}>{w.unique}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category chart */}
      {catBreakdown.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Repartition par categorie</h2>
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
          <h2 className={styles.sectionTitle}>Les favoris de {rabbitName}</h2>
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
          <p>Commencez à enregistrer les repas de {rabbitName} pour voir les statistiques</p>
        </div>
      )}
    </div>
  )
}

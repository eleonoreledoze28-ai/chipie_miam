import { useState, useMemo } from 'react'
import { useJournal } from '../../hooks/useJournal'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import AddEntryModal from '../../components/AddEntryModal/AddEntryModal'
import {
  todayStr, addDays, addMonths,
  formatDateFr, formatMonthFr,
  getWeekDays, getMonthDays, formatDateShort,
} from '../../utils/dates'
import styles from './JournalPage.module.css'

type ViewMode = 'day' | 'week' | 'month'

const vegetauxMap = new Map(VEGETAUX.map((v) => [v.id, v]))

const JOURS_HEADER = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export default function JournalPage() {
  const { entries, addEntry, removeEntry, getEntriesForDate, getEntriesForWeek, getUniqueVegetauxCount } = useJournal()
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [showModal, setShowModal] = useState(false)
  const [view, setView] = useState<ViewMode>('week')

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate])
  const dayEntries = useMemo(() => getEntriesForDate(selectedDate), [selectedDate, entries])
  const weekEntries = useMemo(() => getEntriesForWeek(selectedDate), [selectedDate, entries])
  const uniqueCount = getUniqueVegetauxCount(weekEntries)

  // Current month for month view
  const selectedMonth = selectedDate.slice(0, 7) // YYYY-MM

  // Set of dates with entries for indicators
  const datesWithEntries = useMemo(() => {
    const set = new Set<string>()
    entries.forEach((e) => set.add(e.date))
    return set
  }, [entries])

  // Week category breakdown
  const weekBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    weekEntries.forEach(e => {
      const v = vegetauxMap.get(e.vegetalId)
      if (v) {
        const cat = CATEGORIES.find(c => c.id === v.categorie)
        if (cat) counts[cat.nom] = (counts[cat.nom] || 0) + 1
      }
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [weekEntries])

  const weekTotal = weekEntries.length
  const varietyGoal = 5
  const varietyProgress = Math.min(uniqueCount / varietyGoal, 1)

  // Alerts
  const fruitsThisWeek = weekEntries.filter((e) => {
    const v = vegetauxMap.get(e.vegetalId)
    return v?.categorie === 'fruits'
  }).length

  const alerts: string[] = []
  if (fruitsThisWeek > 7) alerts.push(`⚠️ ${fruitsThisWeek} fruits cette semaine — attention au sucre !`)
  if (weekEntries.length > 5 && uniqueCount < 3) alerts.push('🥬 Pensez à varier les végétaux !')

  const handleAdd = (vegetalId: string, quantite: string, notes: string) => {
    addEntry({ vegetalId, date: selectedDate, quantite, notes })
  }

  // Navigation helpers
  const navPrev = () => {
    if (view === 'day') setSelectedDate(addDays(selectedDate, -7))
    else if (view === 'week') setSelectedDate(addDays(selectedDate, -7))
    else setSelectedDate(addMonths(selectedDate, -1))
  }
  const navNext = () => {
    if (view === 'day') setSelectedDate(addDays(selectedDate, 7))
    else if (view === 'week') setSelectedDate(addDays(selectedDate, 7))
    else setSelectedDate(addMonths(selectedDate, 1))
  }

  // Navigation title
  const navTitle = view === 'month' ? formatMonthFr(selectedDate) : null

  return (
    <div className={styles.page}>
      {/* View selector */}
      <div className={styles.viewSelector}>
        {(['day', 'week', 'month'] as const).map((v) => (
          <button
            key={v}
            className={`${styles.viewBtn} ${view === v ? styles.viewBtnActive : ''}`}
            onClick={() => setView(v)}
          >
            {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
          </button>
        ))}
      </div>

      {/* Day view — list of days */}
      {view === 'day' && (
        <>
          <div className={styles.dayNav}>
            <button className={styles.weekBtn} onClick={navPrev}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <path d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className={styles.dayNavTitle}>{formatMonthFr(selectedDate)}</span>
            <button className={styles.weekBtn} onClick={navNext}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <div className={styles.dayList}>
            {weekDays.map((day) => {
              const isToday = day === todayStr()
              const isSelected = day === selectedDate
              const dayEnt = getEntriesForDate(day)
              return (
                <button
                  key={day}
                  className={`${styles.dayListItem} ${isSelected ? styles.dayListItemSelected : ''} ${isToday ? styles.dayListItemToday : ''}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={styles.dayListDate}>
                    <span className={styles.dayListNum}>{new Date(day + 'T00:00:00').getDate()}</span>
                    <span className={styles.dayListName}>{formatDateShort(day).split(' ')[0]}</span>
                  </div>
                  <div className={styles.dayListContent}>
                    {dayEnt.length === 0 ? (
                      <span className={styles.dayListEmpty}>—</span>
                    ) : (
                      <span className={styles.dayListCount}>
                        {dayEnt.length} aliment{dayEnt.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Week view */}
      {view === 'week' && (
        <div className={styles.weekNav}>
          <button className={styles.weekBtn} onClick={navPrev}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className={styles.weekDays}>
            {weekDays.map((day) => {
              const isToday = day === todayStr()
              const isSelected = day === selectedDate
              const hasEntries = datesWithEntries.has(day)
              return (
                <button
                  key={day}
                  className={`${styles.dayBtn} ${isSelected ? styles.daySelected : ''} ${isToday ? styles.dayToday : ''}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <span className={styles.dayLabel}>{formatDateShort(day).split(' ')[0]}</span>
                  <span className={styles.dayNum}>{new Date(day + 'T00:00:00').getDate()}</span>
                  {hasEntries && <span className={styles.dayDot} />}
                </button>
              )
            })}
          </div>
          <button className={styles.weekBtn} onClick={navNext}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      )}

      {/* Month view */}
      {view === 'month' && (
        <>
          <div className={styles.monthNav}>
            <button className={styles.weekBtn} onClick={navPrev}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <path d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className={styles.monthTitle}>{navTitle}</span>
            <button className={styles.weekBtn} onClick={navNext}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <div className={styles.monthGrid}>
            {JOURS_HEADER.map((j, i) => (
              <span key={i} className={styles.monthDayHeader}>{j}</span>
            ))}
            {monthDays.map((day) => {
              const isToday = day === todayStr()
              const isSelected = day === selectedDate
              const isCurrentMonth = day.slice(0, 7) === selectedMonth
              const hasEntries = datesWithEntries.has(day)
              return (
                <button
                  key={day}
                  className={`${styles.monthDay} ${isSelected ? styles.monthDaySelected : ''} ${isToday ? styles.monthDayToday : ''} ${!isCurrentMonth ? styles.monthDayOutside : ''}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <span>{new Date(day + 'T00:00:00').getDate()}</span>
                  {hasEntries && <span className={styles.monthDot} />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Date title */}
      <div className={styles.dateHeader}>
        <h2 className={styles.dateTitle}>{formatDateFr(selectedDate)}</h2>
        <div className={styles.weekSummary}>
          <span>{uniqueCount} végétal{uniqueCount > 1 ? 'ux' : ''} différent{uniqueCount > 1 ? 's' : ''} cette semaine</span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.map((alert, i) => (
        <div key={i} className={styles.alert}>{alert}</div>
      ))}

      {/* Entries */}
      <div className={styles.entries}>
        {dayEntries.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📝</span>
            <p>Aucun aliment enregistré ce jour</p>
          </div>
        ) : (
          dayEntries.map((entry) => {
            const veg = vegetauxMap.get(entry.vegetalId)
            if (!veg) return null
            return (
              <div key={entry.id} className={styles.entry}>
                <img src={assetUrl(veg.image)} alt="" className={styles.entryImg} />
                <div className={styles.entryInfo}>
                  <span className={styles.entryName}>{veg.nom}</span>
                  <span className={styles.entryQty}>{entry.quantite}</span>
                  {entry.notes && <span className={styles.entryNotes}>{entry.notes}</span>}
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => removeEntry(entry.id)}
                  aria-label="Supprimer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                    <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Week summary section */}
      <div className={styles.weekSection}>
        {/* Variety progress */}
        <div className={styles.varietyCard}>
          <div className={styles.varietyHeader}>
            <span className={styles.varietyTitle}>🎯 Objectif variété</span>
            <span className={styles.varietyCount}>{uniqueCount}/{varietyGoal}</span>
          </div>
          <div className={styles.varietyBar}>
            <div className={styles.varietyFill} style={{ width: `${varietyProgress * 100}%` }} />
          </div>
          <p className={styles.varietyHint}>
            {uniqueCount >= varietyGoal
              ? '✅ Bravo ! Objectif atteint cette semaine.'
              : `Encore ${varietyGoal - uniqueCount} végéta${varietyGoal - uniqueCount > 1 ? 'ux' : 'l'} différent${varietyGoal - uniqueCount > 1 ? 's' : ''} pour atteindre l'objectif.`}
          </p>
        </div>

        {/* Category breakdown */}
        {weekBreakdown.length > 0 && (
          <div className={styles.breakdownCard}>
            <span className={styles.breakdownTitle}>📊 Répartition de la semaine</span>
            <div className={styles.breakdownList}>
              {weekBreakdown.map(([cat, count]) => (
                <div key={cat} className={styles.breakdownRow}>
                  <span className={styles.breakdownCat}>{cat}</span>
                  <div className={styles.breakdownBarWrap}>
                    <div className={styles.breakdownBar} style={{ width: `${(count / weekTotal) * 100}%` }} />
                  </div>
                  <span className={styles.breakdownNum}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className={styles.fab} onClick={() => setShowModal(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
          <path d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {showModal && (
        <AddEntryModal
          date={formatDateFr(selectedDate)}
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

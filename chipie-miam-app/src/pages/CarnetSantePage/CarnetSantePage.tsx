import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './CarnetSantePage.module.css'

// ===== Data types =====
interface WeightEntry {
  id: string
  date: string // YYYY-MM-DD
  weight: number // grams
  notes: string
}

interface Reminder {
  id: string
  title: string
  date: string // YYYY-MM-DD
  type: 'vaccin' | 'veto' | 'soin' | 'autre'
  done: boolean
  notes: string
}

const REMINDER_TYPES = [
  { id: 'vaccin', label: 'Vaccin', emoji: '💉' },
  { id: 'veto', label: 'Vétérinaire', emoji: '🩺' },
  { id: 'soin', label: 'Soin', emoji: '✨' },
  { id: 'autre', label: 'Autre', emoji: '📋' },
] as const

// ===== Storage =====
function getWeightsKey() { return `chipie_weights_${getActiveProfileId()}` }
function getRemindersKey() { return `chipie_reminders_${getActiveProfileId()}` }

function loadWeights(): WeightEntry[] {
  try { return JSON.parse(localStorage.getItem(getWeightsKey()) || '[]') } catch { return [] }
}
function saveWeights(w: WeightEntry[]) { localStorage.setItem(getWeightsKey(), JSON.stringify(w)) }

function loadReminders(): Reminder[] {
  try { return JSON.parse(localStorage.getItem(getRemindersKey()) || '[]') } catch { return [] }
}
function saveReminders(r: Reminder[]) { localStorage.setItem(getRemindersKey(), JSON.stringify(r)) }

function todayStr(): string { return new Date().toISOString().split('T')[0] }

function formatDate(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(d: string): number {
  const now = new Date(todayStr() + 'T00:00:00')
  const target = new Date(d + 'T00:00:00')
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

type Tab = 'poids' | 'rappels'

export default function CarnetSantePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [tab, setTab] = useState<Tab>('poids')
  const [weights, setWeights] = useState(loadWeights)
  const [reminders, setReminders] = useState(loadReminders)

  // Weight form
  const [showWeightForm, setShowWeightForm] = useState(false)
  const [weightDate, setWeightDate] = useState(todayStr())
  const [weightValue, setWeightValue] = useState('')
  const [weightNotes, setWeightNotes] = useState('')

  // Reminder form
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDate, setReminderDate] = useState(todayStr())
  const [reminderType, setReminderType] = useState<Reminder['type']>('vaccin')
  const [reminderNotes, setReminderNotes] = useState('')

  // ===== Weight actions =====
  const addWeight = useCallback(() => {
    const val = parseFloat(weightValue.replace(',', '.'))
    if (isNaN(val) || val <= 0) return
    const entry: WeightEntry = {
      id: `w_${Date.now()}`,
      date: weightDate,
      weight: Math.round(val * 10) / 10,
      notes: weightNotes.trim(),
    }
    const updated = [...weights, entry].sort((a, b) => a.date.localeCompare(b.date))
    setWeights(updated)
    saveWeights(updated)
    setShowWeightForm(false)
    setWeightValue(''); setWeightNotes('')
  }, [weights, weightDate, weightValue, weightNotes])

  const removeWeight = useCallback((id: string) => {
    const updated = weights.filter(w => w.id !== id)
    setWeights(updated)
    saveWeights(updated)
  }, [weights])

  // ===== Reminder actions =====
  const addReminder = useCallback(() => {
    if (!reminderTitle.trim()) return
    const entry: Reminder = {
      id: `r_${Date.now()}`,
      title: reminderTitle.trim(),
      date: reminderDate,
      type: reminderType,
      done: false,
      notes: reminderNotes.trim(),
    }
    const updated = [...reminders, entry].sort((a, b) => a.date.localeCompare(b.date))
    setReminders(updated)
    saveReminders(updated)
    setShowReminderForm(false)
    setReminderTitle(''); setReminderNotes('')
  }, [reminders, reminderTitle, reminderDate, reminderType, reminderNotes])

  const toggleReminder = useCallback((id: string) => {
    const updated = reminders.map(r => r.id === id ? { ...r, done: !r.done } : r)
    setReminders(updated)
    saveReminders(updated)
  }, [reminders])

  const removeReminder = useCallback((id: string) => {
    const updated = reminders.filter(r => r.id !== id)
    setReminders(updated)
    saveReminders(updated)
  }, [reminders])

  // ===== Weight chart data =====
  const chartData = useMemo(() => {
    const last = weights.slice(-10)
    if (last.length === 0) return null
    const minW = Math.min(...last.map(w => w.weight))
    const maxW = Math.max(...last.map(w => w.weight))
    const range = maxW - minW || 1
    return { entries: last, minW, maxW, range }
  }, [weights])

  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null
  const weightTrend = weights.length >= 2
    ? weights[weights.length - 1].weight - weights[weights.length - 2].weight
    : 0

  // Upcoming reminders
  const upcoming = useMemo(() =>
    reminders.filter(r => !r.done).sort((a, b) => a.date.localeCompare(b.date)),
  [reminders])
  const pastDue = upcoming.filter(r => daysUntil(r.date) < 0)
  const nextUp = upcoming.filter(r => daysUntil(r.date) >= 0).slice(0, 5)

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>🩺</span>
        <h1 className={styles.title}>Carnet de santé</h1>
        <p className={styles.subtitle}>{profil.nom}</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'poids' ? styles.tabActive : ''}`} onClick={() => setTab('poids')}>
          ⚖️ Poids
        </button>
        <button className={`${styles.tab} ${tab === 'rappels' ? styles.tabActive : ''}`} onClick={() => setTab('rappels')}>
          📅 Rappels {pastDue.length > 0 && <span className={styles.badge}>{pastDue.length}</span>}
        </button>
      </div>

      {/* ===== POIDS TAB ===== */}
      {tab === 'poids' && (
        <div className={styles.tabContent}>
          {/* Current weight summary */}
          <div className={styles.weightSummary}>
            <div className={styles.currentWeight}>
              <span className={styles.weightNum}>{latestWeight ? `${latestWeight.weight}g` : '—'}</span>
              <span className={styles.weightLabel}>Dernier poids</span>
            </div>
            {latestWeight && (
              <div className={styles.weightMeta}>
                <span className={styles.weightDate}>{formatDate(latestWeight.date)}</span>
                {weightTrend !== 0 && (
                  <span className={`${styles.weightTrend} ${weightTrend > 0 ? styles.trendUp : styles.trendDown}`}>
                    {weightTrend > 0 ? '↗' : '↘'} {Math.abs(weightTrend)}g
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Weight chart */}
          {chartData && (
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Évolution du poids</h3>
              <div className={styles.chart}>
                {chartData.entries.map((w, i) => {
                  const height = ((w.weight - chartData.minW) / chartData.range) * 80 + 20
                  const isLast = i === chartData.entries.length - 1
                  return (
                    <div key={w.id} className={styles.chartCol}>
                      <span className={styles.chartValue}>{w.weight}g</span>
                      <div className={`${styles.chartBar} ${isLast ? styles.chartBarCurrent : ''}`}
                        style={{ height: `${height}%` }} />
                      <span className={styles.chartDate}>{new Date(w.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Weight history */}
          <div className={styles.historyHeader}>
            <h3 className={styles.sectionTitle}>Historique</h3>
            <button className={styles.addBtn} onClick={() => setShowWeightForm(true)}>+ Ajouter</button>
          </div>

          {showWeightForm && (
            <div className={styles.formCard}>
              <div className={styles.formRow}>
                <input type="date" className={styles.formInput} value={weightDate} onChange={e => setWeightDate(e.target.value)} />
                <input type="text" inputMode="decimal" className={styles.formInput} value={weightValue} onChange={e => setWeightValue(e.target.value)} placeholder="Poids (g)" />
              </div>
              <input type="text" className={styles.formInput} value={weightNotes} onChange={e => setWeightNotes(e.target.value)} placeholder="Notes (optionnel)" />
              <div className={styles.formActions}>
                <button className={styles.formCancel} onClick={() => setShowWeightForm(false)}>Annuler</button>
                <button className={styles.formSave} onClick={addWeight}>Enregistrer</button>
              </div>
            </div>
          )}

          {weights.length === 0 && !showWeightForm && (
            <div className={styles.empty}>
              <span>⚖️</span>
              <p>Aucune pesée enregistrée. Pesez {profil.nom} régulièrement pour suivre sa santé !</p>
            </div>
          )}

          <div className={styles.historyList}>
            {[...weights].reverse().map(w => (
              <div key={w.id} className={styles.historyItem}>
                <div className={styles.historyInfo}>
                  <span className={styles.historyWeight}>{w.weight}g</span>
                  <span className={styles.historyDate}>{formatDate(w.date)}</span>
                  {w.notes && <span className={styles.historyNotes}>{w.notes}</span>}
                </div>
                <button className={styles.deleteBtn} onClick={() => removeWeight(w.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== RAPPELS TAB ===== */}
      {tab === 'rappels' && (
        <div className={styles.tabContent}>
          {/* Past due */}
          {pastDue.length > 0 && (
            <div className={styles.pastDueSection}>
              <h3 className={styles.sectionTitleDanger}>🚨 En retard</h3>
              {pastDue.map(r => {
                const typeInfo = REMINDER_TYPES.find(t => t.id === r.type)
                return (
                  <div key={r.id} className={styles.reminderCard + ' ' + styles.reminderOverdue}>
                    <button className={styles.checkBtn} onClick={() => toggleReminder(r.id)}>☐</button>
                    <div className={styles.reminderInfo}>
                      <span className={styles.reminderTitle}>{typeInfo?.emoji} {r.title}</span>
                      <span className={styles.reminderDate}>{formatDate(r.date)} ({Math.abs(daysUntil(r.date))}j de retard)</span>
                      {r.notes && <span className={styles.reminderNotes}>{r.notes}</span>}
                    </div>
                    <button className={styles.deleteBtn} onClick={() => removeReminder(r.id)}>✕</button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Upcoming */}
          <div className={styles.historyHeader}>
            <h3 className={styles.sectionTitle}>À venir</h3>
            <button className={styles.addBtn} onClick={() => setShowReminderForm(true)}>+ Ajouter</button>
          </div>

          {showReminderForm && (
            <div className={styles.formCard}>
              <input type="text" className={styles.formInput} value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} placeholder="Titre (ex: Rappel vaccin VHD)" autoFocus />
              <div className={styles.formRow}>
                <input type="date" className={styles.formInput} value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
                <select className={styles.formInput} value={reminderType} onChange={e => setReminderType(e.target.value as Reminder['type'])}>
                  {REMINDER_TYPES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
                </select>
              </div>
              <input type="text" className={styles.formInput} value={reminderNotes} onChange={e => setReminderNotes(e.target.value)} placeholder="Notes (optionnel)" />
              <div className={styles.formActions}>
                <button className={styles.formCancel} onClick={() => setShowReminderForm(false)}>Annuler</button>
                <button className={styles.formSave} onClick={addReminder}>Enregistrer</button>
              </div>
            </div>
          )}

          {nextUp.length === 0 && pastDue.length === 0 && !showReminderForm && (
            <div className={styles.empty}>
              <span>📅</span>
              <p>Aucun rappel. Ajoutez les prochains vaccins ou rendez-vous vétérinaires !</p>
            </div>
          )}

          {nextUp.map(r => {
            const typeInfo = REMINDER_TYPES.find(t => t.id === r.type)
            const days = daysUntil(r.date)
            return (
              <div key={r.id} className={styles.reminderCard}>
                <button className={styles.checkBtn} onClick={() => toggleReminder(r.id)}>☐</button>
                <div className={styles.reminderInfo}>
                  <span className={styles.reminderTitle}>{typeInfo?.emoji} {r.title}</span>
                  <span className={styles.reminderDate}>
                    {formatDate(r.date)}
                    {days === 0 ? ' (aujourd\'hui !)' : days === 1 ? ' (demain)' : ` (dans ${days}j)`}
                  </span>
                  {r.notes && <span className={styles.reminderNotes}>{r.notes}</span>}
                </div>
                <button className={styles.deleteBtn} onClick={() => removeReminder(r.id)}>✕</button>
              </div>
            )
          })}

          {/* Done reminders */}
          {reminders.filter(r => r.done).length > 0 && (
            <>
              <h3 className={styles.sectionTitle} style={{ marginTop: 16 }}>✅ Terminés</h3>
              {reminders.filter(r => r.done).reverse().slice(0, 5).map(r => {
                const typeInfo = REMINDER_TYPES.find(t => t.id === r.type)
                return (
                  <div key={r.id} className={styles.reminderCard + ' ' + styles.reminderDone}>
                    <button className={styles.checkBtn} onClick={() => toggleReminder(r.id)}>✓</button>
                    <div className={styles.reminderInfo}>
                      <span className={styles.reminderTitleDone}>{typeInfo?.emoji} {r.title}</span>
                      <span className={styles.reminderDate}>{formatDate(r.date)}</span>
                    </div>
                    <button className={styles.deleteBtn} onClick={() => removeReminder(r.id)}>✕</button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}

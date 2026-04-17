import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './EvenementsPage.module.css'

// ── Types ────────────────────────────────────────────────────────────────────
type EventType = 'veto' | 'vaccin' | 'toilettage' | 'medicament' | 'petsitter' | 'autre'

interface ChipieEvent {
  id: string
  titre: string
  type: EventType
  date: string   // YYYY-MM-DD
  notes: string
  done: boolean
}

const EVENT_TYPES: { id: EventType; label: string; emoji: string; color: string }[] = [
  { id: 'veto',       label: 'Vétérinaire',  emoji: '🩺', color: '#5AC8FA' },
  { id: 'vaccin',     label: 'Vaccin',       emoji: '💉', color: '#4cd964' },
  { id: 'toilettage', label: 'Toilettage',   emoji: '✂️', color: '#B07CFF' },
  { id: 'medicament', label: 'Médicament',   emoji: '💊', color: '#F0A53A' },
  { id: 'petsitter',  label: 'Pet-sitter',   emoji: '🏠', color: '#ff69b4' },
  { id: 'autre',      label: 'Autre',        emoji: '📋', color: '#6E7280' },
]

const TYPE_MAP = new Map(EVENT_TYPES.map(t => [t.id, t]))

// ── Persistence ───────────────────────────────────────────────────────────────
function storageKey() { return `chipie-evenements-${getActiveProfileId()}` }
function load(): ChipieEvent[] {
  try { return JSON.parse(localStorage.getItem(storageKey()) || '[]') } catch { return [] }
}
function save(list: ChipieEvent[]) { localStorage.setItem(storageKey(), JSON.stringify(list)) }

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10) }

function daysUntil(dateStr: string): number {
  const today = new Date(todayStr() + 'T00:00:00')
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function formatDateFr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

function countdownLabel(days: number): { text: string; urgent: boolean } {
  if (days < 0)  return { text: `Il y a ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`, urgent: false }
  if (days === 0) return { text: "Aujourd'hui !", urgent: true }
  if (days === 1) return { text: 'Demain', urgent: true }
  if (days <= 7)  return { text: `Dans ${days} jours`, urgent: true }
  return { text: `Dans ${days} jours`, urgent: false }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function EvenementsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<ChipieEvent[]>(load)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [fTitre, setFTitre] = useState('')
  const [fType, setFType]   = useState<EventType>('veto')
  const [fDate, setFDate]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [fNotes, setFNotes] = useState('')

  const upcoming = useMemo(() =>
    events.filter(e => !e.done && daysUntil(e.date) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [events])

  const overdue = useMemo(() =>
    events.filter(e => !e.done && daysUntil(e.date) < 0)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [events])

  const done = useMemo(() =>
    events.filter(e => e.done)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    [events])

  const next = upcoming[0] ?? null

  const addEvent = useCallback(() => {
    if (!fTitre.trim()) return
    const e: ChipieEvent = {
      id: Date.now().toString(),
      titre: fTitre.trim(),
      type: fType,
      date: fDate,
      notes: fNotes.trim(),
      done: false,
    }
    setEvents(prev => { const n = [...prev, e]; save(n); return n })
    setShowForm(false)
    setFTitre(''); setFNotes('')
  }, [fTitre, fType, fDate, fNotes])

  const markDone = useCallback((id: string) => {
    setEvents(prev => { const n = prev.map(e => e.id === id ? { ...e, done: !e.done } : e); save(n); return n })
  }, [])

  const remove = useCallback((id: string) => {
    if (!confirm('Supprimer cet événement ?')) return
    setEvents(prev => { const n = prev.filter(e => e.id !== id); save(n); return n })
  }, [])

  const resetForm = () => {
    setFTitre(''); setFType('veto'); setFNotes('')
    const d = new Date(); d.setDate(d.getDate() + 7)
    setFDate(d.toISOString().slice(0, 10))
    setShowForm(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>+ Événement</button>
      </div>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>📅</span>
        <div>
          <h1 className={styles.title}>Événements</h1>
          <p className={styles.subtitle}>{upcoming.length} à venir</p>
        </div>
      </div>

      {/* Next event hero */}
      {next ? (
        <NextCard event={next} onDone={markDone} onDelete={remove} />
      ) : (
        <div className={styles.noNext}>
          <span>🐰</span>
          <p>Aucun événement à venir</p>
          <button className={styles.noNextBtn} onClick={() => setShowForm(true)}>Ajouter un événement</button>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <Section title="⚠️ En retard">
          {overdue.map(e => <EventRow key={e.id} event={e} onDone={markDone} onDelete={remove} />)}
        </Section>
      )}

      {/* Upcoming (skip first — already shown as hero) */}
      {upcoming.length > 1 && (
        <Section title="📆 À venir">
          {upcoming.slice(1).map(e => <EventRow key={e.id} event={e} onDone={markDone} onDelete={remove} />)}
        </Section>
      )}

      {/* Done */}
      {done.length > 0 && (
        <Section title="✅ Terminés récents">
          {done.map(e => <EventRow key={e.id} event={e} onDone={markDone} onDelete={remove} faded />)}
        </Section>
      )}

      {/* Add form overlay */}
      {showForm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Nouvel événement</span>
              <button className={styles.modalClose} onClick={resetForm}>✕</button>
            </div>

            <label className={styles.formLabel}>Type</label>
            <div className={styles.typePicker}>
              {EVENT_TYPES.map(t => (
                <button
                  key={t.id}
                  className={`${styles.typeBtn} ${fType === t.id ? styles.typeBtnActive : ''}`}
                  style={{ '--tc': t.color } as React.CSSProperties}
                  onClick={() => setFType(t.id)}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <label className={styles.formLabel}>Titre</label>
            <input
              type="text"
              className={styles.formInput}
              value={fTitre}
              placeholder="Ex : Vaccin annuel, Rdv Dr Martin…"
              onChange={e => setFTitre(e.target.value)}
              maxLength={60}
            />

            <label className={styles.formLabel}>Date</label>
            <input
              type="date"
              className={styles.formInput}
              value={fDate}
              onChange={e => setFDate(e.target.value)}
            />

            <label className={styles.formLabel}>Notes (optionnel)</label>
            <input
              type="text"
              className={styles.formInput}
              value={fNotes}
              placeholder="Informations complémentaires…"
              onChange={e => setFNotes(e.target.value)}
              maxLength={120}
            />

            <button
              className={styles.submitBtn}
              onClick={addEvent}
              disabled={!fTitre.trim()}
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function NextCard({ event, onDone, onDelete }: {
  event: ChipieEvent
  onDone: (id: string) => void
  onDelete: (id: string) => void
}) {
  const t = TYPE_MAP.get(event.type)!
  const days = daysUntil(event.date)
  const { text, urgent } = countdownLabel(days)

  return (
    <div className={`${styles.nextCard} ${urgent ? styles.nextCardUrgent : ''}`}
      style={{ '--tc': t.color } as React.CSSProperties}>
      <div className={styles.nextCardTop}>
        <span className={styles.nextCardEmoji}>{t.emoji}</span>
        <div className={styles.nextCardInfo}>
          <span className={styles.nextCardLabel}>{t.label}</span>
          <span className={styles.nextCardTitle}>{event.titre}</span>
          <span className={styles.nextCardDate}>{formatDateFr(event.date)}</span>
        </div>
        <button className={styles.nextCardDelete} onClick={() => onDelete(event.id)}>✕</button>
      </div>

      <div className={styles.nextCardCountdown}>
        <span className={styles.countdownText}>{text}</span>
        {days >= 0 && (
          <div className={styles.countdownBar}>
            <div
              className={styles.countdownFill}
              style={{ width: `${Math.max(5, Math.min(100, 100 - (days / 60) * 100))}%` }}
            />
          </div>
        )}
      </div>

      {event.notes && <p className={styles.nextCardNotes}>{event.notes}</p>}

      <button className={styles.doneBtn} onClick={() => onDone(event.id)}>
        ✓ Marquer comme fait
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{title}</p>
      <div className={styles.sectionList}>{children}</div>
    </div>
  )
}

function EventRow({ event, onDone, onDelete, faded }: {
  event: ChipieEvent
  onDone: (id: string) => void
  onDelete: (id: string) => void
  faded?: boolean
}) {
  const t = TYPE_MAP.get(event.type)!
  const days = daysUntil(event.date)
  const { text, urgent } = countdownLabel(days)

  return (
    <div className={`${styles.row} ${faded ? styles.rowFaded : ''}`}>
      <span className={styles.rowEmoji}>{t.emoji}</span>
      <div className={styles.rowInfo}>
        <span className={styles.rowTitle}>{event.titre}</span>
        <span className={styles.rowMeta}>{t.label} · {formatDateFr(event.date)}</span>
      </div>
      <span className={`${styles.rowDays} ${urgent ? styles.rowDaysUrgent : ''}`}>{text}</span>
      <div className={styles.rowActions}>
        <button className={styles.rowDone} onClick={() => onDone(event.id)} title={event.done ? 'Rouvrir' : 'Marquer fait'}>
          {event.done ? '↩' : '✓'}
        </button>
        <button className={styles.rowDelete} onClick={() => onDelete(event.id)}>✕</button>
      </div>
    </div>
  )
}

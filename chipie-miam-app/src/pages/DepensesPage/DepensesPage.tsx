import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './DepensesPage.module.css'

// ── Types ────────────────────────────────────────────────────────────────────
type Categorie = 'vet' | 'alimentation' | 'accessoires' | 'jouets' | 'autre'

interface Depense {
  id: string
  date: string      // YYYY-MM-DD
  categorie: Categorie
  montant: number
  description: string
}

const CAT_INFO: Record<Categorie, { label: string; emoji: string; color: string }> = {
  vet:          { label: 'Vétérinaire',  emoji: '🩺', color: '#5AC8FA' },
  alimentation: { label: 'Alimentation', emoji: '🥕', color: '#4cd964' },
  accessoires:  { label: 'Accessoires',  emoji: '🏠', color: '#b8a8f8' },
  jouets:       { label: 'Jouets',       emoji: '🎾', color: '#f8e060' },
  autre:        { label: 'Autre',        emoji: '📋', color: '#c0b8b0' },
}

const CATEGORIES = Object.entries(CAT_INFO) as [Categorie, typeof CAT_INFO[Categorie]][]

// ── Persistence ───────────────────────────────────────────────────────────────
function storageKey() { return `chipie-depenses-${getActiveProfileId()}` }

function loadDepenses(): Depense[] {
  try {
    const raw = localStorage.getItem(storageKey())
    return raw ? JSON.parse(raw) as Depense[] : []
  } catch { return [] }
}

function saveDepenses(list: Depense[]) {
  localStorage.setItem(storageKey(), JSON.stringify(list))
}

function monthKey(date: string) { return date.slice(0, 7) } // YYYY-MM

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

// ── Component ────────────────────────────────────────────────────────────────
export default function DepensesPage() {
  const navigate = useNavigate()
  const [depenses, setDepenses] = useState<Depense[]>(loadDepenses)

  // Current month navigation
  const currentMonth = todayStr().slice(0, 7)
  const [viewMonth, setViewMonth] = useState(currentMonth)

  // Add form
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate]         = useState(todayStr())
  const [formCat, setFormCat]           = useState<Categorie>('alimentation')
  const [formMontant, setFormMontant]   = useState('')
  const [formDesc, setFormDesc]         = useState('')

  const filtered = useMemo(
    () => depenses.filter(d => monthKey(d.date) === viewMonth).sort((a, b) => b.date.localeCompare(a.date)),
    [depenses, viewMonth]
  )

  const monthTotal = useMemo(
    () => filtered.reduce((sum, d) => sum + d.montant, 0),
    [filtered]
  )

  const catTotals = useMemo(() => {
    const totals: Partial<Record<Categorie, number>> = {}
    filtered.forEach(d => { totals[d.categorie] = (totals[d.categorie] || 0) + d.montant })
    return totals
  }, [filtered])

  const prevMonth = useCallback(() => {
    const [y, m] = viewMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }, [viewMonth])

  const nextMonth = useCallback(() => {
    const [y, m] = viewMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key <= currentMonth) setViewMonth(key)
  }, [viewMonth, currentMonth])

  const addDepense = useCallback(() => {
    const montant = parseFloat(formMontant.replace(',', '.'))
    if (!formDesc.trim() || isNaN(montant) || montant <= 0) return
    const newD: Depense = {
      id:          Date.now().toString(),
      date:        formDate,
      categorie:   formCat,
      montant,
      description: formDesc.trim(),
    }
    setDepenses(prev => {
      const next = [newD, ...prev]
      saveDepenses(next)
      return next
    })
    setShowForm(false)
    setFormMontant(''); setFormDesc('')
    // Switch view to month of added expense
    setViewMonth(monthKey(formDate))
  }, [formDate, formCat, formMontant, formDesc])

  const removeDepense = useCallback((id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return
    setDepenses(prev => {
      const next = prev.filter(d => d.id !== id)
      saveDepenses(next)
      return next
    })
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Retour
        </button>
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>+ Ajouter</button>
      </div>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>💰</span>
        <h1 className={styles.title}>Carnet de dépenses</h1>
      </div>

      {/* Month navigation */}
      <div className={styles.monthNav}>
        <button className={styles.monthArrow} onClick={prevMonth}>‹</button>
        <span className={styles.monthLabel}>{formatMonthLabel(viewMonth)}</span>
        <button className={styles.monthArrow} onClick={nextMonth} disabled={viewMonth >= currentMonth}>›</button>
      </div>

      {/* Monthly total */}
      <div className={styles.totalCard}>
        <span className={styles.totalLabel}>Total du mois</span>
        <span className={styles.totalAmount}>{monthTotal.toFixed(2)} €</span>
      </div>

      {/* Category breakdown */}
      {filtered.length > 0 && (
        <div className={styles.catBreakdown}>
          {CATEGORIES.filter(([cat]) => catTotals[cat]).map(([cat, info]) => (
            <div key={cat} className={styles.catChip} style={{ '--cc': info.color } as React.CSSProperties}>
              <span>{info.emoji}</span>
              <span>{info.label}</span>
              <span className={styles.catChipAmount}>{(catTotals[cat] ?? 0).toFixed(2)} €</span>
            </div>
          ))}
        </div>
      )}

      {/* Expense list */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>💸</span>
          <p>Aucune dépense ce mois-ci</p>
          <button className={styles.emptyAddBtn} onClick={() => setShowForm(true)}>Ajouter une dépense</button>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(d => {
            const info = CAT_INFO[d.categorie]
            return (
              <div key={d.id} className={styles.item}>
                <span className={styles.itemEmoji}>{info.emoji}</span>
                <div className={styles.itemInfo}>
                  <span className={styles.itemDesc}>{d.description}</span>
                  <span className={styles.itemMeta}>{info.label} · {d.date.split('-').reverse().join('/')}</span>
                </div>
                <span className={styles.itemAmount}>{d.montant.toFixed(2)} €</span>
                <button className={styles.itemDelete} onClick={() => removeDepense(d.id)}>✕</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form overlay */}
      {showForm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Nouvelle dépense</span>
              <button className={styles.modalClose} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <label className={styles.formLabel}>Date</label>
            <input type="date" className={styles.formInput} value={formDate} max={todayStr()} onChange={e => setFormDate(e.target.value)} />

            <label className={styles.formLabel}>Catégorie</label>
            <div className={styles.catPicker}>
              {CATEGORIES.map(([cat, info]) => (
                <button
                  key={cat}
                  className={`${styles.catPickBtn} ${formCat === cat ? styles.catPickBtnActive : ''}`}
                  style={{ '--cc': info.color } as React.CSSProperties}
                  onClick={() => setFormCat(cat)}
                >
                  <span>{info.emoji}</span>
                  <span>{info.label}</span>
                </button>
              ))}
            </div>

            <label className={styles.formLabel}>Montant (€)</label>
            <input
              type="number"
              inputMode="decimal"
              className={styles.formInput}
              value={formMontant}
              placeholder="0.00"
              min="0"
              step="0.01"
              onChange={e => setFormMontant(e.target.value)}
            />

            <label className={styles.formLabel}>Description</label>
            <input
              type="text"
              className={styles.formInput}
              value={formDesc}
              placeholder="Consultation annuelle, foin, jouet…"
              onChange={e => setFormDesc(e.target.value)}
            />

            <button
              className={styles.submitBtn}
              onClick={addDepense}
              disabled={!formDesc.trim() || !formMontant}
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

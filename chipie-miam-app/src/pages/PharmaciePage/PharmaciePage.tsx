import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { todayStr, addDays } from '../../utils/dates'
import styles from './PharmaciePage.module.css'

// ── Types ────────────────────────────────────────────────────────────────────
type TypeStock = 'medicament' | 'soin' | 'aliment' | 'litiere' | 'autre'

interface StockItem {
  id: string
  nom: string
  type: TypeStock
  quantite: number
  unite: string
  seuil: number          // alerte quand quantite <= seuil
  peremption: string     // YYYY-MM-DD, '' si non applicable
  notes: string
}

type Statut = 'perime' | 'rupture' | 'bientot' | 'bas' | 'ok'

const EXPIRY_WARNING_DAYS = 30

const TYPE_INFO: Record<TypeStock, { label: string; emoji: string; unite: string }> = {
  medicament: { label: 'Médicament', emoji: '💊', unite: 'dose' },
  soin:       { label: 'Soin',       emoji: '🩹', unite: 'unité' },
  aliment:    { label: 'Aliment',    emoji: '🥣', unite: 'kg' },
  litiere:    { label: 'Litière',    emoji: '🧺', unite: 'sac' },
  autre:      { label: 'Autre',      emoji: '📦', unite: 'unité' },
}

const TYPES = Object.entries(TYPE_INFO) as [TypeStock, typeof TYPE_INFO[TypeStock]][]

const STATUT_INFO: Record<Statut, { label: string; order: number }> = {
  perime:  { label: 'Périmé',            order: 0 },
  rupture: { label: 'Épuisé',            order: 1 },
  bientot: { label: 'Bientôt périmé',    order: 2 },
  bas:     { label: 'Stock bas',         order: 3 },
  ok:      { label: 'OK',                order: 4 },
}

// ── Persistence ───────────────────────────────────────────────────────────────
function storageKey() { return `chipie-pharmacie-${getActiveProfileId()}` }

function loadItems(): StockItem[] {
  try {
    const raw = localStorage.getItem(storageKey())
    return raw ? JSON.parse(raw) as StockItem[] : []
  } catch { return [] }
}

function saveItems(list: StockItem[]) {
  localStorage.setItem(storageKey(), JSON.stringify(list))
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStatut(item: StockItem, today: string): Statut {
  if (item.peremption && item.peremption < today) return 'perime'
  if (item.quantite <= 0) return 'rupture'
  if (item.peremption && item.peremption <= addDays(today, EXPIRY_WARNING_DAYS)) return 'bientot'
  if (item.seuil > 0 && item.quantite <= item.seuil) return 'bas'
  return 'ok'
}

function formatDate(dateStr: string): string {
  return dateStr.split('-').reverse().join('/')
}

function formatQty(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',')
}

function parseNum(value: string): number {
  return parseFloat(value.replace(',', '.'))
}

interface FormState {
  nom: string
  type: TypeStock
  quantite: string
  unite: string
  seuil: string
  peremption: string
  notes: string
}

const EMPTY_FORM: FormState = {
  nom: '', type: 'medicament', quantite: '', unite: TYPE_INFO.medicament.unite,
  seuil: '', peremption: '', notes: '',
}

// ── Component ────────────────────────────────────────────────────────────────
export default function PharmaciePage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<StockItem[]>(loadItems)
  const [filter, setFilter] = useState<TypeStock | 'tous'>('tous')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const today = todayStr()

  const update = useCallback((updater: (prev: StockItem[]) => StockItem[]) => {
    setItems(prev => {
      const next = updater(prev)
      saveItems(next)
      return next
    })
  }, [])

  const withStatut = useMemo(
    () => items
      .map(item => ({ item, statut: getStatut(item, today) }))
      .sort((a, b) =>
        STATUT_INFO[a.statut].order - STATUT_INFO[b.statut].order ||
        a.item.nom.localeCompare(b.item.nom, 'fr'),
      ),
    [items, today],
  )

  const visible = useMemo(
    () => filter === 'tous' ? withStatut : withStatut.filter(x => x.item.type === filter),
    [withStatut, filter],
  )

  const alertCounts = useMemo(() => {
    const counts: Record<Statut, number> = { perime: 0, rupture: 0, bientot: 0, bas: 0, ok: 0 }
    withStatut.forEach(x => { counts[x.statut]++ })
    return counts
  }, [withStatut])

  const totalAlerts = alertCounts.perime + alertCounts.rupture + alertCounts.bientot + alertCounts.bas

  const openAdd = useCallback(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }, [])

  const openEdit = useCallback((item: StockItem) => {
    setEditingId(item.id)
    setForm({
      nom: item.nom,
      type: item.type,
      quantite: String(item.quantite),
      unite: item.unite,
      seuil: item.seuil ? String(item.seuil) : '',
      peremption: item.peremption,
      notes: item.notes,
    })
    setShowForm(true)
  }, [])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const pickType = useCallback((type: TypeStock) => {
    setForm(prev => ({
      ...prev,
      type,
      // Ne remplace l'unité que si elle est encore celle du type précédent
      unite: prev.unite === TYPE_INFO[prev.type].unite ? TYPE_INFO[type].unite : prev.unite,
    }))
  }, [])

  const quantite = parseNum(form.quantite)
  const seuil = form.seuil ? parseNum(form.seuil) : 0
  const formValid = form.nom.trim() !== '' && !isNaN(quantite) && quantite >= 0 && !isNaN(seuil) && seuil >= 0

  const submit = useCallback(() => {
    if (!formValid) return
    const data = {
      nom: form.nom.trim(),
      type: form.type,
      quantite,
      unite: form.unite.trim() || TYPE_INFO[form.type].unite,
      seuil,
      peremption: form.peremption,
      notes: form.notes.trim(),
    }
    if (editingId) {
      update(prev => prev.map(i => i.id === editingId ? { ...i, ...data } : i))
    } else {
      update(prev => [{ id: Date.now().toString(), ...data }, ...prev])
    }
    setShowForm(false)
  }, [formValid, form, quantite, seuil, editingId, update])

  const adjust = useCallback((id: string, delta: number) => {
    update(prev => prev.map(i =>
      i.id === id ? { ...i, quantite: Math.max(0, Math.round((i.quantite + delta) * 100) / 100) } : i,
    ))
  }, [update])

  const remove = useCallback((id: string) => {
    if (!confirm('Supprimer cet article ?')) return
    update(prev => prev.filter(i => i.id !== id))
    setShowForm(false)
  }, [update])

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Retour
        </button>
        <button className={styles.addBtn} onClick={openAdd}>+ Ajouter</button>
      </div>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>💊</span>
        <div>
          <h1 className={styles.title}>Pharmacie &amp; stocks</h1>
          <p className={styles.subtitle}>
            {items.length} article{items.length !== 1 ? 's' : ''}
            {totalAlerts > 0 && ` · ${totalAlerts} à surveiller`}
          </p>
        </div>
      </div>

      {/* Alert summary */}
      {totalAlerts > 0 && (
        <div className={styles.alerts}>
          {alertCounts.perime > 0 && (
            <div className={`${styles.alert} ${styles.alertRed}`}>
              ⛔ {alertCounts.perime} article{alertCounts.perime > 1 ? 's' : ''} périmé{alertCounts.perime > 1 ? 's' : ''} : à jeter ou remplacer
            </div>
          )}
          {alertCounts.rupture > 0 && (
            <div className={`${styles.alert} ${styles.alertRed}`}>
              📭 {alertCounts.rupture} article{alertCounts.rupture > 1 ? 's' : ''} épuisé{alertCounts.rupture > 1 ? 's' : ''}
            </div>
          )}
          {alertCounts.bientot > 0 && (
            <div className={`${styles.alert} ${styles.alertYellow}`}>
              ⏳ {alertCounts.bientot} article{alertCounts.bientot > 1 ? 's' : ''} périment dans moins de {EXPIRY_WARNING_DAYS} jours
            </div>
          )}
          {alertCounts.bas > 0 && (
            <div className={`${styles.alert} ${styles.alertYellow}`}>
              📉 {alertCounts.bas} article{alertCounts.bas > 1 ? 's' : ''} en stock bas : pensez à racheter
            </div>
          )}
        </div>
      )}

      {/* Type filter */}
      {items.length > 0 && (
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'tous' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter('tous')}
          >
            Tout
          </button>
          {TYPES.map(([type, info]) => (
            <button
              key={type}
              className={`${styles.filterBtn} ${filter === type ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(type)}
            >
              {info.emoji} {info.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🧴</span>
          <p>Aucun article pour l'instant</p>
          <button className={styles.emptyBtn} onClick={openAdd}>Ajouter un article</button>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          <p>Aucun article dans cette catégorie</p>
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map(({ item, statut }) => {
            const info = TYPE_INFO[item.type]
            return (
              <div key={item.id} className={statut === 'ok' ? styles.item : `${styles.item} ${styles[`item_${statut}`]}`}>
                <button className={styles.itemMain} onClick={() => openEdit(item)}>
                  <span className={styles.itemEmoji}>{info.emoji}</span>
                  <span className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.nom}</span>
                    <span className={styles.itemMeta}>
                      {info.label}
                      {item.peremption && ` · Péremption ${formatDate(item.peremption)}`}
                    </span>
                    {statut !== 'ok' && (
                      <span className={`${styles.badge} ${styles[`badge_${statut}`]}`}>
                        {STATUT_INFO[statut].label}
                      </span>
                    )}
                    {item.notes && <span className={styles.itemNotes}>{item.notes}</span>}
                  </span>
                </button>
                <div className={styles.qty}>
                  <button className={styles.qtyBtn} onClick={() => adjust(item.id, -1)} aria-label="Retirer un">−</button>
                  <span className={styles.qtyValue}>
                    {formatQty(item.quantite)}
                    <span className={styles.qtyUnit}>{item.unite}</span>
                  </span>
                  <button className={styles.qtyBtn} onClick={() => adjust(item.id, 1)} aria-label="Ajouter un">+</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / edit form */}
      {showForm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{editingId ? "Modifier l'article" : 'Nouvel article'}</span>
              <button className={styles.modalClose} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <label className={styles.formLabel}>Nom</label>
            <input
              type="text"
              className={styles.formInput}
              value={form.nom}
              placeholder="Métacam, granulés, litière…"
              onChange={e => setField('nom', e.target.value)}
            />

            <label className={styles.formLabel}>Type</label>
            <div className={styles.typePicker}>
              {TYPES.map(([type, info]) => (
                <button
                  key={type}
                  className={`${styles.typeBtn} ${form.type === type ? styles.typeBtnActive : ''}`}
                  onClick={() => pickType(type)}
                >
                  <span>{info.emoji}</span>
                  <span>{info.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.formLabel}>Quantité</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className={styles.formInput}
                  value={form.quantite}
                  placeholder="0"
                  min="0"
                  step="any"
                  onChange={e => setField('quantite', e.target.value)}
                />
              </div>
              <div className={styles.col}>
                <label className={styles.formLabel}>Unité</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.unite}
                  placeholder="ml, kg, sac…"
                  onChange={e => setField('unite', e.target.value)}
                />
              </div>
            </div>

            <label className={styles.formLabel}>Alerte quand il en reste (optionnel)</label>
            <input
              type="number"
              inputMode="decimal"
              className={styles.formInput}
              value={form.seuil}
              placeholder="Ex : 2"
              min="0"
              step="any"
              onChange={e => setField('seuil', e.target.value)}
            />

            <label className={styles.formLabel}>Date de péremption (optionnel)</label>
            <input
              type="date"
              className={styles.formInput}
              value={form.peremption}
              onChange={e => setField('peremption', e.target.value)}
            />

            <label className={styles.formLabel}>Notes (optionnel)</label>
            <input
              type="text"
              className={styles.formInput}
              value={form.notes}
              placeholder="Posologie, ordonnance, magasin…"
              onChange={e => setField('notes', e.target.value)}
            />

            <button className={styles.submitBtn} onClick={submit} disabled={!formValid}>
              Enregistrer
            </button>
            {editingId && (
              <button className={styles.deleteBtn} onClick={() => remove(editingId)}>
                Supprimer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

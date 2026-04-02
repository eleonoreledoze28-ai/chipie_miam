import { useState, useMemo } from 'react'
import { VEGETAUX } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './AddEntryModal.module.css'

const QUANTITES = [
  'Une feuille',
  'Quelques feuilles',
  'Une poignée',
  'Un morceau',
  'Une branche',
  'Une petite portion',
]

interface Props {
  date: string
  onAdd: (vegetalId: string, quantite: string, notes: string) => void
  onClose: () => void
  preSelectedId?: string | null
}

export default function AddEntryModal({ date, onAdd, onClose, preSelectedId = null }: Props) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(preSelectedId)
  const [quantite, setQuantite] = useState(QUANTITES[2])
  const [notes, setNotes] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return VEGETAUX.slice(0, 20)
    const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return VEGETAUX.filter((v) => {
      const nom = v.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return nom.includes(q)
    })
  }, [search])

  const selected = selectedId ? VEGETAUX.find((v) => v.id === selectedId) : null

  const handleSubmit = () => {
    if (!selectedId) return
    onAdd(selectedId, quantite, notes)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} />
        <h2 className={styles.title}>Ajouter un aliment</h2>
        <p className={styles.dateLabel}>{date}</p>

        {!selected ? (
          <>
            <div className={styles.searchWrap}>
              <input
                type="text"
                placeholder="Rechercher un végétal…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
                autoFocus
              />
            </div>
            <div className={styles.list}>
              {filtered.map((v) => (
                <button
                  key={v.id}
                  className={styles.listItem}
                  onClick={() => setSelectedId(v.id)}
                >
                  <img src={assetUrl(v.image)} alt="" className={styles.thumb} loading="lazy" />
                  <span>{v.nom}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className={styles.noResult}>Aucun résultat</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={styles.selectedVeg}>
              <img src={assetUrl(selected.image)} alt="" className={styles.selectedImg} />
              <div>
                <p className={styles.selectedName}>{selected.nom}</p>
                <button className={styles.changeBtn} onClick={() => setSelectedId(null)}>
                  Changer
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Quantité</label>
              <div className={styles.quantites}>
                {QUANTITES.map((q) => (
                  <button
                    key={q}
                    className={`${styles.qBtn} ${quantite === q ? styles.qBtnActive : ''}`}
                    onClick={() => setQuantite(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Notes (optionnel)</label>
              <textarea
                className={styles.textarea}
                placeholder="Ex: bien aimé, donné avec du foin…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <button className={styles.submitBtn} onClick={handleSubmit}>
              Ajouter au journal
            </button>
          </>
        )}
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './FoinPage.module.css'

interface Achat {
  id: string
  date: string
  kg: number
}

function storageKey() {
  return `chipie-foin-${getActiveProfileId()}`
}

function loadAchats(): Achat[] {
  try {
    const raw = localStorage.getItem(storageKey())
    return raw ? (JSON.parse(raw) as Achat[]) : []
  } catch { return [] }
}

function saveAchats(achats: Achat[]) {
  localStorage.setItem(storageKey(), JSON.stringify(achats))
}

export default function FoinPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [achats, setAchats] = useState<Achat[]>(loadAchats)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formKg, setFormKg] = useState('')

  const dailyGrams = useMemo(() => {
    const poids = parseFloat(profil.poids)
    return isNaN(poids) || poids <= 0 ? 80 : Math.round(poids * 1000 * 0.04)
  }, [profil.poids])

  const totalGrams = useMemo(() =>
    achats.reduce((sum, a) => sum + a.kg * 1000, 0),
    [achats]
  )

  const daysRemaining = useMemo(() =>
    dailyGrams > 0 ? Math.floor(totalGrams / dailyGrams) : 0,
    [totalGrams, dailyGrams]
  )

  const isLow = daysRemaining < 7 && totalGrams > 0
  const isEmpty = totalGrams === 0

  function addAchat() {
    const kg = parseFloat(formKg)
    if (isNaN(kg) || kg <= 0) return
    const newAchats = [
      { id: Date.now().toString(), date: formDate, kg },
      ...achats,
    ]
    saveAchats(newAchats)
    setAchats(newAchats)
    setShowForm(false)
    setFormKg('')
  }

  function removeAchat(id: string) {
    const next = achats.filter(a => a.id !== id)
    saveAchats(next)
    setAchats(next)
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
      </div>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>🌾</span>
        <div>
          <h1 className={styles.title}>Stock de foin</h1>
          <p className={styles.subtitle}>Suivi de la réserve de foin de {profil.nom}</p>
        </div>
      </div>

      {/* Status card */}
      <div className={`${styles.statusCard} ${isEmpty ? styles.statusEmpty : isLow ? styles.statusLow : styles.statusOk}`}>
        {isEmpty ? (
          <>
            <span className={styles.statusIcon}>📦</span>
            <p className={styles.statusTitle}>Aucun stock enregistré</p>
            <p className={styles.statusSub}>Ajoute un achat pour commencer le suivi</p>
          </>
        ) : (
          <>
            <span className={styles.statusIcon}>{isLow ? '⚠️' : '✅'}</span>
            <p className={styles.statusTitle}>
              {isLow ? 'Stock faible !' : 'Stock suffisant'}
            </p>
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statVal}>{(totalGrams / 1000).toFixed(2)} kg</span>
                <span className={styles.statLbl}>restant</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statBox}>
                <span className={styles.statVal}>{daysRemaining}j</span>
                <span className={styles.statLbl}>estimés</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statBox}>
                <span className={styles.statVal}>{dailyGrams}g</span>
                <span className={styles.statLbl}>/ jour</span>
              </div>
            </div>
            {isLow && (
              <p className={styles.alertMsg}>
                Il reste moins de 7 jours de foin. Pense à racheter !
              </p>
            )}
          </>
        )}
      </div>

      {/* Consumption info */}
      <div className={styles.infoCard}>
        <span className={styles.infoIcon}>ℹ️</span>
        <p className={styles.infoText}>
          La consommation estimée est calculée à 4% du poids de {profil.nom}
          {profil.poids ? ` (${profil.poids} kg)` : ''}.
          Le foin doit toujours être disponible à volonté.
        </p>
      </div>

      {/* Add purchase button */}
      <button className={styles.addBtn} onClick={() => setShowForm(v => !v)}>
        {showForm ? '✕ Annuler' : '+ Enregistrer un achat'}
      </button>

      {showForm && (
        <div className={styles.form}>
          <h2 className={styles.formTitle}>Nouvel achat</h2>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Date</label>
            <input
              type="date"
              className={styles.formInput}
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Quantité (kg)</label>
            <input
              type="number"
              className={styles.formInput}
              placeholder="ex: 2.5"
              min="0.1"
              step="0.1"
              value={formKg}
              onChange={e => setFormKg(e.target.value)}
            />
          </div>
          <button className={styles.saveBtn} onClick={addAchat}>
            Enregistrer
          </button>
        </div>
      )}

      {/* History */}
      {achats.length > 0 && (
        <div className={styles.history}>
          <h2 className={styles.historyTitle}>Historique des achats</h2>
          <div className={styles.historyList}>
            {achats.map(a => (
              <div key={a.id} className={styles.historyItem}>
                <span className={styles.historyEmoji}>🌾</span>
                <div className={styles.historyInfo}>
                  <span className={styles.historyKg}>{a.kg} kg</span>
                  <span className={styles.historyDate}>
                    {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <button className={styles.deleteBtn} onClick={() => removeAchat(a.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

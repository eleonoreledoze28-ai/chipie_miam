import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import styles from './ProfilPage.module.css'

export default function ProfilPage() {
  const navigate = useNavigate()
  const { profil, updateProfil } = useProfil()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profil)

  const startEdit = () => {
    setDraft(profil)
    setEditing(true)
  }

  const saveEdit = () => {
    updateProfil(draft)
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditing(false)
  }

  const set = (key: keyof typeof draft, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <div className={styles.avatar}>
        <img src={`${import.meta.env.BASE_URL}chipie-avatar.jpeg`} alt={profil.nom} className={styles.avatarImg} />
      </div>

      {editing ? (
        <>
          <input
            className={styles.nameInput}
            value={draft.nom}
            onChange={(e) => set('nom', e.target.value)}
            placeholder="Nom"
          />
          <input
            className={styles.subtitleInput}
            value={draft.sousTitre}
            onChange={(e) => set('sousTitre', e.target.value)}
            placeholder="Sous-titre (ex: Lapin nain)"
          />
        </>
      ) : (
        <>
          <h1 className={styles.name}>{profil.nom}</h1>
          <p className={styles.subtitle}>{profil.sousTitre}</p>
        </>
      )}

      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Race</span>
          {editing ? (
            <input
              className={styles.infoInput}
              value={draft.race}
              onChange={(e) => set('race', e.target.value)}
              placeholder="—"
            />
          ) : (
            <span className={styles.infoValue}>{profil.race || '—'}</span>
          )}
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Age</span>
          {editing ? (
            <input
              className={styles.infoInput}
              value={draft.age}
              onChange={(e) => set('age', e.target.value)}
              placeholder="—"
            />
          ) : (
            <span className={styles.infoValue}>{profil.age || '—'}</span>
          )}
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Poids</span>
          {editing ? (
            <input
              className={styles.infoInput}
              value={draft.poids}
              onChange={(e) => set('poids', e.target.value)}
              placeholder="—"
            />
          ) : (
            <span className={styles.infoValue}>{profil.poids || '—'}</span>
          )}
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Sterilise(e)</span>
          {editing ? (
            <div className={styles.toggleRow}>
              {['Oui', 'Non'].map((opt) => (
                <button
                  key={opt}
                  className={`${styles.toggleBtn} ${draft.sterilise === opt ? styles.toggleBtnActive : ''}`}
                  onClick={() => set('sterilise', opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <span className={styles.infoValue}>{profil.sterilise || '—'}</span>
          )}
        </div>
      </div>

      {editing ? (
        <div className={styles.editActions}>
          <button className={styles.cancelBtn} onClick={cancelEdit}>Annuler</button>
          <button className={styles.saveBtn} onClick={saveEdit}>Enregistrer</button>
        </div>
      ) : (
        <button className={styles.editBtn} onClick={startEdit}>Modifier le profil</button>
      )}
    </div>
  )
}

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import styles from './ProfilPage.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

export default function ProfilPage() {
  const navigate = useNavigate()
  const { profil, updateProfil } = useProfil()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profil)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      // Resize to max 200x200 to save localStorage space
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = Math.min(img.width, img.height, 200)
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size)
        set('avatar', canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const avatarSrc = (editing ? draft.avatar : profil.avatar) || DEFAULT_AVATAR

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <div className={`${styles.avatar} ${editing ? styles.avatarEditing : ''}`} onClick={editing ? () => fileRef.current?.click() : undefined}>
        <img src={avatarSrc} alt={profil.nom} className={styles.avatarImg} />
        {editing && (
          <div className={styles.avatarOverlay}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className={styles.fileInput}
          onChange={handleAvatarChange}
        />
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

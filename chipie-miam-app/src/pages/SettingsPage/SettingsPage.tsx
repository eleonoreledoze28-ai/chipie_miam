import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './SettingsPage.module.css'

const STORAGE_KEYS = [
  'chipie_journal',
  'chipie_custom_images',
  'chipie_collapsed_categories',
  'chipie_profil',
]

function exportData() {
  const data: Record<string, unknown> = {}
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw) {
      try { data[key] = JSON.parse(raw) } catch { data[key] = raw }
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chipie-miam-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ msg: string; error?: boolean } | null>(null)

  function handleExport() {
    exportData()
    setStatus({ msg: 'Sauvegarde téléchargée !' })
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        for (const key of STORAGE_KEYS) {
          if (key in data) {
            localStorage.setItem(key, JSON.stringify(data[key]))
          }
        }
        setStatus({ msg: 'Données restaurées ! Rechargement...' })
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        setStatus({ msg: 'Fichier invalide.', error: true })
      }
    }
    reader.readAsText(file)
    // Reset pour pouvoir reimporter le meme fichier
    e.target.value = ''
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <h1 className={styles.title}>Paramètres</h1>
      <p className={styles.subtitle}>
        Sauvegardez ou restaurez les données de Chipie Miam.
      </p>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Sauvegarde</div>
        <p className={styles.sectionDesc}>
          Télécharge un fichier JSON contenant votre journal et vos préférences.
        </p>
        <button className={`${styles.btn} ${styles.btnExport}`} onClick={handleExport}>
          Sauvegarder mes données
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Restauration</div>
        <p className={styles.sectionDesc}>
          Importez un fichier de sauvegarde pour restaurer vos données.
        </p>
        <button className={`${styles.btn} ${styles.btnImport}`} onClick={() => fileRef.current?.click()}>
          Restaurer une sauvegarde
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className={styles.fileInput}
          onChange={handleImport}
        />
      </div>

      {status && (
        <p className={status.error ? styles.statusError : styles.status}>
          {status.msg}
        </p>
      )}
    </div>
  )
}

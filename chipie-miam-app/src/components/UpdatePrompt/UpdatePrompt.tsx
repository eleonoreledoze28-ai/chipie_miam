import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './UpdatePrompt.module.css'

const CHECK_EVERY_MS = 60 * 60 * 1000 // vérifie une nouvelle version toutes les heures

/** Bandeau « Nouvelle version disponible » : évite de rester sur l'ancienne version en cache. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      window.setInterval(() => { void registration.update() }, CHECK_EVERY_MS)
    },
  })

  if (!needRefresh) return null

  return (
    <div className={styles.banner} role="status">
      <span className={styles.text}>🐰 Une nouvelle version est disponible !</span>
      <button className={styles.update} onClick={() => { void updateServiceWorker(true) }}>
        Actualiser
      </button>
      <button className={styles.later} onClick={() => setNeedRefresh(false)} aria-label="Plus tard">
        ✕
      </button>
    </div>
  )
}

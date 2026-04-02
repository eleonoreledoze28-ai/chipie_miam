import { useNavigate } from 'react-router-dom'
import styles from './ProfilPage.module.css'

export default function ProfilPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <div className={styles.avatar}>
        <img src={`${import.meta.env.BASE_URL}chipie-avatar.jpeg`} alt="Chipie" className={styles.avatarImg} />
      </div>
      <h1 className={styles.name}>Chipie</h1>
      <p className={styles.subtitle}>Lapin nain</p>

      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Race</span>
          <span className={styles.infoValue}>—</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Âge</span>
          <span className={styles.infoValue}>—</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Poids</span>
          <span className={styles.infoValue}>—</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Stérilisé(e)</span>
          <span className={styles.infoValue}>—</span>
        </div>
      </div>

      <p className={styles.hint}>
        Les informations du profil seront éditables dans une prochaine mise à jour.
      </p>
    </div>
  )
}

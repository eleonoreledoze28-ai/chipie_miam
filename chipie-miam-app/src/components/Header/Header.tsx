import { useLocation, useNavigate } from 'react-router-dom'
import styles from './Header.module.css'

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const isDetail = pathname.startsWith('/detail/')
  if (isDetail) return null

  return (
    <header className={styles.header}>
      {/* Left — Chipie avatar + name */}
      <button className={styles.profileBtn} onClick={() => navigate('/profil')}>
        <img
          src={`${import.meta.env.BASE_URL}chipie-avatar.jpeg`}
          alt="Chipie"
          className={styles.avatar}
        />
        <span className={styles.profileName}>Chipie</span>
      </button>

      {/* Center — rabbit icon + bicolor title */}
      <div className={styles.logoCenter}>
        {/* Rabbit line‑art SVG */}
        <svg className={styles.rabbitIcon} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10.5 3C9.5 3 8 4 8 6.5C8 8.5 9 10.5 10 12C8 13 6 15.5 6 19C6 23.5 9.5 27 14.5 28C15.6 28.2 16.4 28.2 17.5 28C22.5 27 26 23.5 26 19C26 15.5 24 13 22 12C23 10.5 24 8.5 24 6.5C24 4 22.5 3 21.5 3C20 3 19 4.5 18.5 6.5C18.2 7.8 18 9.2 18 10.5C17.3 10.2 16.7 10 16 10C15.3 10 14.7 10.2 14 10.5C14 9.2 13.8 7.8 13.5 6.5C13 4.5 12 3 10.5 3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="13" cy="18" r="1.2" fill="currentColor" />
          <circle cx="19" cy="18" r="1.2" fill="currentColor" />
          <ellipse cx="16" cy="21" rx="1.5" ry="1" fill="currentColor" />
        </svg>
        <h1 className={styles.title}>
          <span className={styles.titleOrange}>CHIPIE</span>
          <span className={styles.titleMuted}> MIAM</span>
        </h1>
      </div>

      {/* Right — Settings */}
      <button className={styles.settingsBtn} onClick={() => navigate('/settings')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>
    </header>
  )
}

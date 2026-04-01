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
          src="/chipie-avatar.jpeg"
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

      {/* Right spacer */}
      <div className={styles.rightSpacer} />
    </header>
  )
}

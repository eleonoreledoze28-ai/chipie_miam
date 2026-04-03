import { useNavigate } from 'react-router-dom'
import styles from './JeuxHubPage.module.css'

const GAMES = [
  {
    id: 'devinette',
    path: '/jeu/devinette',
    emoji: '📸',
    title: 'Devinette Photo',
    desc: 'Reconnaissez les végétaux à partir de leur photo',
  },
  {
    id: 'memory',
    path: '/jeu/memory',
    emoji: '🧠',
    title: 'Memory',
    desc: 'Trouvez les paires image / nom de végétaux',
  },
]

export default function JeuxHubPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.headerEmoji}>🎮</span>
        <h1 className={styles.title}>Jeux</h1>
        <p className={styles.subtitle}>Apprenez en vous amusant !</p>
      </div>

      <div className={styles.gameList}>
        {GAMES.map(game => (
          <button key={game.id} className={styles.gameCard} onClick={() => navigate(game.path)}>
            <span className={styles.gameEmoji}>{game.emoji}</span>
            <div className={styles.gameInfo}>
              <span className={styles.gameTitle}>{game.title}</span>
              <span className={styles.gameDesc}>{game.desc}</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18" className={styles.gameArrow}>
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

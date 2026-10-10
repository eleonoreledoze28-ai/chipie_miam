import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './GameShell.module.css'

interface Props {
  title: string
  emoji: string
  /** Petits indicateurs affichés à droite (score, temps, vies…) */
  stats?: ReactNode
  children: ReactNode
}

/** Cadre commun des mini-jeux : bouton retour, titre et indicateurs. */
export default function GameShell({ title, emoji, stats, children }: Props) {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Jeux
        </button>
        <div className={styles.stats}>{stats}</div>
      </div>
      <h1 className={styles.title}><span>{emoji}</span> {title}</h1>
      {children}
    </div>
  )
}

interface ResultProps {
  title: string
  lines: string[]
  isRecord?: boolean
  onReplay: () => void
}

/** Écran de fin commun. */
export function GameResult({ title, lines, isRecord, onReplay }: ResultProps) {
  return (
    <div className={styles.result}>
      <h2 className={styles.resultTitle}>{title}</h2>
      {isRecord && <p className={styles.record}>🏆 Nouveau record !</p>}
      {lines.map(line => <p key={line} className={styles.resultLine}>{line}</p>)}
      <button className={styles.primaryBtn} onClick={onReplay}>Rejouer</button>
    </div>
  )
}

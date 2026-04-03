import type { ReactNode } from 'react'
import type { Categorie, Vegetal } from '../../data/vegetaux'
import styles from './CategorySection.module.css'

interface Props {
  categorie: Categorie
  vegetaux: Vegetal[]
  open: boolean
  onToggle: () => void
  children: ReactNode
}

export default function CategorySection({ categorie, vegetaux, open, onToggle, children }: Props) {
  if (vegetaux.length === 0) return null

  return (
    <section className={styles.section}>
      <button className={`${styles.header} ${open ? styles.headerOpen : ''}`} onClick={onToggle}>
        <div className={styles.headerLeft}>
          <span className={styles.emoji}>{categorie.emoji}</span>
          <span className={styles.name}>
            {categorie.nom.toUpperCase()}
            {categorie.sousTitre && (
              <span className={styles.sousTitre}> {categorie.sousTitre}</span>
            )}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.count}>{vegetaux.length}</span>
          <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>
      {open && (
        <div className={styles.list}>
          {children}
        </div>
      )}
    </section>
  )
}

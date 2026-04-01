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
      <button className={styles.header} onClick={onToggle}>
        <span className={styles.name}>
          {categorie.nom.toUpperCase()}
          {categorie.sousTitre && (
            <span className={styles.sousTitre}> {categorie.sousTitre}</span>
          )}
        </span>
        <span className={styles.emoji}>{categorie.emoji}</span>
      </button>
      {open && (
        <div className={styles.list}>
          {children}
        </div>
      )}
    </section>
  )
}

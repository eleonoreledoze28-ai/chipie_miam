import styles from './RestrictionBadge.module.css'
import type { Vegetal } from '../../data/vegetaux'

const CONFIG = {
  aucune: { label: 'Sans restriction', className: 'green' },
  petite_quantite: { label: 'Petite quantité', className: 'orange' },
  a_eviter: { label: 'À éviter', className: 'red' },
} as const

interface Props {
  restriction: Vegetal['restriction']
  compact?: boolean
}

export default function RestrictionBadge({ restriction, compact = false }: Props) {
  const { label, className } = CONFIG[restriction]
  return (
    <span className={`${styles.badge} ${styles[className]} ${compact ? styles.compact : ''}`}>
      {compact ? (restriction === 'aucune' ? '✓' : restriction === 'petite_quantite' ? '⚠' : '✕') : label}
    </span>
  )
}

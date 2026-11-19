import styles from './PetHearts.module.css'

const EMOJIS = ['💕', '❤️', '💗', '✨']
const COUNT = 4

/**
 * Petits cœurs qui s'envolent à chaque nouvelle valeur de `burst` (à placer dans un parent en
 * position relative). Les cœurs sont recréés à chaque caresse, ce qui relance l'animation.
 */
export default function PetHearts({ burst }: { burst: number }) {
  if (burst === 0) return null

  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => {
        const dx = ((i * 37 + burst * 53) % 100) - 50 // dispersion variée mais stable
        return (
          <span
            key={`${burst}-${i}`}
            className={styles.heart}
            style={{ '--dx': `${dx * 0.9}px`, animationDelay: `${i * 90}ms` } as React.CSSProperties}
            aria-hidden="true"
          >
            {EMOJIS[(burst + i) % EMOJIS.length]}
          </span>
        )
      })}
    </>
  )
}

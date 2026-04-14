import { useState } from 'react'
import styles from './Tutorial.module.css'

const STEPS = [
  {
    emoji: '🐰',
    title: 'Bienvenue !',
    desc: "Salut, je suis Chipie ! Laisse-moi te faire visiter l'app en quelques secondes.",
    nav: null,
  },
  {
    emoji: '📚',
    title: 'Le Guide',
    desc: 'Retrouve tout ce que je peux manger, ce qui est toxique, et les bonnes quantités recommandées.',
    nav: 'Guide',
  },
  {
    emoji: '📔',
    title: 'Le Journal',
    desc: 'Note mes repas chaque jour pour suivre mon alimentation et mes habitudes.',
    nav: 'Journal',
  },
  {
    emoji: '🎮',
    title: 'Les Jeux',
    desc: '16 mini-jeux pour apprendre ce que je mange et s\'amuser ensemble !',
    nav: 'Jeux',
  },
  {
    emoji: '✨',
    title: "C'est parti !",
    desc: 'Tu sais tout maintenant. Bonne aventure avec Chipie !',
    nav: null,
  },
]

export default function Tutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const next = () => {
    if (isLast) { onDone(); return }
    setStep(s => s + 1)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card} key={step}>
        <div className={styles.progress}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i === step ? styles.dotActive : i < step ? styles.dotDone : ''}`}
            />
          ))}
        </div>

        <span className={styles.emoji}>{current.emoji}</span>
        <h2 className={styles.title}>{current.title}</h2>
        <p className={styles.desc}>{current.desc}</p>

        {current.nav && (
          <div className={styles.navHint}>
            <span className={styles.navArrow}>↓</span>
            <span className={styles.navBadge}>{current.nav}</span>
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.nextBtn} onClick={next}>
            {isLast ? '🐰 Commencer !' : 'Suivant →'}
          </button>
          {!isLast && (
            <button className={styles.skipBtn} onClick={onDone}>Passer</button>
          )}
        </div>
      </div>
    </div>
  )
}

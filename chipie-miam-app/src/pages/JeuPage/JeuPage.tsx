import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './JeuPage.module.css'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateRound() {
  const pool = VEGETAUX.filter(v => v.image && !v.image.includes('placeholder'))
  const shuffled = shuffle(pool)
  const correct = shuffled[0]
  const wrongOptions = shuffled.slice(1, 4)
  const options = shuffle([correct, ...wrongOptions])
  return { correct, options }
}

export default function JeuPage() {
  const navigate = useNavigate()
  const [round, setRound] = useState(() => generateRound())
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [showResult, setShowResult] = useState(false)

  const isCorrect = selected === round.correct.id

  const handleSelect = useCallback((id: string) => {
    if (showResult) return
    setSelected(id)
    setShowResult(true)
    setTotal(t => t + 1)
    if (id === round.correct.id) {
      setScore(s => s + 1)
      setStreak(s => {
        const next = s + 1
        setBestStreak(b => Math.max(b, next))
        return next
      })
    } else {
      setStreak(0)
    }
  }, [showResult, round.correct.id])

  const handleNext = useCallback(() => {
    setRound(generateRound())
    setSelected(null)
    setShowResult(false)
  }, [])

  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <h1 className={styles.title}>🎮 Devinette Photo</h1>
      <p className={styles.subtitle}>Quel est cet aliment ?</p>

      {/* Score bar */}
      <div className={styles.scoreBar}>
        <div className={styles.scoreStat}>
          <span className={styles.scoreNum}>{score}/{total}</span>
          <span className={styles.scoreLabel}>Score</span>
        </div>
        <div className={styles.scoreDivider} />
        <div className={styles.scoreStat}>
          <span className={styles.scoreNum}>{accuracy}%</span>
          <span className={styles.scoreLabel}>Précision</span>
        </div>
        <div className={styles.scoreDivider} />
        <div className={styles.scoreStat}>
          <span className={styles.scoreNum}>{streak}🔥</span>
          <span className={styles.scoreLabel}>Série</span>
        </div>
      </div>

      {/* Photo */}
      <div className={styles.photoCard}>
        <img
          src={assetUrl(round.correct.image)}
          alt="Devinez !"
          className={styles.photo}
        />
      </div>

      {/* Options */}
      <div className={styles.options}>
        {round.options.map(v => {
          let optClass = styles.option
          if (showResult) {
            if (v.id === round.correct.id) optClass += ` ${styles.optionCorrect}`
            else if (v.id === selected) optClass += ` ${styles.optionWrong}`
            else optClass += ` ${styles.optionFaded}`
          }
          return (
            <button key={v.id} className={optClass} onClick={() => handleSelect(v.id)}>
              {v.nom}
            </button>
          )
        })}
      </div>

      {/* Result feedback */}
      {showResult && (
        <div className={styles.feedback}>
          <div className={`${styles.feedbackBanner} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
            {isCorrect ? '✅ Bravo !' : `❌ C'était ${round.correct.nom}`}
          </div>
          <p className={styles.feedbackLatin}>{round.correct.nomLatin}</p>
          <button className={styles.nextBtn} onClick={handleNext}>
            Question suivante →
          </button>
        </div>
      )}

      {/* Best streak */}
      {bestStreak > 0 && (
        <p className={styles.bestStreak}>🏆 Meilleure série : {bestStreak}</p>
      )}
    </div>
  )
}

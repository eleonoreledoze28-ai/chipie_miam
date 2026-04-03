import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './JeuPage.module.css'

const MAX_QUESTIONS = 10

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
  const [gameOver, setGameOver] = useState(false)

  const isCorrect = selected === round.correct.id
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0

  const handleSelect = useCallback((id: string) => {
    if (showResult || gameOver) return
    setSelected(id)
    setShowResult(true)
    const newTotal = total + 1
    setTotal(newTotal)
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
  }, [showResult, gameOver, round.correct.id, total])

  const handleNext = useCallback(() => {
    if (total >= MAX_QUESTIONS) {
      setGameOver(true)
      return
    }
    setRound(generateRound())
    setSelected(null)
    setShowResult(false)
  }, [total])

  const handleRestart = useCallback(() => {
    setRound(generateRound())
    setSelected(null)
    setShowResult(false)
    setScore(0)
    setTotal(0)
    setStreak(0)
    setBestStreak(0)
    setGameOver(false)
  }, [])

  // Final screen
  if (gameOver) {
    const emoji = accuracy === 100 ? '🌟' : accuracy >= 80 ? '🏆' : accuracy >= 60 ? '🎉' : accuracy >= 40 ? '👍' : '💪'
    const title = accuracy === 100 ? 'Parfait !' : accuracy >= 80 ? 'Impressionnant !' : accuracy >= 60 ? 'Bien joué !' : accuracy >= 40 ? 'Pas mal !' : 'Bel effort !'
    const message = accuracy === 100
      ? '🐰 Chipie est fière de toi ! Tu connais tous les végétaux par cœur !'
      : accuracy >= 80
        ? '🐰 Chipie te félicite ! Tu es un vrai expert en alimentation lapin !'
        : accuracy >= 60
          ? '🐰 Chipie est contente ! Continue comme ça, tu progresses vite !'
          : accuracy >= 40
            ? '🐰 Chipie t\'encourage ! Explore le guide pour découvrir plus de végétaux.'
            : '🐰 Chipie croit en toi ! Chaque partie te rend plus fort. Réessaie !'

    return (
      <div className={styles.page}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span>Retour</span>
        </button>

        <div className={styles.endScreen}>
          <span className={styles.endEmoji}>{emoji}</span>
          <h1 className={styles.endTitle}>{title}</h1>

          <div className={styles.endStats}>
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{score}/{MAX_QUESTIONS}</span>
              <span className={styles.endStatLabel}>Bonnes réponses</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{accuracy}%</span>
              <span className={styles.endStatLabel}>Précision</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{bestStreak}🔥</span>
              <span className={styles.endStatLabel}>Meilleure série</span>
            </div>
          </div>

          <p className={styles.endMessage}>{message}</p>

          <button className={styles.restartBtn} onClick={handleRestart}>
            🔄 Rejouer
          </button>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            Retour au guide
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <h1 className={styles.title}>🎮 Devinette Photo</h1>
      <p className={styles.subtitle}>Question {total + 1} / {MAX_QUESTIONS}</p>

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

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${(total / MAX_QUESTIONS) * 100}%` }} />
      </div>

      {/* Photo */}
      <div className={styles.photoCard}>
        <img src={assetUrl(round.correct.image)} alt="Devinez !" className={styles.photo} />
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
            {total >= MAX_QUESTIONS ? 'Voir les résultats →' : 'Question suivante →'}
          </button>
        </div>
      )}
    </div>
  )
}

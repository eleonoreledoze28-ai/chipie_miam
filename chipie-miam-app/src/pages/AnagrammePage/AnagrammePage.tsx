import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './AnagrammePage.module.css'

const MAX_QUESTIONS = 10
const TIMER_SECONDS = 30

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function scramble(word: string): string[] {
  const letters = word.toUpperCase().split('')
  let shuffled = shuffle(letters)
  // Make sure it's not the same order
  while (shuffled.join('') === letters.join('') && letters.length > 1) {
    shuffled = shuffle(letters)
  }
  return shuffled
}

function pickVegetal() {
  const pool = VEGETAUX.filter(v => v.nom.length >= 3 && v.nom.length <= 14 && !v.nom.includes(' '))
  return shuffle(pool)[0]
}

export default function AnagrammePage() {
  const navigate = useNavigate()
  const [vegetal, setVegetal] = useState(() => pickVegetal())
  const [letters, setLetters] = useState(() => scramble(vegetal.nom))
  const [guess, setGuess] = useState<number[]>([]) // indices into letters
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [timer, setTimer] = useState(TIMER_SECONDS)
  const timerRef = useRef<number | null>(null)
  const [hint, setHint] = useState(false)

  const answer = vegetal.nom.toUpperCase()
  const currentGuess = guess.map(i => letters[i]).join('')
  const isCorrect = currentGuess === answer
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0

  // Timer
  useEffect(() => {
    if (showResult || gameOver) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    setTimer(TIMER_SECONDS)
    timerRef.current = window.setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [vegetal, showResult, gameOver])

  // Auto-fail on timeout
  useEffect(() => {
    if (timer === 0 && !showResult && !gameOver) {
      setShowResult(true)
      setTotal(t => t + 1)
    }
  }, [timer, showResult, gameOver])

  // Auto-check when all letters placed
  useEffect(() => {
    if (guess.length === letters.length && !showResult) {
      setShowResult(true)
      setTotal(t => t + 1)
      if (currentGuess === answer) {
        setScore(s => s + 1)
      }
    }
  }, [guess, letters.length, showResult, currentGuess, answer])

  const handleLetterClick = useCallback((index: number) => {
    if (showResult || guess.includes(index)) return
    setGuess(prev => [...prev, index])
  }, [showResult, guess])

  const handleRemoveLetter = useCallback((pos: number) => {
    if (showResult) return
    setGuess(prev => prev.filter((_, i) => i !== pos))
  }, [showResult])

  const handleNext = useCallback(() => {
    if (total >= MAX_QUESTIONS) {
      setGameOver(true)
      return
    }
    const v = pickVegetal()
    setVegetal(v)
    setLetters(scramble(v.nom))
    setGuess([])
    setShowResult(false)
    setHint(false)
  }, [total])

  const handleRestart = useCallback(() => {
    const v = pickVegetal()
    setVegetal(v)
    setLetters(scramble(v.nom))
    setGuess([])
    setScore(0)
    setTotal(0)
    setShowResult(false)
    setGameOver(false)
    setHint(false)
  }, [])

  const handleHint = () => {
    setHint(true)
  }

  // End screen
  if (gameOver) {
    const emoji = accuracy >= 80 ? '🌟' : accuracy >= 50 ? '🎉' : '💪'
    const message = accuracy >= 80
      ? '🐰 Chipie est impressionnée ! Tu maîtrises les noms des végétaux !'
      : accuracy >= 50
        ? '🐰 Bien joué ! Chipie est contente de tes progrès !'
        : '🐰 Continue à t\'entraîner, Chipie croit en toi !'

    return (
      <div className={styles.page}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span>Retour</span>
        </button>
        <div className={styles.endScreen}>
          <span className={styles.endEmoji}>{emoji}</span>
          <h1 className={styles.endTitle}>{accuracy >= 80 ? 'Excellent !' : accuracy >= 50 ? 'Bien joué !' : 'Bel effort !'}</h1>
          <div className={styles.endStats}>
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{score}/{MAX_QUESTIONS}</span>
              <span className={styles.endStatLabel}>Trouvés</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{accuracy}%</span>
              <span className={styles.endStatLabel}>Précision</span>
            </div>
          </div>
          <p className={styles.endMessage}>{message}</p>
          <button className={styles.restartBtn} onClick={handleRestart}>🔄 Rejouer</button>
          <button className={styles.backBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <h1 className={styles.title}>🔤 Mot Mélangé</h1>
      <p className={styles.subtitle}>Question {total + 1}/{MAX_QUESTIONS}</p>

      {/* Score + Timer */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{score}/{total}</span>
          <span className={styles.statLabel}>Score</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={`${styles.statNum} ${timer <= 5 ? styles.timerUrgent : ''}`}>{timer}s</span>
          <span className={styles.statLabel}>Temps</span>
        </div>
      </div>

      {/* Image hint */}
      <div className={styles.imageArea}>
        <img src={assetUrl(vegetal.image)} alt="" className={`${styles.hintImage} ${hint ? '' : styles.hintHidden}`} />
        {!hint && !showResult && (
          <button className={styles.hintBtn} onClick={handleHint}>
            👁️ Voir l'indice
          </button>
        )}
      </div>

      {/* Answer slots */}
      <div className={styles.answerSlots}>
        {letters.map((_, i) => {
          const filled = i < guess.length
          return (
            <button
              key={i}
              className={`${styles.slot} ${filled ? styles.slotFilled : ''} ${showResult && isCorrect ? styles.slotCorrect : ''} ${showResult && !isCorrect && filled ? styles.slotWrong : ''}`}
              onClick={() => filled && handleRemoveLetter(i)}
            >
              {filled ? guess.map(idx => letters[idx])[i] : ''}
            </button>
          )
        })}
      </div>

      {/* Show correct answer if wrong */}
      {showResult && !isCorrect && (
        <p className={styles.correctAnswer}>{answer}</p>
      )}

      {/* Available letters */}
      {!showResult && (
        <div className={styles.letterPool}>
          {letters.map((letter, i) => (
            <button
              key={i}
              className={`${styles.letter} ${guess.includes(i) ? styles.letterUsed : ''}`}
              onClick={() => handleLetterClick(i)}
              disabled={guess.includes(i)}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {/* Feedback + Next */}
      {showResult && (
        <div className={styles.feedback}>
          <div className={`${styles.feedbackBanner} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
            {isCorrect ? '✅ Bravo !' : timer === 0 ? '⏰ Temps écoulé !' : `❌ C'était ${vegetal.nom}`}
          </div>
          <button className={styles.nextBtn} onClick={handleNext}>
            {total >= MAX_QUESTIONS ? 'Voir les résultats →' : 'Mot suivant →'}
          </button>
        </div>
      )}
    </div>
  )
}

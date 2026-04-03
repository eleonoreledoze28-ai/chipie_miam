import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './AnagrammePage.module.css'

const MAX_QUESTIONS = 10

type Difficulty = 'easy' | 'normal' | 'hard'

const LEVELS = {
  easy: { label: 'Facile', emoji: '🌱', desc: 'Mots courts, image visible, 40s', timer: 40, minLen: 3, maxLen: 6, showImage: true },
  normal: { label: 'Normal', emoji: '🌿', desc: 'Mots variés, indice caché, 30s', timer: 30, minLen: 3, maxLen: 14, showImage: false },
  hard: { label: 'Difficile', emoji: '🔥', desc: 'Mots longs, pas d\'indice, 20s', timer: 20, minLen: 7, maxLen: 20, showImage: false },
}

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
  while (shuffled.join('') === letters.join('') && letters.length > 1) {
    shuffled = shuffle(letters)
  }
  return shuffled
}

function pickVegetal(minLen: number, maxLen: number) {
  const pool = VEGETAUX.filter(v => {
    const len = v.nom.length
    return len >= minLen && len <= maxLen && !v.nom.includes(' ')
  })
  if (pool.length === 0) {
    // Fallback to any single-word vegetal
    const fallback = VEGETAUX.filter(v => !v.nom.includes(' '))
    return shuffle(fallback)[0]
  }
  return shuffle(pool)[0]
}

export default function AnagrammePage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [vegetal, setVegetal] = useState(VEGETAUX[0])
  const [letters, setLetters] = useState<string[]>([])
  const [guess, setGuess] = useState<number[]>([])
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [timer, setTimer] = useState(30)
  const timerRef = useRef<number | null>(null)
  const [hint, setHint] = useState(false)

  const level = difficulty ? LEVELS[difficulty] : null
  const answer = vegetal.nom.toUpperCase()
  const currentGuess = guess.map(i => letters[i]).join('')
  const isCorrect = currentGuess === answer
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0

  const startGame = (diff: Difficulty) => {
    const cfg = LEVELS[diff]
    setDifficulty(diff)
    const v = pickVegetal(cfg.minLen, cfg.maxLen)
    setVegetal(v)
    setLetters(scramble(v.nom))
    setGuess([])
    setScore(0)
    setTotal(0)
    setShowResult(false)
    setGameOver(false)
    setHint(cfg.showImage)
    setTimer(cfg.timer)
  }

  // Timer
  useEffect(() => {
    if (showResult || gameOver || !difficulty) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
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
  }, [vegetal, showResult, gameOver, difficulty])

  // Auto-fail on timeout
  useEffect(() => {
    if (timer === 0 && !showResult && !gameOver && difficulty) {
      setShowResult(true)
      setTotal(t => t + 1)
    }
  }, [timer, showResult, gameOver, difficulty])

  // Auto-check when all letters placed
  useEffect(() => {
    if (guess.length === letters.length && letters.length > 0 && !showResult) {
      setShowResult(true)
      setTotal(t => t + 1)
      if (currentGuess === answer) setScore(s => s + 1)
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
    if (!level) return
    const v = pickVegetal(level.minLen, level.maxLen)
    setVegetal(v)
    setLetters(scramble(v.nom))
    setGuess([])
    setShowResult(false)
    setHint(level.showImage)
    setTimer(level.timer)
  }, [total, level])

  const handleRestart = useCallback(() => {
    if (!difficulty) return
    startGame(difficulty)
  }, [difficulty])

  // ========== Level select ==========
  if (!difficulty) {
    return (
      <div className={styles.page}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span>Retour</span>
        </button>
        <div className={styles.levelScreen}>
          <span className={styles.levelEmoji}>🔤</span>
          <h1 className={styles.levelTitle}>Mot Mélangé</h1>
          <p className={styles.levelSubtitle}>Choisissez votre niveau</p>
          <div className={styles.levelList}>
            {(['easy', 'normal', 'hard'] as const).map(diff => {
              const cfg = LEVELS[diff]
              return (
                <button key={diff} className={styles.levelCard} onClick={() => startGame(diff)}>
                  <span className={styles.levelCardEmoji}>{cfg.emoji}</span>
                  <div className={styles.levelCardInfo}>
                    <span className={styles.levelCardName}>{cfg.label}</span>
                    <span className={styles.levelCardDesc}>{cfg.desc}</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18" className={styles.levelArrow}>
                    <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ========== End screen ==========
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
          <span className={styles.endDifficulty}>{level!.emoji} {level!.label}</span>
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
          <button className={styles.restartBtn} onClick={handleRestart}>🔄 Rejouer ({level!.label})</button>
          <button className={styles.restartBtn} onClick={() => setDifficulty(null)}>🎚️ Changer de niveau</button>
          <button className={styles.backBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
        </div>
      </div>
    )
  }

  // ========== Game ==========
  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <h1 className={styles.title}>🔤 Mot Mélangé</h1>
      <p className={styles.subtitle}>Question {total + 1}/{MAX_QUESTIONS} — {level!.emoji} {level!.label}</p>

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

      {/* Image hint (only if not hard mode) */}
      {difficulty !== 'hard' && (
        <div className={styles.imageArea}>
          <img src={assetUrl(vegetal.image)} alt="" className={`${styles.hintImage} ${hint ? '' : styles.hintHidden}`} />
          {!hint && !showResult && (
            <button className={styles.hintBtn} onClick={() => setHint(true)}>
              👁️ Voir l'indice
            </button>
          )}
        </div>
      )}

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

      {showResult && !isCorrect && <p className={styles.correctAnswer}>{answer}</p>}

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

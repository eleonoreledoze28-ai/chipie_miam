import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES, type Vegetal } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './QuizPage.module.css'

// ===== Audio =====
function useQuizAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const MUTE_KEY = 'chipie-quiz-muted'
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])
  const isMuted = useCallback(() => { try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false } }, [MUTE_KEY])
  const vibrate = useCallback((p: number | number[]) => { try { navigator?.vibrate?.(p) } catch { /* */ } }, [])
  const tone = useCallback((f: number, d: number, t: OscillatorType = 'sine', v = 0.1) => {
    if (isMuted()) return
    try { const c = getCtx(); const o = c.createOscillator(); const g = c.createGain(); o.type = t; o.frequency.setValueAtTime(f, c.currentTime); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(g).connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + d) } catch { /* */ }
  }, [getCtx, isMuted])
  const playCorrect = useCallback(() => { tone(880, 0.1); setTimeout(() => tone(1100, 0.12, 'sine', 0.08), 70); vibrate(20) }, [tone, vibrate])
  const playWrong = useCallback(() => { tone(200, 0.15, 'sawtooth', 0.1); setTimeout(() => tone(150, 0.2, 'sawtooth', 0.08), 100); vibrate(100) }, [tone, vibrate])
  const playStreak = useCallback((n: number) => { tone(600 + n * 60, 0.08, 'sine', 0.08) }, [tone])
  const playGameOver = useCallback(() => { tone(300, 0.3, 'sawtooth', 0.07); setTimeout(() => tone(200, 0.4, 'sawtooth', 0.05), 200); vibrate([80, 40, 150]) }, [tone, vibrate])
  const playMilestone = useCallback(() => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.08), i * 80)); vibrate([30, 20, 30, 20, 60]) }, [tone, vibrate])
  const playPowerup = useCallback(() => { tone(700, 0.1, 'sine', 0.1); setTimeout(() => tone(900, 0.15, 'sine', 0.08), 80); vibrate([20, 15, 30]) }, [tone, vibrate])
  return useMemo(() => ({ playCorrect, playWrong, playStreak, playGameOver, playMilestone, playPowerup, isMuted, MUTE_KEY }),
    [playCorrect, playWrong, playStreak, playGameOver, playMilestone, playPowerup, isMuted, MUTE_KEY])
}

// ===== Helpers =====
const catMap = new Map(CATEGORIES.map(c => [c.id, c]))
const BEST_KEY = 'chipie-quiz-best'

function getPool(): Vegetal[] {
  return VEGETAUX.filter(v => v.image && !v.image.includes('placeholder'))
}

function pickQuestion(pool: Vegetal[]): { vegetal: Vegetal; answer: boolean } {
  const v = pool[Math.floor(Math.random() * pool.length)]
  return { vegetal: v, answer: v.restriction === 'aucune' }
}

function loadBest(): number {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 }
}

function saveBest(score: number): boolean {
  const prev = loadBest()
  if (score > prev) { localStorage.setItem(BEST_KEY, String(score)); return true }
  return false
}

// Multiplier tiers
function getMultiplier(streak: number): number {
  if (streak >= 15) return 4
  if (streak >= 10) return 3
  if (streak >= 5) return 2
  if (streak >= 3) return 1.5
  return 1
}

// Difficulty tier label
function getTier(q: number): { label: string; emoji: string } {
  if (q >= 40) return { label: 'Impossible', emoji: '💀' }
  if (q >= 30) return { label: 'Expert', emoji: '🏆' }
  if (q >= 20) return { label: 'Difficile', emoji: '🔥' }
  if (q >= 10) return { label: 'Normal', emoji: '🌿' }
  return { label: 'Facile', emoji: '🌱' }
}

// Milestone rewards
const MILESTONES: Record<number, { type: 'life' | 'freeze' | 'double'; label: string; emoji: string }> = {
  10: { type: 'life', label: '+1 vie !', emoji: '❤️' },
  20: { type: 'freeze', label: 'Temps gel\u00e9 3s !', emoji: '❄️' },
  30: { type: 'life', label: '+1 vie !', emoji: '❤️' },
  40: { type: 'double', label: 'Double pts 5 questions !', emoji: '⭐' },
  50: { type: 'life', label: '+1 vie !', emoji: '❤️' },
}

// Fun facts between milestones
const FACTS = [
  '80% de l\'alimentation d\'un lapin doit \u00eatre du foin !',
  'Un lapin a besoin de 5+ v\u00e9g\u00e9taux diff\u00e9rents par semaine.',
  'Les dents d\'un lapin poussent de 12cm par an !',
  'Le pissenlit est l\'un des aliments pr\u00e9f\u00e9r\u00e9s des lapins.',
  'Les carottes sont en r\u00e9alit\u00e9 trop sucr\u00e9es pour \u00eatre donn\u00e9es souvent.',
]

type Screen = 'menu' | 'play' | 'end'

const BASE_TIME = 5000
const MIN_TIME = 2000
const TIME_DECAY = 80

export default function QuizPage() {
  const navigate = useNavigate()
  const audio = useQuizAudio()
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem(audio.MUTE_KEY) === '1' } catch { return false } })
  const pool = useMemo(getPool, [])

  const [screen, setScreen] = useState<Screen>('menu')
  const [question, setQuestion] = useState(() => pickQuestion(pool))
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [maxLives, setMaxLives] = useState(3)
  const [timeLeft, setTimeLeft] = useState(BASE_TIME)
  const [maxTime, setMaxTime] = useState(BASE_TIME)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null)
  const [shield, setShield] = useState(false)
  const [doublePts, setDoublePts] = useState(0) // questions remaining with double pts
  const [frozen, setFrozen] = useState(false)
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null)
  const [factToast, setFactToast] = useState<string | null>(null)
  const [scorePop, setScorePop] = useState(false)
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchRef = useRef<{ x: number; y: number } | null>(null)

  const toggleMute = useCallback(() => {
    setMuted(prev => { const n = !prev; try { localStorage.setItem(audio.MUTE_KEY, n ? '1' : '0') } catch { /* */ } return n })
  }, [audio.MUTE_KEY])

  const nextQuestion = useCallback(() => {
    setQuestion(pickQuestion(pool))
    setFeedback(null)
    setSwipeDir(null)
    setPointsEarned(null)
    const newMax = Math.max(MIN_TIME, BASE_TIME - questionsAnswered * TIME_DECAY)
    setMaxTime(newMax)
    setTimeLeft(frozen ? newMax : newMax)
  }, [pool, questionsAnswered, frozen])

  const startGame = useCallback(() => {
    setScore(0); setStreak(0); setBestStreak(0); setLives(3); setMaxLives(3)
    setQuestionsAnswered(0); setIsNewRecord(false); setMaxTime(BASE_TIME); setTimeLeft(BASE_TIME)
    setFeedback(null); setSwipeDir(null); setShield(false); setDoublePts(0); setFrozen(false)
    setMilestoneToast(null); setFactToast(null); setPointsEarned(null)
    setQuestion(pickQuestion(pool)); setScreen('play')
  }, [pool])

  // Timer
  useEffect(() => {
    if (screen !== 'play' || feedback || frozen) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) { handleAnswer(null); return 0 }
        return prev - 100
      })
    }, 100)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, feedback, frozen])

  // Check milestones after each question
  const checkMilestone = useCallback((qNum: number) => {
    const m = MILESTONES[qNum]
    if (!m) {
      // Show random fact every 7 questions (not on milestones)
      if (qNum > 0 && qNum % 7 === 0) {
        const fact = FACTS[Math.floor(Math.random() * FACTS.length)]
        setFactToast(fact)
        setTimeout(() => setFactToast(null), 2500)
      }
      return
    }
    audio.playMilestone()
    setMilestoneToast(`${m.emoji} ${m.label}`)
    setTimeout(() => setMilestoneToast(null), 1500)

    if (m.type === 'life') {
      setLives(l => l + 1)
      setMaxLives(ml => ml + 1)
    } else if (m.type === 'freeze') {
      setFrozen(true)
      setTimeout(() => setFrozen(false), 3000)
    } else if (m.type === 'double') {
      setDoublePts(5)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAnswer = useCallback((playerSaid: boolean | null) => {
    if (feedback || screen !== 'play') return

    const correct = playerSaid === question.answer

    if (correct) {
      audio.playCorrect()
      const mult = getMultiplier(streak + 1)
      const doubleBonus = doublePts > 0 ? 2 : 1
      const pts = Math.round(10 * mult * doubleBonus)
      setScore(s => s + pts)
      setPointsEarned(pts)
      setScorePop(true); setTimeout(() => setScorePop(false), 300)
      setStreak(s => { const n = s + 1; if (n > bestStreak) setBestStreak(n); audio.playStreak(n); return n })
      setFeedback('correct')
      setSwipeDir(playerSaid ? 'right' : 'left')
      if (doublePts > 0) setDoublePts(d => d - 1)
    } else {
      if (shield) {
        // Shield absorbs the hit
        audio.playPowerup()
        setShield(false)
        setFeedback('correct') // show as saved
        setMilestoneToast('🛡️ Bouclier utilis\u00e9 !')
        setTimeout(() => setMilestoneToast(null), 1000)
      } else {
        audio.playWrong()
        setStreak(0)
        setLives(l => l - 1)
        setFeedback('wrong')
      }
      setSwipeDir(playerSaid === false ? 'left' : playerSaid === true ? 'right' : null)
    }

    const nextQ = questionsAnswered + 1
    setQuestionsAnswered(nextQ)

    setTimeout(() => {
      setLives(l => {
        if (l <= 0) { setScreen('end'); return l }
        checkMilestone(nextQ)
        // Give shield at streak 10
        if (correct && (streak + 1) === 10 && !shield) {
          setShield(true)
          audio.playPowerup()
          setMilestoneToast('🛡️ Bouclier gagn\u00e9 !')
          setTimeout(() => setMilestoneToast(null), 1200)
        }
        nextQuestion()
        return l
      })
    }, 700)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback, screen, question, streak, bestStreak, shield, doublePts, questionsAnswered])

  // End game
  useEffect(() => {
    if (screen === 'end') {
      audio.playGameOver()
      setIsNewRecord(saveBest(score))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  // Keyboard
  useEffect(() => {
    if (screen !== 'play') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); handleAnswer(false) }
      if (e.key === 'ArrowRight') { e.preventDefault(); handleAnswer(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, handleAnswer])

  // Touch swipe
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    touchRef.current = null
    if (Math.abs(dx) > 40) handleAnswer(dx > 0)
  }, [handleAnswer])

  const cat = catMap.get(question.vegetal.categorie)
  const timerPercent = maxTime > 0 ? (timeLeft / maxTime) * 100 : 0
  const best = loadBest()
  const mult = getMultiplier(streak)
  const tier = getTier(questionsAnswered)
  const nearRecord = !isNewRecord && best > 0 && score > best * 0.7 && score <= best

  // ===== RENDER =====

  if (screen === 'menu') {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.back} onClick={() => navigate('/jeu')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            <span>Retour</span>
          </button>
          <button className={styles.muteBtn} onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
        </div>

        <div className={styles.menuScreen}>
          <span className={styles.menuEmoji}>⚡</span>
          <h1 className={styles.menuTitle}>Quiz Vrai/Faux</h1>
          <p className={styles.menuSubtitle}>Cet aliment est-il bon pour Chipie ?</p>

          <div className={styles.menuRules}>
            <div className={styles.ruleItem}><span>👉</span> Swipe droite ou ✅ = Bon</div>
            <div className={styles.ruleItem}><span>👈</span> Swipe gauche ou ❌ = Dangereux</div>
            <div className={styles.ruleItem}><span>🔥</span> Streak = multiplicateur x1.5 → x4</div>
            <div className={styles.ruleItem}><span>🎁</span> Paliers = bonus vie, gel, double pts</div>
            <div className={styles.ruleItem}><span>🛡️</span> Streak 10 = bouclier (absorbe 1 erreur)</div>
          </div>

          {best > 0 && <div className={styles.menuBest}>Record : {best} pts</div>}
          <button className={styles.playBtn} onClick={startGame}>Jouer</button>
        </div>
      </div>
    )
  }

  if (screen === 'end') {
    const almostBeat = !isNewRecord && best > 0 && score > best * 0.8
    return (
      <div className={styles.page}>
        <div className={styles.endScreen}>
          <span className={styles.endEmoji}>{score >= 200 ? '👑' : score >= 100 ? '🏆' : score >= 50 ? '🎉' : '😢'}</span>
          <h2 className={styles.endTitle}>Partie terminée !</h2>

          {isNewRecord && <div className={styles.newRecord}>Nouveau record !</div>}
          {almostBeat && <div className={styles.almostRecord}>A {best - score} pts du record !</div>}

          <div className={styles.endStats}>
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{score}</span>
              <span className={styles.endStatLabel}>score</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{questionsAnswered}</span>
              <span className={styles.endStatLabel}>questions</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{bestStreak}</span>
              <span className={styles.endStatLabel}>streak</span>
            </div>
          </div>

          <div className={styles.endTier}>Niveau atteint : {tier.emoji} {tier.label}</div>

          <div className={styles.endActions}>
            <button className={styles.playBtn} onClick={startGame}>Rejouer</button>
            <button className={styles.menuBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
          </div>
        </div>
      </div>
    )
  }

  // ===== Play screen =====
  return (
    <div className={styles.page} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          <span>Retour</span>
        </button>
        <div className={styles.livesRow}>
          {Array.from({ length: maxLives }, (_, i) => (
            <span key={i} className={`${styles.heart} ${i >= lives ? styles.heartLost : ''}`}>❤️</span>
          ))}
          {shield && <span className={styles.shieldIcon}>🛡️</span>}
        </div>
        <button className={styles.muteBtn} onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
      </div>

      {/* Timer bar */}
      <div className={styles.timerBarWrap}>
        <div className={`${styles.timerBar} ${timerPercent < 30 ? styles.timerBarUrgent : ''} ${frozen ? styles.timerBarFrozen : ''}`}
          style={{ width: `${timerPercent}%` }} />
      </div>

      {/* Toasts */}
      {milestoneToast && <div className={styles.milestoneToast}>{milestoneToast}</div>}
      {factToast && <div className={styles.factToast}>💡 {factToast}</div>}

      {/* Score + streak + multiplier + tier */}
      <div className={styles.scoreRow}>
        <span className={`${styles.scoreNum} ${scorePop ? styles.scoreNumPop : ''}`}>{score}</span>
        <span className={styles.scoreLabel}>pts</span>
        {pointsEarned && feedback === 'correct' && (
          <span className={styles.pointsEarned}>+{pointsEarned}</span>
        )}
      </div>

      <div className={styles.infoRow}>
        <span className={styles.tierBadge}>{tier.emoji} {tier.label}</span>
        {mult > 1 && <span className={styles.multBadge}>x{mult}</span>}
        {doublePts > 0 && <span className={styles.doubleBadge}>⭐ x2 ({doublePts})</span>}
        {streak > 0 && <span className={`${styles.streakBadge} ${streak >= 5 ? styles.streakFire : ''}`}>🔥 {streak}</span>}
      </div>

      {/* Question card */}
      <div className={`${styles.cardArea} ${swipeDir === 'left' ? styles.cardSwipeLeft : ''} ${swipeDir === 'right' ? styles.cardSwipeRight : ''}`}>
        <div className={`${styles.questionCard} ${feedback === 'correct' ? styles.cardCorrect : ''} ${feedback === 'wrong' ? styles.cardWrong : ''}`}>
          <img src={assetUrl(question.vegetal.image)} alt="" className={styles.questionImg} />
          <h2 className={styles.questionName}>{question.vegetal.nom}</h2>
          <span className={styles.questionCat}>{cat?.emoji} {cat?.nom}</span>
          <p className={styles.questionPrompt}>Bon pour Chipie ?</p>

          {feedback && (
            <div className={`${styles.feedbackOverlay} ${feedback === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong}`}>
              <span className={styles.feedbackEmoji}>{feedback === 'correct' ? '✅' : '❌'}</span>
              <span className={styles.feedbackText}>
                {feedback === 'correct' ? 'Correct !' : question.answer ? 'C\'est bon !' : 'Danger / Modération !'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Swipe hint */}
      <div className={styles.swipeHint}>
        <span className={styles.swipeLeft}>👈 Non</span>
        <span className={styles.questionNum}>Q{questionsAnswered + 1}</span>
        <span className={styles.swipeRight}>Oui 👉</span>
      </div>

      {/* Answer buttons */}
      <div className={styles.answerBtns}>
        <button className={styles.btnDanger} onClick={() => handleAnswer(false)} disabled={!!feedback}>
          ❌ Non
        </button>
        <button className={styles.btnSafe} onClick={() => handleAnswer(true)} disabled={!!feedback}>
          ✅ Oui
        </button>
      </div>

      {/* Near record indicator */}
      {nearRecord && <div className={styles.nearRecord}>🔥 Proche du record ({best} pts) !</div>}
    </div>
  )
}

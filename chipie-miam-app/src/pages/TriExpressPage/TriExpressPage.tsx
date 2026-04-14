import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, type Vegetal } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './TriExpressPage.module.css'

const DURATION = 30
const BEST_KEY = 'chipie-tri-best'

function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 } }
function saveBest(s: number) { const p = loadBest(); if (s > p) { localStorage.setItem(BEST_KEY, String(s)); return true } return false }
function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }

type Screen = 'menu' | 'play' | 'end'
type Feedback = 'correct' | 'wrong' | null

export default function TriExpressPage() {
  const navigate = useNavigate()

  const pool = useMemo(() => {
    const all = VEGETAUX.filter(v => v.image && !v.image.includes('placeholder'))
    return [
      ...all.filter(v => v.restriction === 'aucune'),
      ...all.filter(v => v.restriction === 'a_eviter'),
    ]
  }, [])

  const [screen, setScreen] = useState<Screen>('menu')
  const [deck, setDeck] = useState<Vegetal[]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [newRecord, setNewRecord] = useState(false)
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef<number | null>(null)
  const answeringRef = useRef(false)

  const multiplier = streak >= 5 ? 3 : streak >= 3 ? 2 : 1
  const current = deck[idx % Math.max(deck.length, 1)]

  const startGame = useCallback(() => {
    setDeck(shuffle(pool))
    setIdx(0)
    setScore(0)
    setStreak(0)
    setCorrect(0)
    setTotal(0)
    setTimeLeft(DURATION)
    setFeedback(null)
    setSwipeDir(null)
    setNewRecord(false)
    answeringRef.current = false
    setScreen('play')
  }, [pool])

  useEffect(() => {
    if (screen !== 'play') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setScreen('end'); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [screen])

  useEffect(() => {
    if (screen === 'end') setNewRecord(saveBest(score))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  const answer = useCallback((choice: 'good' | 'bad') => {
    if (screen !== 'play' || answeringRef.current || !current) return
    answeringRef.current = true

    const isGood = current.restriction !== 'a_eviter'
    const isCorrect = (choice === 'good') === isGood

    setSwipeDir(choice === 'good' ? 'right' : 'left')
    setTotal(t => t + 1)

    if (isCorrect) {
      const mult = streak >= 5 ? 3 : streak >= 3 ? 2 : 1
      setScore(s => Math.max(0, s + 10 * mult))
      setStreak(s => s + 1)
      setCorrect(c => c + 1)
      setFeedback('correct')
    } else {
      setScore(s => Math.max(0, s - 5))
      setStreak(0)
      setFeedback('wrong')
    }

    setTimeout(() => {
      setFeedback(null)
      setSwipeDir(null)
      setIdx(i => i + 1)
      answeringRef.current = false
    }, 320)
  }, [screen, current, streak])

  useEffect(() => {
    if (screen !== 'play') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') answer('bad')
      if (e.key === 'ArrowRight') answer('good')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, answer])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) > 40) answer(dx > 0 ? 'good' : 'bad')
  }, [answer])

  const best = loadBest()
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  // ===== MENU =====
  if (screen === 'menu') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Retour
      </button>
      <div className={styles.menuScreen}>
        <span className={styles.menuEmoji}>⚡</span>
        <h1 className={styles.menuTitle}>Tri Express</h1>
        <p className={styles.menuSub}>Bon ou toxique pour Chipie ?</p>
        <div className={styles.rules}>
          <div className={styles.rule}><span>➡️</span> Glisse à droite : bon pour Chipie</div>
          <div className={styles.rule}><span>⬅️</span> Glisse à gauche : toxique !</div>
          <div className={styles.rule}><span>⚡</span> 30 secondes chrono</div>
          <div className={styles.rule}><span>🔥</span> Combo x2 (3 bonnes) et x3 (5 bonnes)</div>
          <div className={styles.rule}><span>💸</span> -5 pts en cas d'erreur</div>
        </div>
        {best > 0 && <div className={styles.menuBest}>Record : {best} pts</div>}
        <button className={styles.playBtn} onClick={startGame}>Jouer</button>
      </div>
    </div>
  )

  // ===== END =====
  if (screen === 'end') return (
    <div className={styles.page}>
      <div className={styles.endScreen}>
        <span className={styles.endEmoji}>{score >= 200 ? '👑' : score >= 100 ? '🏆' : score >= 50 ? '🎉' : '💪'}</span>
        <h2 className={styles.endTitle}>Temps écoulé !</h2>
        {newRecord && <div className={styles.newRecord}>Nouveau record !</div>}
        <div className={styles.endStats}>
          <div className={styles.stat}><span className={styles.statNum}>{score}</span><span className={styles.statLabel}>score</span></div>
          <div className={styles.statDiv} />
          <div className={styles.stat}><span className={styles.statNum}>{correct}/{total}</span><span className={styles.statLabel}>correct</span></div>
          <div className={styles.statDiv} />
          <div className={styles.stat}><span className={styles.statNum}>{accuracy}%</span><span className={styles.statLabel}>précision</span></div>
        </div>
        {best > 0 && !newRecord && <div className={styles.endRecord}>Record : {best} pts</div>}
        <div className={styles.endActions}>
          <button className={styles.playBtn} onClick={startGame}>Rejouer</button>
          <button className={styles.menuBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
        </div>
      </div>
    </div>
  )

  // ===== PLAY =====
  return (
    <div className={styles.page} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <span className={styles.scoreDisp}>{score} pts</span>
        {streak >= 3 && <span className={styles.combo}>x{multiplier} 🔥</span>}
        <span className={`${styles.timer} ${timeLeft <= 5 ? styles.timerUrgent : ''}`}>{timeLeft}s</span>
      </div>

      {/* Timer bar */}
      <div className={styles.timerTrack}>
        <div className={styles.timerFill} style={{ width: `${(timeLeft / DURATION) * 100}%`, background: timeLeft <= 5 ? '#ff3b30' : 'var(--accent-orange)' }} />
      </div>

      {/* Card */}
      {current && (
        <div className={`${styles.card} ${swipeDir === 'left' ? styles.cardLeft : ''} ${swipeDir === 'right' ? styles.cardRight : ''} ${feedback === 'correct' ? styles.cardCorrect : ''} ${feedback === 'wrong' ? styles.cardWrong : ''}`}>
          <img src={assetUrl(current.image)} alt={current.nom} className={styles.cardImg} />
          <p className={styles.cardName}>{current.nom}</p>
          <p className={styles.cardLatin}>{current.nomLatin}</p>
        </div>
      )}

      {/* Feedback flash */}
      {feedback && (
        <div className={`${styles.flash} ${feedback === 'correct' ? styles.flashOk : styles.flashKo}`}>
          {feedback === 'correct' ? '✓' : '✗'}
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.btnRow}>
        <button className={styles.badBtn} onClick={() => answer('bad')}>
          <span>☠️</span>
          <span>Toxique</span>
        </button>
        <button className={styles.goodBtn} onClick={() => answer('good')}>
          <span>Bon</span>
          <span>🥕</span>
        </button>
      </div>
      <p className={styles.hint}>ou glisse la carte ←→</p>
    </div>
  )
}

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, type Vegetal } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './TriExpressPage.module.css'

const DURATION = 30
const BEST_KEY = 'chipie-tri-best'
const THROW_THRESHOLD = 90
const HINT_THRESHOLD = 50

function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 } }
function saveBest(s: number) { const p = loadBest(); if (s > p) { localStorage.setItem(BEST_KEY, String(s)); return true } return false }
function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

// ===== Audio + vibration =====
function useTriAudio() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return ctxRef.current
  }, [])

  const beep = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.3) => {
    try {
      const ac = getCtx()
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(gainVal, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
      osc.start()
      osc.stop(ac.currentTime + duration)
    } catch { /* ignore */ }
  }, [getCtx])

  const playCorrect = useCallback(() => {
    beep(523, 0.08)
    setTimeout(() => beep(784, 0.12), 80)
    try { navigator.vibrate(40) } catch { /* ignore */ }
  }, [beep])

  const playWrong = useCallback(() => {
    beep(200, 0.18, 'sawtooth', 0.25)
    try { navigator.vibrate([80, 30, 80]) } catch { /* ignore */ }
  }, [beep])

  const playDoubt = useCallback(() => {
    beep(392, 0.1, 'sine', 0.2)
    try { navigator.vibrate(25) } catch { /* ignore */ }
  }, [beep])

  return { playCorrect, playWrong, playDoubt }
}

type Screen = 'menu' | 'play' | 'end'
type Feedback = 'correct' | 'wrong' | 'doubt' | null
type FlyDir = 'left' | 'right' | null

export default function TriExpressPage() {
  const navigate = useNavigate()
  const { playCorrect, playWrong, playDoubt } = useTriAudio()

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
  const [flyDir, setFlyDir] = useState<FlyDir>(null)
  const [dragX, setDragX] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const answeringRef = useRef(false)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)

  const multiplier = streak >= 5 ? 3 : streak >= 3 ? 2 : 1
  const currentCard = deck[idx % Math.max(deck.length, 1)]

  const startGame = useCallback(() => {
    const d = shuffle(pool)
    setDeck(d)
    setIdx(0)
    setScore(0)
    setStreak(0)
    setCorrect(0)
    setTotal(0)
    setTimeLeft(DURATION)
    setFeedback(null)
    setFlyDir(null)
    setDragX(0)
    setNewRecord(false)
    answeringRef.current = false
    isDraggingRef.current = false
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

  // Insert 2 copies of a hard card back into the deck
  const insertHardCard = useCallback((card: Vegetal, currentIdx: number) => {
    setDeck(prev => {
      const d = [...prev]
      const at1 = Math.min(currentIdx + 3, d.length)
      const at2 = Math.min(currentIdx + 6, d.length)
      d.splice(at2, 0, card)
      d.splice(at1, 0, card)
      return d
    })
  }, [])

  const answer = useCallback((choice: 'good' | 'bad' | 'doubt') => {
    if (screen !== 'play' || answeringRef.current || !currentCard) return
    answeringRef.current = true
    isDraggingRef.current = false
    setDragX(0)

    if (choice === 'doubt') {
      setScore(s => Math.max(0, s - 3))
      setStreak(0)
      setFeedback('doubt')
      setTotal(t => t + 1)
      playDoubt()
      insertHardCard(currentCard, idx)
      setTimeout(() => {
        setFeedback(null)
        setIdx(i => i + 1)
        answeringRef.current = false
      }, 400)
      return
    }

    const isGood = currentCard.restriction !== 'a_eviter'
    const isCorrect = (choice === 'good') === isGood

    setFlyDir(choice === 'good' ? 'right' : 'left')
    setTotal(t => t + 1)

    if (isCorrect) {
      const mult = streak >= 5 ? 3 : streak >= 3 ? 2 : 1
      setScore(s => s + 10 * mult)
      setStreak(s => s + 1)
      setCorrect(c => c + 1)
      setFeedback('correct')
      playCorrect()
    } else {
      setScore(s => Math.max(0, s - 5))
      setStreak(0)
      setFeedback('wrong')
      playWrong()
      insertHardCard(currentCard, idx)
    }

    setTimeout(() => {
      setFeedback(null)
      setFlyDir(null)
      setIdx(i => i + 1)
      answeringRef.current = false
    }, 350)
  }, [screen, currentCard, streak, idx, insertHardCard, playCorrect, playWrong, playDoubt])

  useEffect(() => {
    if (screen !== 'play') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') answer('bad')
      if (e.key === 'ArrowRight') answer('good')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, answer])

  // ===== Drag / pointer handlers =====
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (answeringRef.current || screen !== 'play') return
    isDraggingRef.current = true
    dragStartXRef.current = e.clientX
    pointerIdRef.current = e.pointerId
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [screen])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || e.pointerId !== pointerIdRef.current) return
    setDragX(e.clientX - dragStartXRef.current)
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || e.pointerId !== pointerIdRef.current) return
    isDraggingRef.current = false
    const dx = e.clientX - dragStartXRef.current
    if (Math.abs(dx) >= THROW_THRESHOLD) {
      answer(dx > 0 ? 'good' : 'bad')
    } else {
      setDragX(0)
    }
  }, [answer])

  const best = loadBest()
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  // Badge overlay direction (shown while dragging)
  const badgeDir = dragX > HINT_THRESHOLD ? 'good' : dragX < -HINT_THRESHOLD ? 'bad' : null

  // Card inline style (drag, fly-off, or idle)
  let cardStyle: React.CSSProperties = {}
  if (feedback !== 'doubt') {
    if (flyDir === 'left') {
      cardStyle = { transform: 'translateX(-160%) rotate(-28deg)', transition: 'transform 320ms cubic-bezier(0.4, 0, 0.8, 0.6)' }
    } else if (flyDir === 'right') {
      cardStyle = { transform: 'translateX(160%) rotate(28deg)', transition: 'transform 320ms cubic-bezier(0.4, 0, 0.8, 0.6)' }
    } else if (isDraggingRef.current) {
      const rot = Math.min(Math.max(dragX * 0.08, -22), 22)
      cardStyle = { transform: `translateX(${dragX}px) rotate(${rot}deg)`, transition: 'none', cursor: 'grabbing' }
    } else {
      cardStyle = { transform: 'translateX(0) rotate(0deg)', transition: 'transform 220ms ease' }
    }
  }

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
          <div className={styles.rule}><span>❓</span> Doute : -3 pts, carte revient bientôt</div>
          <div className={styles.rule}><span>⚡</span> 30 secondes chrono</div>
          <div className={styles.rule}><span>🔥</span> Combo x2 (3 bonnes) et x3 (5 bonnes)</div>
          <div className={styles.rule}><span>💸</span> Erreur : -5 pts, la carte revient !</div>
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
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.scoreDisp}>{score} pts</span>
        {streak >= 3 && <span className={styles.combo}>x{multiplier} 🔥</span>}
        <span className={`${styles.timer} ${timeLeft <= 5 ? styles.timerUrgent : ''}`}>{timeLeft}s</span>
      </div>

      <div className={styles.timerTrack}>
        <div className={styles.timerFill} style={{ width: `${(timeLeft / DURATION) * 100}%`, background: timeLeft <= 5 ? '#ff3b30' : 'var(--accent-orange)' }} />
      </div>

      {currentCard && (
        <div
          key={idx}
          className={`${styles.card} ${feedback === 'correct' ? styles.cardCorrect : ''} ${feedback === 'wrong' ? styles.cardWrong : ''} ${feedback === 'doubt' ? styles.cardDoubt : ''}`}
          style={cardStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {badgeDir && (
            <div className={`${styles.badge} ${badgeDir === 'good' ? styles.badgeGood : styles.badgeBad}`}>
              {badgeDir === 'good' ? '✓ BON' : '✗ TOXIQUE'}
            </div>
          )}
          <img src={assetUrl(currentCard.image)} alt={currentCard.nom} className={styles.cardImg} draggable={false} />
          <p className={styles.cardName}>{currentCard.nom}</p>
          <p className={styles.cardLatin}>{currentCard.nomLatin}</p>
        </div>
      )}

      {feedback && (
        <div className={`${styles.flash} ${feedback === 'correct' ? styles.flashOk : feedback === 'wrong' ? styles.flashKo : styles.flashDoubt}`}>
          {feedback === 'correct' ? '✓' : feedback === 'wrong' ? '✗' : '?'}
        </div>
      )}

      <div className={styles.btnRow}>
        <button className={styles.badBtn} onClick={() => answer('bad')}>
          <span>☠️</span>
          <span>Toxique</span>
        </button>
        <button className={styles.doubtBtn} onClick={() => answer('doubt')}>
          <span>❓</span>
          <span>Doute</span>
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

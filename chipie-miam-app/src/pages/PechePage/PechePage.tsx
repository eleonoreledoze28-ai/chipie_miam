import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PechePage.module.css'

const CW = 360
const CH = 230
const ROD_X = CW / 2
const ROD_Y = 14
const HAY_Y = 88
const HOOK_AIM_Y = HAY_Y - 8
const DROP_SPEED = 3.2
const REEL_SPEED = 5
const HOOK_MIN_X = 38
const HOOK_MAX_X = CW - 38
const HOOK_SPEED = 2.8
const GRAB_R = 28
const TOTAL_CASTS = 10
const BEST_KEY = 'chipie-peche-best'

function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 } }
function saveBest(s: number) { const p = loadBest(); if (s > p) { localStorage.setItem(BEST_KEY, String(s)); return true } return false }

const ITEM_POOL = [
  { emoji: '🥕', pts: 15 }, { emoji: '🥕', pts: 15 }, { emoji: '🥕', pts: 15 },
  { emoji: '🌿', pts: 10 }, { emoji: '🌿', pts: 10 }, { emoji: '🌿', pts: 10 },
  { emoji: '🍃', pts: 20 }, { emoji: '🍃', pts: 20 },
  { emoji: '🌼', pts: 25 }, { emoji: '🌼', pts: 25 },
  { emoji: '🥬', pts: 30 }, { emoji: '🍅', pts: 40 },
  { emoji: '☠️', pts: -15 }, { emoji: '☠️', pts: -15 },
  { emoji: '🪨', pts: -5 }, { emoji: '🪨', pts: -5 },
]

interface FishItem { x: number; depth: number; emoji: string; pts: number; grabbed: boolean }
interface FloatPop { x: number; y: number; text: string; alpha: number; vy: number; good: boolean }

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]] }
  return b
}

function generateItems(): FishItem[] {
  return shuffle(ITEM_POOL).slice(0, 14).map(t => ({
    x: HOOK_MIN_X + Math.random() * (HOOK_MAX_X - HOOK_MIN_X),
    depth: HAY_Y + 14 + Math.random() * (CH - HAY_Y - 28),
    emoji: t.emoji,
    pts: t.pts,
    grabbed: false,
  }))
}

function useFishAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    return ctxRef.current
  }, [])
  const beep = useCallback((freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.25) => {
    try {
      const ac = getCtx(); const osc = ac.createOscillator(); const g = ac.createGain()
      osc.connect(g); g.connect(ac.destination)
      osc.type = type; osc.frequency.value = freq
      g.gain.setValueAtTime(gain, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
      osc.start(); osc.stop(ac.currentTime + dur)
    } catch { /* */ }
  }, [getCtx])
  const playCast = useCallback(() => beep(330, 0.12, 'sine', 0.15), [beep])
  const playCatch = useCallback((good: boolean) => {
    if (good) {
      beep(523, 0.07); setTimeout(() => beep(659, 0.08), 70)
      try { navigator.vibrate(25) } catch { /* */ }
    } else {
      beep(200, 0.2, 'sawtooth', 0.18)
      try { navigator.vibrate(50) } catch { /* */ }
    }
  }, [beep])
  const playEmpty = useCallback(() => beep(260, 0.15, 'sine', 0.12), [beep])
  return { playCast, playCatch, playEmpty }
}

type FishState = 'aiming' | 'dropping' | 'reeling'
type Screen = 'menu' | 'play' | 'end'

export default function PechePage() {
  const navigate = useNavigate()
  const { playCast, playCatch, playEmpty } = useFishAudio()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  // Game refs
  const itemsRef = useRef<FishItem[]>([])
  const popsRef = useRef<FloatPop[]>([])
  const hookXRef = useRef(ROD_X)
  const hookYRef = useRef(HOOK_AIM_Y)
  const hookVXRef = useRef(HOOK_SPEED)
  const fixedXRef = useRef(ROD_X)
  const caughtRef = useRef<FishItem | null>(null)
  const fishStateRef = useRef<FishState>('aiming')
  const castsRef = useRef(TOTAL_CASTS)
  const scoreRef = useRef(0)
  const gsRef = useRef<Screen>('menu')

  const [screen, setScreen] = useState<Screen>('menu')
  const [dispScore, setDispScore] = useState(0)
  const [dispCasts, setDispCasts] = useState(TOTAL_CASTS)
  const [newRecord, setNewRecord] = useState(false)

  const startGame = useCallback(() => {
    itemsRef.current = generateItems()
    popsRef.current = []
    hookXRef.current = ROD_X
    hookYRef.current = HOOK_AIM_Y
    hookVXRef.current = HOOK_SPEED
    fixedXRef.current = ROD_X
    caughtRef.current = null
    fishStateRef.current = 'aiming'
    castsRef.current = TOTAL_CASTS
    scoreRef.current = 0
    gsRef.current = 'play'
    setDispScore(0)
    setDispCasts(TOTAL_CASTS)
    setNewRecord(false)
    setScreen('play')
  }, [])

  const handleTap = useCallback(() => {
    if (gsRef.current !== 'play' || fishStateRef.current !== 'aiming') return
    fixedXRef.current = hookXRef.current
    fishStateRef.current = 'dropping'
    hookYRef.current = HOOK_AIM_Y
    playCast()
  }, [playCast])

  useEffect(() => {
    if (screen !== 'play') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Pre-compute static hay texture lines once
    const hayLines: [number, number, number, number][] = []
    for (let i = 0; i < 42; i++) {
      const lx = ((i * 47.3 + 11) % 1.0) * CW
      const ly = HAY_Y + 6 + ((i * 31.7 + 5) % 1.0) * (CH - HAY_Y - 12)
      hayLines.push([lx, ly, lx + 14 + ((i * 13.1) % 12), ly + 7])
    }

    function loop() {
      if (gsRef.current !== 'play') return
      ctx!.clearRect(0, 0, CW, CH)

      // Sky
      const sky = ctx!.createLinearGradient(0, 0, 0, HAY_Y)
      sky.addColorStop(0, '#87ceeb')
      sky.addColorStop(1, '#d0eecc')
      ctx!.fillStyle = sky
      ctx!.fillRect(0, 0, CW, HAY_Y)

      // Sun
      ctx!.fillStyle = 'rgba(255,220,50,0.7)'
      ctx!.beginPath(); ctx!.arc(CW - 40, 22, 14, 0, Math.PI * 2); ctx!.fill()

      // Hay body
      const hay = ctx!.createLinearGradient(0, HAY_Y, 0, CH)
      hay.addColorStop(0, '#d4a54a')
      hay.addColorStop(0.4, '#c08838')
      hay.addColorStop(1, '#8a6020')
      ctx!.fillStyle = hay
      ctx!.fillRect(0, HAY_Y, CW, CH - HAY_Y)

      // Hay surface edge
      ctx!.strokeStyle = '#e8c060'
      ctx!.lineWidth = 2.5
      ctx!.beginPath(); ctx!.moveTo(0, HAY_Y); ctx!.lineTo(CW, HAY_Y); ctx!.stroke()

      // Hay texture strokes
      ctx!.strokeStyle = 'rgba(180,130,30,0.45)'
      ctx!.lineWidth = 1
      for (const [x1, y1, x2, y2] of hayLines) {
        ctx!.beginPath(); ctx!.moveTo(x1, y1); ctx!.lineTo(x2, y2); ctx!.stroke()
      }

      // Draw items (semi-visible in hay)
      const items = itemsRef.current
      ctx!.font = '18px serif'
      ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
      for (const item of items) {
        if (item.grabbed) continue
        ctx!.globalAlpha = 0.75
        ctx!.fillText(item.emoji, item.x, item.depth)
        ctx!.globalAlpha = 1
      }

      // Hook & rope
      const hx = fishStateRef.current === 'aiming' ? hookXRef.current : fixedXRef.current
      const hy = hookYRef.current

      // Rope
      ctx!.strokeStyle = '#a0784a'
      ctx!.lineWidth = 1.5
      ctx!.beginPath(); ctx!.moveTo(ROD_X, ROD_Y + 4); ctx!.lineTo(hx, hy); ctx!.stroke()

      // Rod
      ctx!.strokeStyle = '#6b4226'
      ctx!.lineWidth = 4
      ctx!.lineCap = 'round'
      ctx!.beginPath(); ctx!.moveTo(ROD_X - 12, 2); ctx!.lineTo(ROD_X + 8, ROD_Y + 4); ctx!.stroke()
      ctx!.lineCap = 'butt'

      // Hook circle
      ctx!.fillStyle = '#d0d0d0'
      ctx!.beginPath(); ctx!.arc(hx, hy, 5, 0, Math.PI * 2); ctx!.fill()
      ctx!.strokeStyle = '#888'
      ctx!.lineWidth = 1.5
      ctx!.beginPath(); ctx!.arc(hx, hy, 5, 0, Math.PI * 2); ctx!.stroke()

      // Caught item follows hook during reel
      const caught = caughtRef.current
      if (caught && fishStateRef.current === 'reeling') {
        ctx!.font = '20px serif'
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
        ctx!.globalAlpha = 1
        ctx!.fillText(caught.emoji, hx, hy + 14)
      }

      // Float pops
      popsRef.current = popsRef.current.filter(p => p.alpha > 0)
      for (const p of popsRef.current) {
        ctx!.globalAlpha = p.alpha
        ctx!.fillStyle = p.good ? '#4cd964' : '#ff3b30'
        ctx!.font = 'bold 13px sans-serif'
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'top'
        ctx!.fillText(p.text, p.x, p.y)
        ctx!.globalAlpha = 1
        p.y += p.vy; p.alpha -= 0.025
      }

      // === Update game logic ===
      if (fishStateRef.current === 'aiming') {
        hookXRef.current += hookVXRef.current
        if (hookXRef.current <= HOOK_MIN_X) { hookXRef.current = HOOK_MIN_X; hookVXRef.current = HOOK_SPEED }
        if (hookXRef.current >= HOOK_MAX_X) { hookXRef.current = HOOK_MAX_X; hookVXRef.current = -HOOK_SPEED }
        hookYRef.current = HOOK_AIM_Y

      } else if (fishStateRef.current === 'dropping') {
        hookYRef.current += DROP_SPEED
        // Check collisions
        for (const item of items) {
          if (!item.grabbed && Math.abs(fixedXRef.current - item.x) < GRAB_R && hookYRef.current >= item.depth) {
            item.grabbed = true
            caughtRef.current = item
            fishStateRef.current = 'reeling'
            playCatch(item.pts > 0)
            break
          }
        }
        // Hit bottom
        if (hookYRef.current >= CH - 4) {
          fishStateRef.current = 'reeling'
          playEmpty()
        }

      } else if (fishStateRef.current === 'reeling') {
        hookYRef.current -= REEL_SPEED
        if (hookYRef.current <= HOOK_AIM_Y) {
          hookYRef.current = HOOK_AIM_Y
          // Score caught item
          if (caughtRef.current) {
            const pts = caughtRef.current.pts
            scoreRef.current = Math.max(0, scoreRef.current + pts)
            popsRef.current.push({
              x: fixedXRef.current,
              y: HOOK_AIM_Y - 10,
              text: pts > 0 ? `+${pts}` : `${pts}`,
              alpha: 1, vy: -1.2,
              good: pts > 0,
            })
            setDispScore(scoreRef.current)
          }
          caughtRef.current = null
          castsRef.current--
          setDispCasts(castsRef.current)

          if (castsRef.current <= 0) {
            const isNew = saveBest(scoreRef.current)
            setNewRecord(isNew)
            setDispScore(scoreRef.current)
            gsRef.current = 'end'
            setScreen('end')
            return
          }
          fishStateRef.current = 'aiming'
          hookXRef.current = fixedXRef.current
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [screen, playCatch, playEmpty])

  const best = loadBest()

  if (screen === 'menu') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Retour
      </button>
      <div className={styles.menuScreen}>
        <span className={styles.menuEmoji}>🎣</span>
        <h1 className={styles.menuTitle}>Pêche au foin</h1>
        <p className={styles.menuSub}>Trouve les légumes cachés dans le foin !</p>
        <div className={styles.rules}>
          <div className={styles.rule}><span>🎣</span> Tape pour lancer l'hameçon</div>
          <div className={styles.rule}><span>🥕</span> Attrape les légumes sains → points</div>
          <div className={styles.rule}><span>☠️</span> Plante toxique → points négatifs !</div>
          <div className={styles.rule}><span>🪨</span> Pierre → pénalité légère</div>
          <div className={styles.rule}><span>🎯</span> {TOTAL_CASTS} lancers par partie</div>
        </div>
        {best > 0 && <div className={styles.menuBest}>Record : {best} pts</div>}
        <button className={styles.playBtn} onClick={startGame}>Jouer</button>
      </div>
    </div>
  )

  if (screen === 'end') return (
    <div className={styles.page}>
      <div className={styles.endScreen}>
        <span className={styles.endEmoji}>{dispScore >= 150 ? '🏆' : dispScore >= 80 ? '🎉' : dispScore > 0 ? '😊' : '😅'}</span>
        <h2 className={styles.endTitle}>Partie terminée !</h2>
        {newRecord && <div className={styles.newRecord}>Nouveau record !</div>}
        <div className={styles.endStats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{dispScore}</span>
            <span className={styles.statLabel}>points</span>
          </div>
        </div>
        {best > 0 && !newRecord && <div className={styles.endRecord}>Record : {best} pts</div>}
        <div className={styles.endActions}>
          <button className={styles.playBtn} onClick={startGame}>Rejouer</button>
          <button className={styles.menuBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.hud}>
        <span className={styles.hudScore}>{dispScore} pts</span>
        <div className={styles.casts}>
          {Array.from({ length: TOTAL_CASTS }).map((_, i) => (
            <span key={i} className={i < dispCasts ? styles.castDot : styles.castDotUsed}>🎣</span>
          ))}
        </div>
      </div>
      <div className={styles.canvasWrap} onClick={handleTap}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className={styles.canvas}
        />
      </div>
      <p className={styles.hint}>Tape pour lancer l'hameçon !</p>
    </div>
  )
}

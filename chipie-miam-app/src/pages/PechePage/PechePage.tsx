import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PechePage.module.css'

const CW = 360
const CH = 230
const ROD_X = CW / 2
const ROD_Y = 14
const HAY_Y = 90
const HOOK_AIM_Y = HAY_Y - 9
const DROP_SPEED = 3.2
const REEL_SPEED = 5.2
const HOOK_MIN_X = 36
const HOOK_MAX_X = CW - 36
const BASE_SPEED = 2.6
const SPEED_INC = 0.30   // +speed per cast used
const GRAB_R = 28
const TOTAL_CASTS = 10
const BEST_KEY = 'chipie-peche-best'

// Cloud templates (start offscreen left or at position, drift right)
const CLOUD_TMPL = [
  { startX: 50,  y: 16, speed: 0.14, w: 62, h: 26 },
  { startX: 200, y: 32, speed: 0.09, w: 46, h: 19 },
  { startX: 295, y: 10, speed: 0.19, w: 72, h: 28 },
]

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

interface FishItem {
  baseX: number; x: number; depth: number
  emoji: string; pts: number; grabbed: boolean
  driftPhase: number; driftAmp: number
}

interface FloatPop { x: number; y: number; text: string; alpha: number; vy: number; good: boolean }

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]] }
  return b
}

function generateItems(): FishItem[] {
  return shuffle(ITEM_POOL).slice(0, 14).map(t => {
    const bx = HOOK_MIN_X + Math.random() * (HOOK_MAX_X - HOOK_MIN_X)
    return {
      baseX: bx, x: bx,
      depth: HAY_Y + 14 + Math.random() * (CH - HAY_Y - 28),
      emoji: t.emoji, pts: t.pts, grabbed: false,
      driftPhase: Math.random() * Math.PI * 2,
      driftAmp: 5 + Math.random() * 10,
    }
  })
}

function getMultiplier(combo: number): number {
  if (combo >= 5) return 2
  if (combo >= 3) return 1.5
  return 1
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
  const playCast = useCallback(() => {
    beep(330, 0.1, 'sine', 0.12)
    setTimeout(() => beep(260, 0.08), 90)
  }, [beep])
  const playCatch = useCallback((good: boolean, combo: number) => {
    if (good) {
      const freq = 440 + combo * 40
      beep(freq, 0.07); setTimeout(() => beep(freq * 1.25, 0.09), 70)
      if (combo >= 3) setTimeout(() => beep(freq * 1.5, 0.1), 140)
      try { navigator.vibrate(25) } catch { /* */ }
    } else {
      beep(200, 0.22, 'sawtooth', 0.18)
      try { navigator.vibrate(55) } catch { /* */ }
    }
  }, [beep])
  const playEmpty = useCallback(() => beep(260, 0.15, 'sine', 0.10), [beep])
  return { playCast, playCatch, playEmpty }
}

type FishState = 'aiming' | 'dropping' | 'reeling'
type Screen = 'menu' | 'play' | 'end'

export default function PechePage() {
  const navigate = useNavigate()
  const { playCast, playCatch, playEmpty } = useFishAudio()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  const itemsRef = useRef<FishItem[]>([])
  const popsRef = useRef<FloatPop[]>([])
  const hookXRef = useRef(ROD_X)
  const hookYRef = useRef(HOOK_AIM_Y)
  const hookDirRef = useRef(1)
  const fixedXRef = useRef(ROD_X)
  const caughtRef = useRef<FishItem | null>(null)
  const fishStateRef = useRef<FishState>('aiming')
  const castsRef = useRef(TOTAL_CASTS)
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const frameRef = useRef(0)
  const gsRef = useRef<Screen>('menu')

  const [screen, setScreen] = useState<Screen>('menu')
  const [dispScore, setDispScore] = useState(0)
  const [dispCasts, setDispCasts] = useState(TOTAL_CASTS)
  const [combo, setCombo] = useState(0)
  const [newRecord, setNewRecord] = useState(false)

  const startGame = useCallback(() => {
    itemsRef.current = generateItems()
    popsRef.current = []
    hookXRef.current = ROD_X
    hookYRef.current = HOOK_AIM_Y
    hookDirRef.current = 1
    fixedXRef.current = ROD_X
    caughtRef.current = null
    fishStateRef.current = 'aiming'
    castsRef.current = TOTAL_CASTS
    scoreRef.current = 0
    comboRef.current = 0
    frameRef.current = 0
    gsRef.current = 'play'
    setDispScore(0)
    setDispCasts(TOTAL_CASTS)
    setCombo(0)
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

    // Pre-compute hay texture lines (static)
    const hayLines: [number, number, number, number][] = []
    for (let i = 0; i < 44; i++) {
      const lx = ((i * 47.3 + 11) % 1.0) * CW
      const ly = HAY_Y + 8 + ((i * 31.7 + 5) % 1.0) * (CH - HAY_Y - 14)
      hayLines.push([lx, ly, lx + 12 + ((i * 13.1) % 11), ly + 7])
    }

    function drawCloud(cx: number, cy: number, w: number, h: number) {
      const c = ctx!
      c.fillStyle = 'rgba(255,255,255,0.82)'
      c.beginPath()
      c.ellipse(cx + w * 0.5, cy + h * 0.85, w * 0.48, h * 0.42, 0, Math.PI, 0)
      c.ellipse(cx + w * 0.28, cy + h * 0.55, w * 0.23, h * 0.48, 0, Math.PI, 0)
      c.ellipse(cx + w * 0.55, cy + h * 0.42, w * 0.28, h * 0.52, 0, Math.PI, 0)
      c.ellipse(cx + w * 0.76, cy + h * 0.6, w * 0.20, h * 0.42, 0, Math.PI, 0)
      c.fill()
    }

    function loop() {
      if (gsRef.current !== 'play') return
      const frame = frameRef.current++
      ctx!.clearRect(0, 0, CW, CH)

      // ── Sky ──
      const sky = ctx!.createLinearGradient(0, 0, 0, HAY_Y)
      sky.addColorStop(0, '#5db8e8')
      sky.addColorStop(0.5, '#90d4f0')
      sky.addColorStop(1, '#c8edcc')
      ctx!.fillStyle = sky
      ctx!.fillRect(0, 0, CW, HAY_Y)

      // Animated clouds
      for (const tmpl of CLOUD_TMPL) {
        const cx = ((tmpl.startX + frame * tmpl.speed) % (CW + tmpl.w + 20)) - tmpl.w
        drawCloud(cx, tmpl.y, tmpl.w, tmpl.h)
      }

      // Sun
      ctx!.fillStyle = 'rgba(255,215,40,0.88)'
      ctx!.beginPath(); ctx!.arc(CW - 38, 22, 13, 0, Math.PI * 2); ctx!.fill()
      ctx!.fillStyle = 'rgba(255,215,40,0.25)'
      ctx!.beginPath(); ctx!.arc(CW - 38, 22, 19, 0, Math.PI * 2); ctx!.fill()

      // ── Hay ──
      const hay = ctx!.createLinearGradient(0, HAY_Y, 0, CH)
      hay.addColorStop(0, '#d8aa4e')
      hay.addColorStop(0.35, '#c08838')
      hay.addColorStop(1, '#8a6020')
      ctx!.fillStyle = hay
      ctx!.fillRect(0, HAY_Y, CW, CH - HAY_Y)

      // Wavy hay surface
      ctx!.strokeStyle = '#eac864'
      ctx!.lineWidth = 2.5
      ctx!.beginPath()
      ctx!.moveTo(0, HAY_Y)
      for (let x = 0; x <= CW; x += 6) {
        ctx!.lineTo(x, HAY_Y + Math.sin(x * 0.07 + frame * 0.025) * 2.2)
      }
      ctx!.stroke()

      // Hay texture
      ctx!.strokeStyle = 'rgba(170,120,25,0.4)'
      ctx!.lineWidth = 1
      for (const [x1, y1, x2, y2] of hayLines) {
        ctx!.beginPath(); ctx!.moveTo(x1, y1); ctx!.lineTo(x2, y2); ctx!.stroke()
      }

      // Depth guide lines (faint)
      ctx!.strokeStyle = 'rgba(255,220,80,0.12)'
      ctx!.lineWidth = 1
      ctx!.setLineDash([4, 6])
      for (const dy of [HAY_Y + 38, HAY_Y + 80, HAY_Y + 122]) {
        ctx!.beginPath(); ctx!.moveTo(0, dy); ctx!.lineTo(CW, dy); ctx!.stroke()
      }
      ctx!.setLineDash([])

      // ── Items (with drift) ──
      const items = itemsRef.current
      const fxHook = fixedXRef.current
      const dropping = fishStateRef.current === 'dropping'

      ctx!.font = '18px serif'
      ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'

      for (const item of items) {
        if (item.grabbed) continue

        // Apply drift
        item.x = item.baseX + Math.sin(frame * 0.016 + item.driftPhase) * item.driftAmp

        // Depth-based opacity
        const depthFactor = (item.depth - HAY_Y) / (CH - HAY_Y)
        const baseAlpha = 0.85 - depthFactor * 0.32

        // Glow when hook is aligned during drop
        const inRange = dropping && Math.abs(fxHook - item.x) < GRAB_R * 1.4
        if (inRange) {
          ctx!.shadowColor = item.pts > 0 ? '#4cd964' : '#ff3b30'
          ctx!.shadowBlur = 14
        }
        ctx!.globalAlpha = inRange ? Math.min(1, baseAlpha + 0.2) : baseAlpha
        ctx!.fillText(item.emoji, item.x, item.depth)
        ctx!.shadowBlur = 0
        ctx!.globalAlpha = 1
      }

      // ── Rope ──
      const hx = fishStateRef.current === 'aiming' ? hookXRef.current : fixedXRef.current
      const hy = hookYRef.current

      ctx!.strokeStyle = '#a07840'
      ctx!.lineWidth = 1.5
      ctx!.beginPath(); ctx!.moveTo(ROD_X, ROD_Y + 5); ctx!.lineTo(hx, hy - 6); ctx!.stroke()

      // ── Rod ──
      ctx!.strokeStyle = '#5a3010'
      ctx!.lineWidth = 4.5
      ctx!.lineCap = 'round'
      ctx!.beginPath(); ctx!.moveTo(ROD_X - 14, 2); ctx!.lineTo(ROD_X + 8, ROD_Y + 5); ctx!.stroke()
      ctx!.lineCap = 'butt'

      // ── Hook (J-shape) ──
      ctx!.strokeStyle = '#c8c8c8'
      ctx!.lineWidth = 2.2
      ctx!.lineCap = 'round'
      ctx!.beginPath()
      ctx!.moveTo(hx, hy - 7)
      ctx!.lineTo(hx, hy + 4)
      ctx!.arc(hx - 4.5, hy + 4, 4.5, 0, Math.PI * 0.9)
      ctx!.stroke()
      ctx!.lineCap = 'butt'

      // Hook tip dot
      ctx!.fillStyle = '#aaa'
      ctx!.beginPath(); ctx!.arc(hx, hy - 7, 2, 0, Math.PI * 2); ctx!.fill()

      // Caught item follows hook during reel
      const caught = caughtRef.current
      if (caught && fishStateRef.current === 'reeling') {
        ctx!.font = '20px serif'
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
        ctx!.globalAlpha = 1
        ctx!.fillText(caught.emoji, hx, hy + 15)
      }

      // ── Float pops ──
      popsRef.current = popsRef.current.filter(p => p.alpha > 0)
      for (const p of popsRef.current) {
        ctx!.globalAlpha = p.alpha
        ctx!.fillStyle = p.good ? '#4cd964' : '#ff4444'
        ctx!.font = 'bold 14px sans-serif'
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'top'
        ctx!.fillText(p.text, p.x, p.y)
        ctx!.globalAlpha = 1
        p.y += p.vy; p.alpha -= 0.024
      }

      // ── Update logic ──
      const castsUsed = TOTAL_CASTS - castsRef.current
      const hookSpeed = BASE_SPEED + castsUsed * SPEED_INC

      if (fishStateRef.current === 'aiming') {
        hookXRef.current += hookDirRef.current * hookSpeed
        if (hookXRef.current <= HOOK_MIN_X) { hookXRef.current = HOOK_MIN_X; hookDirRef.current = 1 }
        if (hookXRef.current >= HOOK_MAX_X) { hookXRef.current = HOOK_MAX_X; hookDirRef.current = -1 }
        hookYRef.current = HOOK_AIM_Y

      } else if (fishStateRef.current === 'dropping') {
        hookYRef.current += DROP_SPEED
        for (const item of items) {
          if (!item.grabbed && Math.abs(fixedXRef.current - item.x) < GRAB_R && hookYRef.current >= item.depth) {
            item.grabbed = true
            caughtRef.current = item
            fishStateRef.current = 'reeling'
            playCatch(item.pts > 0, comboRef.current)
            break
          }
        }
        if (hookYRef.current >= CH - 4) {
          fishStateRef.current = 'reeling'
          playEmpty()
        }

      } else if (fishStateRef.current === 'reeling') {
        hookYRef.current -= REEL_SPEED
        if (hookYRef.current <= HOOK_AIM_Y) {
          hookYRef.current = HOOK_AIM_Y

          if (caughtRef.current) {
            const base = caughtRef.current.pts
            if (base > 0) {
              comboRef.current++
              const mult = getMultiplier(comboRef.current)
              const pts = Math.round(base * mult)
              scoreRef.current = Math.max(0, scoreRef.current + pts)
              const label = mult > 1 ? `+${pts} ×${mult}🔥` : `+${pts}`
              popsRef.current.push({ x: fixedXRef.current, y: HOOK_AIM_Y - 12, text: label, alpha: 1, vy: -1.3, good: true })
            } else {
              comboRef.current = 0
              scoreRef.current = Math.max(0, scoreRef.current + base)
              popsRef.current.push({ x: fixedXRef.current, y: HOOK_AIM_Y - 12, text: `${base}`, alpha: 1, vy: -1.2, good: false })
            }
            setCombo(comboRef.current)
            setDispScore(scoreRef.current)
          } else {
            // Empty cast — reset combo
            comboRef.current = 0
            setCombo(0)
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
          <div className={styles.rule}><span>🔥</span> Combo ×1.5 (3 bons) et ×2 (5 bons)</div>
          <div className={styles.rule}><span>⚡</span> La canne accélère au fil des lancers !</div>
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
        {combo >= 3 && (
          <span className={styles.combo}>
            🔥 ×{getMultiplier(combo)}
          </span>
        )}
        <div className={styles.casts}>
          {Array.from({ length: TOTAL_CASTS }).map((_, i) => (
            <span key={i} className={i < dispCasts ? styles.castDot : styles.castDotUsed}>🎣</span>
          ))}
        </div>
      </div>
      <div className={styles.canvasWrap} onClick={handleTap}>
        <canvas ref={canvasRef} width={CW} height={CH} className={styles.canvas} />
      </div>
      <p className={styles.hint}>Tape pour lancer l'hameçon !</p>
    </div>
  )
}

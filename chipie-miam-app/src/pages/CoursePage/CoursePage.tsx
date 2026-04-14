import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import styles from './CoursePage.module.css'

// Canvas constants
const CW = 360
const CH = 200
const GROUND_Y = 160
const CHIPIE_X = 55
const CHIPIE_W = 32
const CHIPIE_H = 32
const JUMP_FORCE = 12
const GRAVITY = 0.6
const OBS_R = 16           // obstacle circle radius
const GOOD_HEIGHT = 58     // center height above ground (reach by jumping ~halfway)
const BEST_KEY = 'chipie-course-best'

function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 } }
function saveBest(s: number) { const p = loadBest(); if (s > p) { localStorage.setItem(BEST_KEY, String(s)); return true } return false }

// Emoji per category
const CAT_EMOJI: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c.emoji])
)

interface Obs {
  id: number; x: number; kind: 'bad' | 'good'; emoji: string; collected: boolean
}

type Screen = 'menu' | 'play' | 'end'

export default function CoursePage() {
  const navigate = useNavigate()

  const goodPool = useMemo(() =>
    VEGETAUX.filter(v => v.restriction === 'aucune').map(v => CAT_EMOJI[v.categorie] ?? '🌱'),
    [])
  const badPool = useMemo(() =>
    VEGETAUX.filter(v => v.restriction === 'a_eviter').map(v => CAT_EMOJI[v.categorie] ?? '☠️'),
    [])

  const [screen, setScreen] = useState<Screen>('menu')
  const [dispScore, setDispScore] = useState(0)
  const [dispLives, setDispLives] = useState(3)
  const [newRecord, setNewRecord] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Game state in refs to avoid re-render on every frame
  const chipieY  = useRef(0)   // height above ground
  const chipieVY = useRef(0)   // velocity (positive = up)
  const onGround = useRef(true)
  const obs      = useRef<Obs[]>([])
  const score    = useRef(0)
  const lives    = useRef(3)
  const speed    = useRef(3)
  const frame    = useRef(0)
  const nextObs  = useRef(90)
  const obsId    = useRef(0)
  const active   = useRef(false)
  const raf      = useRef<number | null>(null)
  const flash    = useRef<{ kind: 'good'|'bad'; f: number } | null>(null)
  // Scrolling ground lines
  const groundOffset = useRef(0)

  const jump = useCallback(() => {
    if (!onGround.current) return
    chipieVY.current = JUMP_FORCE
    onGround.current = false
  }, [])

  const endGame = useCallback(() => {
    active.current = false
    if (raf.current) cancelAnimationFrame(raf.current)
    setNewRecord(saveBest(score.current))
    setScreen('end')
  }, [])

  const spawnObs = useCallback(() => {
    const isBad = Math.random() < 0.55
    const pool = isBad ? badPool : goodPool
    obs.current.push({
      id: obsId.current++,
      x: CW + OBS_R,
      kind: isBad ? 'bad' : 'good',
      emoji: pool[Math.floor(Math.random() * pool.length)],
      collected: false,
    })
  }, [badPool, goodPool])

  const startGame = useCallback(() => {
    chipieY.current = 0
    chipieVY.current = 0
    onGround.current = true
    obs.current = []
    score.current = 0
    lives.current = 3
    speed.current = 3
    frame.current = 0
    nextObs.current = 90
    active.current = true
    flash.current = null
    groundOffset.current = 0
    setDispScore(0)
    setDispLives(3)
    setNewRecord(false)
    setScreen('play')
  }, [])

  // Game loop
  useEffect(() => {
    if (screen !== 'play') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function update() {
      frame.current++
      groundOffset.current = (groundOffset.current + speed.current) % 40

      // Physics
      chipieVY.current -= GRAVITY
      chipieY.current += chipieVY.current
      if (chipieY.current <= 0) {
        chipieY.current = 0
        chipieVY.current = 0
        onGround.current = true
      }

      // Spawn
      if (frame.current >= nextObs.current) {
        spawnObs()
        const gap = Math.max(50, 90 - Math.floor(speed.current) * 5) + Math.floor(Math.random() * 25)
        nextObs.current = frame.current + gap
      }

      // Move obstacles
      for (const o of obs.current) o.x -= speed.current

      // Collision
      const cLeft  = CHIPIE_X
      const cRight = CHIPIE_X + CHIPIE_W
      const cBot   = GROUND_Y - chipieY.current
      const cTop   = cBot - CHIPIE_H

      for (const o of obs.current) {
        if (o.collected) continue
        const oX = o.x
        const oCY = o.kind === 'bad' ? GROUND_Y - OBS_R : GROUND_Y - GOOD_HEIGHT

        const xOverlap = cRight > oX - OBS_R && cLeft < oX + OBS_R
        const yOverlap = cBot > oCY - OBS_R  && cTop < oCY + OBS_R

        if (xOverlap && yOverlap) {
          o.collected = true
          if (o.kind === 'bad') {
            lives.current--
            setDispLives(lives.current)
            flash.current = { kind: 'bad', f: 18 }
            if (lives.current <= 0) { endGame(); return }
          } else {
            score.current += 15
            setDispScore(score.current)
            flash.current = { kind: 'good', f: 12 }
          }
        }
      }

      obs.current = obs.current.filter(o => o.x > -40)
      speed.current = Math.min(7, 3 + frame.current / 500)
      if (frame.current % 15 === 0) { score.current++; setDispScore(score.current) }
      if (flash.current) { flash.current.f--; if (flash.current.f <= 0) flash.current = null }
    }

    function render() {
      if (!ctx) return

      // Sky
      ctx.fillStyle = '#141420'
      ctx.fillRect(0, 0, CW, CH)

      // Flash overlay
      if (flash.current) {
        const alpha = flash.current.f / 18
        ctx.fillStyle = flash.current.kind === 'bad'
          ? `rgba(255,59,48,${alpha * 0.35})`
          : `rgba(76,217,100,${alpha * 0.25})`
        ctx.fillRect(0, 0, CW, CH)
      }

      // Ground
      ctx.fillStyle = '#1e2030'
      ctx.fillRect(0, GROUND_Y, CW, CH - GROUND_Y)

      // Ground dashes
      ctx.strokeStyle = 'rgba(240,165,58,0.7)'
      ctx.lineWidth = 2
      ctx.setLineDash([20, 20])
      ctx.lineDashOffset = -groundOffset.current
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y)
      ctx.lineTo(CW, GROUND_Y)
      ctx.stroke()
      ctx.setLineDash([])

      // Obstacles
      for (const o of obs.current) {
        if (o.collected) continue
        const oCY = o.kind === 'bad' ? GROUND_Y - OBS_R : GROUND_Y - GOOD_HEIGHT
        const isBad = o.kind === 'bad'

        // Glow
        ctx.beginPath()
        ctx.arc(o.x, oCY, OBS_R + 4, 0, Math.PI * 2)
        ctx.fillStyle = isBad ? 'rgba(255,59,48,0.15)' : 'rgba(76,217,100,0.15)'
        ctx.fill()

        // Circle
        ctx.beginPath()
        ctx.arc(o.x, oCY, OBS_R, 0, Math.PI * 2)
        ctx.fillStyle = isBad ? 'rgba(255,59,48,0.2)' : 'rgba(76,217,100,0.2)'
        ctx.fill()
        ctx.strokeStyle = isBad ? '#ff3b30' : '#4cd964'
        ctx.lineWidth = 2
        ctx.stroke()

        // Emoji
        ctx.font = '18px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(o.emoji, o.x, oCY)

        // Good item: dashed guide line
        if (!isBad) {
          ctx.setLineDash([2, 4])
          ctx.strokeStyle = 'rgba(76,217,100,0.25)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(o.x, oCY + OBS_R)
          ctx.lineTo(o.x, GROUND_Y)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // Chipie shadow
      const shadowW = Math.max(6, CHIPIE_W * (1 - chipieY.current / 100))
      ctx.beginPath()
      ctx.ellipse(CHIPIE_X + CHIPIE_W / 2, GROUND_Y + 4, shadowW / 2, 3, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fill()

      // Chipie 🐰
      const chipieDrawY = GROUND_Y - chipieY.current - CHIPIE_H
      ctx.font = `${CHIPIE_H}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('🐰', CHIPIE_X + CHIPIE_W / 2, chipieDrawY)
    }

    function loop() {
      if (!active.current) return
      update()
      render()
      raf.current = requestAnimationFrame(loop)
    }

    raf.current = requestAnimationFrame(loop)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [screen, spawnObs, endGame])

  // Touch / click on canvas = jump
  const handleJump = useCallback(() => jump(), [jump])

  const best = loadBest()

  // ===== MENU =====
  if (screen === 'menu') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Retour
      </button>
      <div className={styles.menuScreen}>
        <span className={styles.menuEmoji}>🏃</span>
        <h1 className={styles.menuTitle}>Course d'obstacles</h1>
        <p className={styles.menuSub}>Chipie court, toi tu sautes !</p>
        <div className={styles.rules}>
          <div className={styles.rule}><span>🟢</span> Saute pour attraper les bons aliments (+15 pts)</div>
          <div className={styles.rule}><span>🔴</span> Saute par-dessus les toxiques (-1 vie)</div>
          <div className={styles.rule}><span>❤️</span> 3 vies — bonne chance !</div>
          <div className={styles.rule}><span>⚡</span> La vitesse augmente avec le temps</div>
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
        <span className={styles.endEmoji}>{dispScore >= 200 ? '👑' : dispScore >= 100 ? '🏆' : dispScore >= 50 ? '🎉' : '💥'}</span>
        <h2 className={styles.endTitle}>Game Over !</h2>
        {newRecord && <div className={styles.newRecord}>Nouveau record !</div>}
        <div className={styles.endStats}>
          <div className={styles.stat}><span className={styles.statNum}>{dispScore}</span><span className={styles.statLabel}>score</span></div>
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
      <div className={styles.hud}>
        <span className={styles.hudScore}>{dispScore} pts</span>
        <span className={styles.hudLives}>{'❤️'.repeat(Math.max(0, dispLives))}</span>
      </div>

      <div className={styles.canvasWrap} onClick={handleJump} onTouchStart={e => { e.preventDefault(); handleJump() }}>
        <canvas ref={canvasRef} width={CW} height={CH} className={styles.canvas} />
      </div>

      <button className={styles.jumpBtn} onPointerDown={handleJump}>
        ⬆ Sauter
      </button>
      <p className={styles.hint}>Touche l'écran ou appuie sur le bouton</p>
    </div>
  )
}

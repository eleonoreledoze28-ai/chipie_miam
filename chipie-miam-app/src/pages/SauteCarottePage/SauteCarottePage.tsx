import { useCallback, useEffect, useRef, useState } from 'react'
import GameShell, { GameResult } from '../../components/GameShell/GameShell'
import { useBestScore } from '../../hooks/useBestScore'
import styles from './SauteCarottePage.module.css'

type Phase = 'ready' | 'playing' | 'over'

interface Thing { x: number; y: number; w: number; h: number; taken?: boolean }

interface World {
  playerY: number
  vy: number
  obstacles: Thing[]
  carrots: Thing[]
  distance: number
  carrotCount: number
  nextObstacleAt: number
  nextCarrotAt: number
  lastScore: number
}

// Repère logique du canvas (mis à l'échelle par CSS)
const W = 360
const H = 200
const GROUND = 160
const PLAYER_X = 50
const PLAYER_SIZE = 34
const GRAVITY = 0.55
const JUMP_SPEED = -10.5
const FRAME_MS = 1000 / 60
const MAX_FRAME_STEPS = 3 // évite un bond énorme après un onglet en pause

const SEASONS = [
  { label: '🌸 Printemps', sky: ['#bfe8ff', '#e9f9d6'], ground: '#6fbf5a' },
  { label: '☀️ Été',       sky: ['#7cc8ff', '#ffe9a8'], ground: '#b9c75a' },
  { label: '🍂 Automne',   sky: ['#f2c28a', '#ffe3c2'], ground: '#b5793a' },
  { label: '❄️ Hiver',     sky: ['#c9d8ee', '#f4f8ff'], ground: '#e8eef7' },
]
const SEASON_LENGTH = 1500 // distance (logique) par saison

const newWorld = (): World => ({
  playerY: GROUND,
  vy: 0,
  obstacles: [],
  carrots: [],
  distance: 0,
  carrotCount: 0,
  nextObstacleAt: 260,
  nextCarrotAt: 150,
  lastScore: 0,
})

const scoreOf = (w: World) => Math.floor(w.distance / 10) + w.carrotCount * 10

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: Thing, shrink: number) =>
  a.x + shrink < b.x + b.w - shrink &&
  a.x + a.w - shrink > b.x + shrink &&
  a.y + shrink < b.y + b.h - shrink &&
  a.y + a.h - shrink > b.y + shrink

export default function SauteCarottePage() {
  const { best, submit } = useBestScore('chipie-saute-carotte-best')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World>(newWorld())

  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [carrots, setCarrots] = useState(0)
  const [isRecord, setIsRecord] = useState(false)
  const [seasonIndex, setSeasonIndex] = useState(0)

  const phaseRef = useRef<Phase>('ready')
  const setPhaseBoth = useCallback((p: Phase) => { phaseRef.current = p; setPhase(p) }, [])

  const start = useCallback(() => {
    worldRef.current = newWorld()
    setScore(0)
    setCarrots(0)
    setSeasonIndex(0)
    setIsRecord(false)
    setPhaseBoth('playing')
  }, [setPhaseBoth])

  const jump = useCallback(() => {
    if (phaseRef.current === 'ready') { start(); return }
    const w = worldRef.current
    if (phaseRef.current === 'playing' && w.playerY >= GROUND) w.vy = JUMP_SPEED
  }, [start])

  // Clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        if (phaseRef.current !== 'over') jump()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jump])

  // Dessin (aussi hors partie, pour l'écran d'accueil)
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const w = worldRef.current
    const season = SEASONS[Math.floor(w.distance / SEASON_LENGTH) % SEASONS.length]

    const sky = ctx.createLinearGradient(0, 0, 0, GROUND)
    sky.addColorStop(0, season.sky[0])
    sky.addColorStop(1, season.sky[1])
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, GROUND)
    ctx.fillStyle = season.ground
    ctx.fillRect(0, GROUND, W, H - GROUND)

    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'left'
    ctx.font = '26px serif'
    w.obstacles.forEach(o => ctx.fillText('🪨', o.x, o.y + o.h + 2))
    w.carrots.forEach(c => { if (!c.taken) ctx.fillText('🥕', c.x, c.y + c.h + 2) })
    ctx.font = '34px serif'
    ctx.fillText('🐰', PLAYER_X, w.playerY + 4)
  }, [])

  // Boucle de jeu
  useEffect(() => {
    if (phase !== 'playing') { draw(); return }
    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const w = worldRef.current
      const steps = Math.min(MAX_FRAME_STEPS, Math.max(1, Math.round((now - last) / FRAME_MS)))
      last = now

      for (let s = 0; s < steps; s++) {
        const speed = Math.min(9, 4.2 + w.distance / 1800)
        w.distance += speed

        // physique du lapin
        w.vy += GRAVITY
        w.playerY += w.vy
        if (w.playerY >= GROUND) { w.playerY = GROUND; w.vy = 0 }

        // défilement
        w.obstacles.forEach(o => { o.x -= speed })
        w.carrots.forEach(c => { c.x -= speed })
        w.obstacles = w.obstacles.filter(o => o.x + o.w > -10)
        w.carrots = w.carrots.filter(c => c.x + c.w > -10 && !c.taken)

        // apparitions
        if (w.distance >= w.nextObstacleAt) {
          w.obstacles.push({ x: W + 10, y: GROUND - 26, w: 26, h: 26 })
          w.nextObstacleAt = w.distance + 210 + Math.random() * 190
        }
        if (w.distance >= w.nextCarrotAt) {
          const high = Math.random() < 0.5
          w.carrots.push({ x: W + 10, y: high ? GROUND - 78 : GROUND - 26, w: 24, h: 24 })
          w.nextCarrotAt = w.distance + 130 + Math.random() * 170
        }

        // collisions
        const player = { x: PLAYER_X, y: w.playerY - PLAYER_SIZE, w: PLAYER_SIZE, h: PLAYER_SIZE }
        w.carrots.forEach(c => {
          if (!c.taken && overlaps(player, c, 2)) { c.taken = true; w.carrotCount++ }
        })
        if (w.obstacles.some(o => overlaps(player, o, 6))) {
          const finalScore = scoreOf(w)
          setScore(finalScore)
          setCarrots(w.carrotCount)
          setIsRecord(submit(finalScore))
          setPhaseBoth('over')
          draw()
          return
        }
      }

      const current = scoreOf(w)
      if (current !== w.lastScore) {
        w.lastScore = current
        setScore(current)
        setCarrots(w.carrotCount)
        setSeasonIndex(Math.floor(w.distance / SEASON_LENGTH) % SEASONS.length)
      }

      draw()
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase, draw, submit, setPhaseBoth])

  // Résolution nette sur écrans haute densité
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw()
  }, [draw])

  return (
    <GameShell
      title="Saute-carotte"
      emoji="🥕"
      stats={<><span>⭐ {score}</span><span>🥕 {carrots}</span></>}
    >
      <div className={styles.season}>{SEASONS[seasonIndex].label}</div>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={jump}
        aria-label="Zone de jeu : touche pour sauter"
      />
      {phase === 'ready' && (
        <div className={styles.hint}>
          <p>Touche l'écran (ou la barre d'espace) pour <strong>sauter</strong> par-dessus les cailloux et attraper les carottes.</p>
          <p className={styles.best}>Meilleur score : {best}</p>
          <button className={styles.startBtn} onClick={start}>Jouer</button>
        </div>
      )}
      {phase === 'over' && (
        <GameResult
          title="Aïe, un caillou !"
          isRecord={isRecord}
          lines={[`Score : ${score}`, `${carrots} carotte${carrots > 1 ? 's' : ''}`, `Meilleur score : ${Math.max(best, score)}`]}
          onReplay={start}
        />
      )}
    </GameShell>
  )
}

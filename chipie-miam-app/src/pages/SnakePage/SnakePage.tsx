import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { VEGETAUX, type Vegetal } from '../../data/vegetaux'
import VegetalImage from '../../components/VegetalImage/VegetalImage'
import ChipieCharacter from '../../components/ChipieCharacter/ChipieCharacter'
import type { ChipieMood } from '../../components/ChipieCharacter/ChipieCharacter'
import { confetti } from '../../services/confetti'
import { rng } from '../../components/VegetalIllustration/describe'
import styles from './SnakePage.module.css'

// ===== Audio =====
function useSnakeAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const MUTE_KEY = 'chipie-snake-muted'
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume()
    return ctxRef.current
  }, [])
  const isMuted = useCallback(() => { try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false } }, [])
  const vibrate = useCallback((p: number | number[]) => { try { navigator?.vibrate?.(p) } catch { /* */ } }, [])
  const tone = useCallback((f: number, d: number, t: OscillatorType = 'sine', v = 0.08) => {
    if (isMuted()) return
    try { const c = getCtx(); const o = c.createOscillator(); const g = c.createGain(); o.type = t; o.frequency.setValueAtTime(f, c.currentTime); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(g).connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + d) } catch { /* */ }
  }, [getCtx, isMuted])
  return useMemo(() => ({
    MUTE_KEY,
    isMuted,
    // « croc-croc » : plus aigu à chaque niveau de combo
    playEat: (combo: number) => {
      const base = 760 + Math.min(5, combo) * 90
      tone(base, 0.07); setTimeout(() => tone(base * 1.25, 0.09, 'sine', 0.06), 50); vibrate(combo >= 3 ? [15, 30, 15] : 20)
    },
    playModerate: () => { tone(660, 0.1, 'triangle', 0.08); vibrate(15) },
    playBadEat: () => { tone(300, 0.12, 'sawtooth', 0.08); setTimeout(() => tone(220, 0.15, 'sawtooth', 0.06), 80); vibrate(60) },
    playGameOver: () => { tone(400, 0.2, 'sawtooth', 0.08); setTimeout(() => tone(300, 0.25, 'sawtooth', 0.06), 150); setTimeout(() => tone(200, 0.3, 'sawtooth', 0.05), 350); vibrate([100, 50, 200]) },
    playTick: () => tone(520, 0.08, 'triangle', 0.07),
    playGo: () => { tone(523, 0.08); setTimeout(() => tone(659, 0.08, 'sine', 0.06), 80); setTimeout(() => tone(988, 0.16, 'sine', 0.06), 160) },
    playPause: () => { tone(440, 0.06); setTimeout(() => tone(330, 0.08), 70) },
    playStar: (i: number) => tone(660 + i * 180, 0.14, 'sine', 0.07),
  }), [tone, vibrate, isMuted])
}

// ===== Constantes =====
const GRID_W = 13
const GRID_H = 15
const BEST_KEY = 'chipie-snake-best'
const STREAK_KEY = 'chipie-snake-streak'
const COMBO_MS = 3500
const COUNTDOWN_MS = 2400
const GO_MS = 450
const DEATH_MS = 1000

type Difficulty = 'easy' | 'normal' | 'hard'
const DIFFICULTY_CONFIG: Record<Difficulty, { baseSpeed: number; minSpeed: number; speedStep: number; badChance: number; label: string; emoji: string }> = {
  easy:   { baseSpeed: 280, minSpeed: 120, speedStep: 5,  badChance: 0.05, label: 'Facile',   emoji: '🌱' },
  normal: { baseSpeed: 220, minSpeed: 90,  speedStep: 8,  badChance: 0.10, label: 'Normal',   emoji: '🥕' },
  hard:   { baseSpeed: 150, minSpeed: 70,  speedStep: 12, badChance: 0.18, label: 'Difficile', emoji: '🌶️' },
}

type Cell = [number, number]
type Direction = 'up' | 'down' | 'left' | 'right'
type FoodKind = 'good' | 'moderate' | 'bad'
interface Food { id: number; x: number; y: number; vegetal: Vegetal; kind: FoodKind }
type Screen = 'menu' | 'play' | 'end'

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; star: boolean }
interface Floater { x: number; y: number; text: string; life: number; max: number; color: string; size: number }

interface Game {
  snake: Cell[]
  prev: Cell[]
  dir: Direction
  queue: Direction[]
  food: Food | null
  foodSeq: number
  speed: number
  acc: number
  score: number
  eaten: number
  combo: number
  bestCombo: number
  comboLeft: number
  particles: Particle[]
  floaters: Floater[]
  mood: ChipieMood
  moodT: number
  dead: boolean
  deadT: number
  finished: boolean
  shake: number
  ambience: number
  time: number
  countdown: number
  goT: number
  difficulty: Difficulty
}

interface EndStats { score: number; eaten: number; length: number; bestCombo: number; record: boolean; stars: number }

// ===== Utilitaires =====
function getPool() {
  const all = VEGETAUX.filter(v => v.image && !v.image.includes('placeholder'))
  return {
    good: all.filter(v => v.restriction === 'aucune'),
    moderate: all.filter(v => v.restriction === 'petite_quantite'),
    bad: all.filter(v => v.restriction === 'a_eviter'),
  }
}

function randomEmptyCell(snake: Cell[]): Cell {
  const occupied = new Set(snake.map(([x, y]) => `${x}-${y}`))
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(Math.random() * GRID_W)
    const y = Math.floor(Math.random() * GRID_H)
    if (!occupied.has(`${x}-${y}`)) return [x, y]
  }
  return [0, 0]
}

function loadBest(): number {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 }
}
function saveBest(score: number): boolean {
  const prev = loadBest()
  if (score > prev) { try { localStorage.setItem(BEST_KEY, String(score)) } catch { /* */ } return true }
  return false
}
function getTodayStr() { return new Date().toISOString().slice(0, 10) }
function loadStreak(): { date: string; count: number } {
  try { const s = localStorage.getItem(STREAK_KEY); if (!s) return { date: '', count: 0 }; return JSON.parse(s) } catch { return { date: '', count: 0 } }
}
function updateStreak(): number {
  const today = getTodayStr()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const streak = loadStreak()
  if (streak.date === today) return streak.count
  const newCount = streak.date === yesterday ? streak.count + 1 : 1
  try { localStorage.setItem(STREAK_KEY, JSON.stringify({ date: today, count: newCount })) } catch { /* */ }
  return newCount
}
function lockOrientation() {
  try { (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('portrait-primary')?.catch(() => {/* */}) } catch { /* */ }
}
function unlockOrientation() {
  try { screen.orientation.unlock() } catch { /* */ }
}

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Têtes de Chipie dessinées (une image par humeur, fabriquée une seule fois)
const headCache = new Map<ChipieMood, HTMLImageElement>()
function headImage(mood: ChipieMood): HTMLImageElement {
  let img = headCache.get(mood)
  if (!img) {
    const svg = renderToStaticMarkup(<ChipieCharacter mood={mood} head animated={false} size={144} />)
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    headCache.set(mood, img)
  }
  return img
}

// Décor du terrain : fleurs et cailloux répartis une fois pour toutes
interface Decor { x: number; y: number; kind: 'flower' | 'stone' | 'tuft'; color: string }
const DECOR: Decor[] = (() => {
  const r = rng(77)
  const out: Decor[] = []
  const colors = ['#ffffff', '#ffb3d0', '#ffe066', '#c9b6ff']
  for (let i = 0; i < 70; i++) out.push({ x: r() * GRID_W, y: r() * GRID_H, kind: 'tuft', color: '' })
  for (let i = 0; i < 14; i++) out.push({ x: r() * GRID_W, y: r() * GRID_H, kind: 'flower', color: colors[i % colors.length] })
  for (let i = 0; i < 7; i++) out.push({ x: r() * GRID_W, y: r() * GRID_H, kind: 'stone', color: '' })
  return out
})()

function buildField(w: number, h: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.round(w * dpr)
  c.height = Math.round(h * dpr)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.scale(dpr, dpr)
  const cs = w / GRID_W
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#86cf55' : '#7bc44a'
      ctx.fillRect(x * cs, y * cs, cs + 0.5, cs + 0.5)
    }
  }
  for (const d of DECOR) {
    const px = d.x * cs, py = d.y * cs
    if (d.kind === 'tuft') {
      ctx.strokeStyle = 'rgba(40, 110, 40, 0.35)'
      ctx.lineWidth = Math.max(1, cs * 0.04)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(px, py); ctx.lineTo(px - cs * 0.07, py - cs * 0.16)
      ctx.moveTo(px, py); ctx.lineTo(px + cs * 0.02, py - cs * 0.19)
      ctx.moveTo(px, py); ctx.lineTo(px + cs * 0.09, py - cs * 0.14)
      ctx.stroke()
    } else if (d.kind === 'flower') {
      ctx.fillStyle = d.color
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        ctx.beginPath(); ctx.arc(px + Math.cos(a) * cs * 0.07, py + Math.sin(a) * cs * 0.07, cs * 0.05, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#f5b800'
      ctx.beginPath(); ctx.arc(px, py, cs * 0.035, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.16)'
      ctx.beginPath(); ctx.ellipse(px + cs * 0.02, py + cs * 0.06, cs * 0.13, cs * 0.07, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#b4b8a8'
      ctx.beginPath(); ctx.ellipse(px, py, cs * 0.12, cs * 0.08, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath(); ctx.ellipse(px - cs * 0.03, py - cs * 0.025, cs * 0.05, cs * 0.025, 0, 0, Math.PI * 2); ctx.fill()
    }
  }
  return c
}

const STARS = (() => {
  const r = rng(5)
  return Array.from({ length: 16 }, () => ({ x: r(), y: r(), s: 0.6 + r() * 1.2, p: r() * 6 }))
})()

// ===== Composant =====
export default function SnakePage() {
  const navigate = useNavigate()
  const audio = useSnakeAudio()
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('chipie-snake-muted') === '1' } catch { return false } })
  const pool = useMemo(getPool, [])

  const [screenName, setScreen] = useState<Screen>('menu')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [food, setFood] = useState<Food | null>(null)
  const [hud, setHud] = useState({ score: 0, eaten: 0, length: 3, combo: 0 })
  const [scoreBump, setScoreBump] = useState(false)
  const [paused, setPaused] = useState(false)
  const [countLabel, setCountLabel] = useState<string | null>(null)
  const [endStats, setEndStats] = useState<EndStats | null>(null)
  const [shownScore, setShownScore] = useState(0)
  const [starsShown, setStarsShown] = useState(0)
  const [streak, setStreak] = useState(() => loadStreak().count)
  const [best, setBest] = useState(loadBest)

  const gRef = useRef<Game | null>(null)
  const pausedRef = useRef(false)
  const touchRef = useRef<{ x: number; y: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gaugeRef = useRef<HTMLDivElement>(null)

  useEffect(() => { (['happy', 'surprised', 'love', 'sad'] as ChipieMood[]).forEach(headImage) }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => { const n = !prev; try { localStorage.setItem('chipie-snake-muted', n ? '1' : '0') } catch { /* */ } return n })
  }, [])

  const setPause = useCallback((value: boolean) => {
    pausedRef.current = value
    setPaused(value)
    audio.playPause()
  }, [audio])

  const pickFood = useCallback((snake: Cell[], diff: Difficulty, seq: number): Food => {
    const [x, y] = randomEmptyCell(snake)
    const cfg = DIFFICULTY_CONFIG[diff]
    const r = Math.random()
    let kind: FoodKind = 'good'
    if (r < cfg.badChance && pool.bad.length > 0) kind = 'bad'
    else if (r < cfg.badChance + 0.20 && pool.moderate.length > 0) kind = 'moderate'
    const list = kind === 'good' ? pool.good : kind === 'moderate' ? pool.moderate : pool.bad
    return { id: seq, x, y, vegetal: list[Math.floor(Math.random() * list.length)], kind }
  }, [pool])

  const startGame = useCallback((diff: Difficulty) => {
    const snake: Cell[] = [[6, 7], [5, 7], [4, 7]]
    const g: Game = {
      snake, prev: snake, dir: 'right', queue: [], food: null, foodSeq: 1,
      speed: DIFFICULTY_CONFIG[diff].baseSpeed, acc: 0,
      score: 0, eaten: 0, combo: 0, bestCombo: 0, comboLeft: 0,
      particles: [], floaters: [], mood: 'happy', moodT: 0,
      dead: false, deadT: 0, finished: false, shake: 0, ambience: 0, time: 0,
      countdown: COUNTDOWN_MS, goT: 0, difficulty: diff,
    }
    g.food = pickFood(snake, diff, g.foodSeq++)
    gRef.current = g
    setFood(g.food)
    setHud({ score: 0, eaten: 0, length: 3, combo: 0 })
    setPaused(false)
    pausedRef.current = false
    setEndStats(null)
    setCountLabel('3')
    setStreak(updateStreak())
    setScreen('play')
    audio.playTick()
    lockOrientation()
  }, [pickFood, audio])

  const changeDirection = useCallback((dir: Direction) => {
    const g = gRef.current
    if (!g || pausedRef.current || g.dead) return
    const last = g.queue.length > 0 ? g.queue[g.queue.length - 1] : g.dir
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' } as const
    if (dir === last || dir === opposite[last]) return
    if (g.queue.length < 2) g.queue.push(dir)
  }, [])

  const quitToGames = useCallback(() => { unlockOrientation(); navigate('/jeu') }, [navigate])

  // ----- Boucle de jeu et dessin -----
  useEffect(() => {
    if (screenName !== 'play') return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = prefersReducedMotion()

    let W = 0, H = 0, dpr = 1
    let field: HTMLCanvasElement | null = null
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      if (rect.width < 10) return
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = rect.width; H = rect.width * (GRID_H / GRID_W)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      field = buildField(W, H, dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const burst = (g: Game, cx: number, cy: number, colors: string[], n: number) => {
      const count = reduce ? Math.ceil(n / 3) : n
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 40 + Math.random() * 140
        g.particles.push({
          x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
          life: 0, max: 450 + Math.random() * 450, color: colors[i % colors.length],
          size: 2 + Math.random() * 3.5, star: Math.random() < 0.35,
        })
      }
    }

    const finish = (g: Game) => {
      g.finished = true
      const record = saveBest(g.score)
      const stars = g.score >= 150 ? 3 : g.score >= 80 ? 2 : g.score >= 30 ? 1 : 0
      setBest(loadBest())
      setEndStats({ score: g.score, eaten: g.eaten, length: g.snake.length, bestCombo: g.bestCombo, record, stars })
      setScreen('end')
    }

    const die = (g: Game, reason: 'wall' | 'self' | 'bad', cs: number) => {
      g.dead = true
      g.deadT = 0
      g.mood = 'sad'
      g.shake = reduce ? 0 : 14
      g.combo = 0
      g.comboLeft = 0
      setHud(h => ({ ...h, combo: 0 }))
      if (reason === 'bad') audio.playBadEat(); else audio.playGameOver()
      const [hx, hy] = g.snake[0]
      burst(g, (hx + 0.5) * cs, (hy + 0.5) * cs, reason === 'bad' ? ['#ff453a', '#ff8a65', '#fff'] : ['#ffd54a', '#fff', '#ffb74d'], 22)
      unlockOrientation()
    }

    const step = (g: Game) => {
      if (g.queue.length > 0) g.dir = g.queue.shift() as Direction
      const cs = W / GRID_W
      const [hx, hy] = g.snake[0]
      let nx = hx, ny = hy
      if (g.dir === 'up') ny--; else if (g.dir === 'down') ny++; else if (g.dir === 'left') nx--; else nx++
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) { die(g, 'wall', cs); return }
      const eating = !!g.food && g.food.x === nx && g.food.y === ny
      // la queue avance en même temps : la dernière case n'est pas un obstacle, sauf si on grandit
      const body = eating ? g.snake : g.snake.slice(0, -1)
      if (body.some(([x, y]) => x === nx && y === ny)) { die(g, 'self', cs); return }

      const old = g.snake
      const next: Cell[] = [[nx, ny], ...old]
      if (!eating) next.pop()
      g.prev = eating ? [...old, old[old.length - 1]] : old
      g.snake = next
      g.acc = Math.max(0, g.acc - g.speed)

      if (eating && g.food) {
        const f = g.food
        const cx = (nx + 0.5) * cs, cy = (ny + 0.5) * cs
        if (f.kind === 'bad') {
          g.prev = old
          g.snake = next
          die(g, 'bad', cs)
          return
        }
        if (f.kind === 'good') {
          g.combo = g.comboLeft > 0 ? g.combo + 1 : 1
          g.comboLeft = COMBO_MS
          g.bestCombo = Math.max(g.bestCombo, g.combo)
          const mult = Math.min(5, g.combo)
          const pts = 10 * mult
          g.score += pts
          g.eaten++
          g.speed = Math.max(DIFFICULTY_CONFIG[g.difficulty].minSpeed, g.speed - DIFFICULTY_CONFIG[g.difficulty].speedStep)
          g.floaters.push({ x: cx, y: cy - cs * 0.3, text: `+${pts}`, life: 0, max: 900, color: '#fff7c2', size: cs * 0.6 })
          if (mult >= 2) g.floaters.push({ x: cx, y: cy - cs * 0.95, text: `COMBO x${mult}`, life: 0, max: 1100, color: '#ffb74d', size: cs * 0.42 })
          burst(g, cx, cy, ['#ffe066', '#ffffff', '#9be564', '#ffb74d'], 16 + mult * 3)
          g.mood = 'love'; g.moodT = 520
          audio.playEat(mult)
        } else {
          g.score += 5
          g.eaten++
          g.floaters.push({ x: cx, y: cy - cs * 0.3, text: '+5', life: 0, max: 800, color: '#ffd9a0', size: cs * 0.5 })
          burst(g, cx, cy, ['#ffb74d', '#ffe0b2'], 10)
          g.mood = 'happy'; g.moodT = 300
          audio.playModerate()
        }
        g.foodSeq++
        g.food = pickFood(g.snake, g.difficulty, g.foodSeq)
        setFood(g.food)
        setHud({ score: g.score, eaten: g.eaten, length: g.snake.length, combo: g.combo })
        setScoreBump(true)
        setTimeout(() => setScoreBump(false), 300)
      }
    }

    const draw = (g: Game) => {
      const cs = W / GRID_W
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      if (g.shake > 0.3) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake)
      if (field) ctx.drawImage(field, 0, 0, W, H)

      // — corps : un trait doux + des pelotes de poils
      const t = g.dead ? 1 : Math.min(1, g.acc / g.speed)
      const pts = g.snake.map(([x, y], i) => {
        const [px, py] = g.prev[i] ?? [x, y]
        return [(px + (x - px) * t + 0.5) * cs, (py + (y - py) * t + 0.5) * cs] as const
      })
      const n = pts.length
      if (n > 1) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'
        ctx.lineWidth = cs * 0.66
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + cs * 0.06) : ctx.moveTo(x, y + cs * 0.06))); ctx.stroke()
        ctx.strokeStyle = '#20232e'
        ctx.lineWidth = cs * 0.58
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke()
      }
      for (let i = n - 1; i >= 1; i--) {
        const [x, y] = pts[i]
        const r = cs * (0.4 - 0.1 * (i / n)) * (1 + 0.03 * Math.sin(g.time / 170 + i))
        const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r)
        grad.addColorStop(0, '#454b5e'); grad.addColorStop(1, '#171a22')
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(210,187,151,0.5)'
        ctx.beginPath(); ctx.arc(x + r * 0.15, y + r * 0.35, r * 0.3, 0, Math.PI * 2); ctx.fill()
      }
      if (n > 1) { // petite queue en pompon crème
        const [tx, ty] = pts[n - 1]
        const [bx, by] = pts[n - 2]
        const a = Math.atan2(ty - by, tx - bx)
        ctx.fillStyle = '#efe4cc'
        ctx.beginPath(); ctx.arc(tx + Math.cos(a) * cs * 0.28, ty + Math.sin(a) * cs * 0.28, cs * 0.17, 0, Math.PI * 2); ctx.fill()
      }

      // — tête : la vraie Chipie, qui regarde dans le sens de la marche
      const [hx, hy] = pts[0]
      let mood = g.mood
      if (!g.dead && g.moodT <= 0 && g.food) {
        const [fx, fy] = [g.food.x, g.food.y]
        const [sx, sy] = g.snake[0]
        if (Math.abs(fx - sx) + Math.abs(fy - sy) <= 2 && g.food.kind !== 'bad') mood = 'surprised'
        else mood = 'happy'
      }
      const img = headImage(mood)
      if (img.complete && img.naturalWidth > 0) {
        const hw = cs * 1.75, hh = hw * (128 / 144)
        ctx.save()
        ctx.translate(hx, hy - cs * 0.08)
        ctx.rotate(Math.sin(g.time / 260) * 0.05)
        if (g.dir === 'left') ctx.scale(-1, 1)
        ctx.drawImage(img, -hw / 2, -hh / 2, hw, hh)
        ctx.restore()
      }

      // — particules et chiffres qui s'envolent
      for (const p of g.particles) {
        const k = 1 - p.life / p.max
        ctx.globalAlpha = Math.max(0, k)
        ctx.fillStyle = p.color
        if (p.star) {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life / 120)
          ctx.fillRect(-p.size, -p.size / 3, p.size * 2, p.size / 1.5)
          ctx.fillRect(-p.size / 3, -p.size, p.size / 1.5, p.size * 2)
          ctx.restore()
        } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k + 0.5, 0, Math.PI * 2); ctx.fill() }
      }
      ctx.globalAlpha = 1
      ctx.textAlign = 'center'
      for (const f of g.floaters) {
        const k = f.life / f.max
        ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
        ctx.font = `800 ${f.size}px Fredoka Variable, Nunito Variable, sans-serif`
        ctx.lineWidth = f.size * 0.2
        ctx.strokeStyle = 'rgba(40,20,0,0.75)'
        ctx.strokeText(f.text, f.x, f.y - k * cs * 1.2)
        ctx.fillStyle = f.color
        ctx.fillText(f.text, f.x, f.y - k * cs * 1.2)
      }
      ctx.globalAlpha = 1

      // — ambiance : jour, coucher de soleil, nuit étoilée
      const a = g.ambience
      if (a > 0.01) {
        const k = Math.min(1, Math.max(0, a - 1))
        const r = Math.round(255 + (12 - 255) * k), gg = Math.round(130 + (22 - 130) * k), b = Math.round(50 + (80 - 50) * k)
        const alpha = (a < 1 ? 0.2 * a : 0.2 + 0.28 * k)
        ctx.fillStyle = `rgba(${r},${gg},${b},${alpha})`
        ctx.fillRect(0, 0, W, H)
        if (a > 1.15) {
          for (const s of STARS) {
            ctx.globalAlpha = Math.min(1, (a - 1.15) * 1.5) * (0.5 + 0.5 * Math.sin(g.time / 400 + s.p))
            ctx.fillStyle = '#fff'
            ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.s, 0, Math.PI * 2); ctx.fill()
          }
          ctx.globalAlpha = 1
        }
      }
      const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.45, W / 2, H / 2, W * 0.95)
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }

    let raf = 0
    let last = performance.now()
    let lastLabel = '3'
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const g = gRef.current
      if (!g || W === 0) { last = now; return }
      let dt = Math.min(50, now - last)
      last = now
      if (pausedRef.current) { draw(g); return }

      if (g.dead) {
        g.deadT += dt
        dt *= 0.35 // ralenti à la mort
        if (g.deadT > DEATH_MS && !g.finished) finish(g)
      } else if (g.countdown > 0) {
        g.countdown -= dt
        const label = String(Math.max(1, Math.ceil(g.countdown / 800)))
        if (g.countdown <= 0) { g.goT = GO_MS; setCountLabel('GO !'); audio.playGo() }
        else if (label !== lastLabel) { lastLabel = label; setCountLabel(label); audio.playTick() }
      } else {
        if (g.goT > 0) { g.goT -= dt; if (g.goT <= 0) setCountLabel(null) }
        if (g.comboLeft > 0) {
          g.comboLeft -= dt
          if (g.comboLeft <= 0) { g.combo = 0; setHud(h => ({ ...h, combo: 0 })) }
        }
        g.acc += dt
        let guard = 0
        while (g.acc >= g.speed && !g.dead && guard++ < 3) step(g)
      }

      g.time += dt
      if (g.moodT > 0) g.moodT -= dt
      if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 0.03)
      const target = g.score >= 160 ? 2 : g.score >= 80 ? 1 : 0
      g.ambience += (target - g.ambience) * Math.min(1, dt / 900)
      for (const p of g.particles) { p.life += dt; p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.vy += 260 * dt / 1000 }
      g.particles = g.particles.filter(p => p.life < p.max)
      for (const f of g.floaters) f.life += dt
      g.floaters = g.floaters.filter(f => f.life < f.max)
      if (gaugeRef.current) gaugeRef.current.style.transform = `scaleX(${g.comboLeft > 0 ? g.comboLeft / COMBO_MS : 0})`
      draw(g)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [screenName, audio, pickFood])

  // Pause automatique quand l'app passe en arrière-plan
  useEffect(() => {
    if (screenName !== 'play') return
    const onHide = () => { if (document.hidden && !pausedRef.current && gRef.current && !gRef.current.dead) { pausedRef.current = true; setPaused(true) } }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [screenName])

  // Clavier
  useEffect(() => {
    if (screenName !== 'play') return
    const map: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape') { e.preventDefault(); setPause(!pausedRef.current); return }
      const dir = map[e.key]
      if (dir) { e.preventDefault(); changeDirection(dir) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screenName, changeDirection, setPause])

  // Écran de fin : score qui monte, étoiles qui s'allument une à une, confettis si record
  useEffect(() => {
    if (screenName !== 'end' || !endStats) return
    setShownScore(0)
    setStarsShown(0)
    const total = endStats.score
    let i = 0
    const steps = 24
    const tick = setInterval(() => {
      i++
      setShownScore(Math.round((total * Math.min(1, i / steps))))
      if (i >= steps) clearInterval(tick)
    }, 35)
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let s = 1; s <= endStats.stars; s++) {
      timers.push(setTimeout(() => { setStarsShown(s); audio.playStar(s) }, 500 + s * 450))
    }
    if (endStats.record) timers.push(setTimeout(() => confetti(), 900))
    return () => { clearInterval(tick); timers.forEach(clearTimeout) }
  }, [screenName, endStats, audio])

  // Glisser du doigt
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    // un glissement déclenche le virage tout de suite (réactif, comme un jeu mobile)
    const start = touchRef.current
    if (!start) return
    const dx = e.touches[0].clientX - start.x
    const dy = e.touches[0].clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) changeDirection(dx > 0 ? 'right' : 'left')
    else changeDirection(dy > 0 ? 'down' : 'up')
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [changeDirection])
  const onTouchEnd = useCallback(() => { touchRef.current = null }, [])

  // ===== MENU =====
  if (screenName === 'menu') {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.back} onClick={() => navigate('/jeu')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            <span>Retour</span>
          </button>
          <button className={styles.muteBtn} onClick={toggleMute} aria-label="Son">{muted ? '🔇' : '🔊'}</button>
        </div>

        <div className={styles.menuScreen}>
          <div className={styles.logoWrap}>
            <span className={`${styles.floatItem} ${styles.f1}`}>🥕</span>
            <span className={`${styles.floatItem} ${styles.f2}`}>🥬</span>
            <span className={`${styles.floatItem} ${styles.f3}`}>🍃</span>
            <ChipieCharacter mood="happy" size={170} />
          </div>
          <h1 className={styles.menuTitle}>SNAKE CHIPIE</h1>
          <p className={styles.menuSubtitle}>Guide Chipie dans le jardin !</p>

          <div className={styles.difficultyRow}>
            {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                className={`${styles.diffBtn} ${difficulty === d ? styles.diffBtnActive : ''} ${styles[`diffBtn_${d}`]}`}
                onClick={() => setDifficulty(d)}
              >
                <span className={styles.diffEmoji}>{DIFFICULTY_CONFIG[d].emoji}</span>
                <span className={styles.diffLabel}>{DIFFICULTY_CONFIG[d].label}</span>
              </button>
            ))}
          </div>

          <div className={styles.rules}>
            <span className={`${styles.rule} ${styles.ruleGood}`}>✅ +10</span>
            <span className={`${styles.rule} ${styles.ruleMid}`}>⚠️ +5</span>
            <span className={`${styles.rule} ${styles.ruleBad}`}>❌ Perdu</span>
            <span className={`${styles.rule} ${styles.ruleCombo}`}>🔥 Combos jusqu'à x5</span>
          </div>

          <div className={styles.menuFooter}>
            {best > 0 && <div className={styles.menuBest}>🏆 Record : {best} pts</div>}
            {streak >= 2 && <div className={styles.menuStreak}>🔥 {streak} jours de suite !</div>}
          </div>

          <button className={styles.playBtn} onClick={() => startGame(difficulty)}>JOUER</button>
        </div>
      </div>
    )
  }

  // ===== FIN =====
  if (screenName === 'end' && endStats) {
    const endMood: ChipieMood = endStats.record ? 'love' : endStats.stars >= 2 ? 'happy' : endStats.stars === 1 ? 'surprised' : 'sad'
    return (
      <div className={styles.page}>
        <div className={styles.endScreen}>
          <ChipieCharacter mood={endMood} size={150} />
          <h2 className={styles.endTitle}>{endStats.stars === 3 ? 'Incroyable !' : endStats.stars >= 1 || endStats.record ? 'Bien joué !' : 'Aïe…'}</h2>

          <div className={styles.starsRow} aria-label={`${endStats.stars} étoile${endStats.stars > 1 ? 's' : ''} sur 3`}>
            {[1, 2, 3].map(s => (
              <span key={s} className={`${styles.star} ${starsShown >= s ? styles.starOn : ''}`}>★</span>
            ))}
          </div>

          {endStats.record && <div className={styles.newRecord}>🏆 Nouveau record !</div>}

          <div className={styles.bigScore}>{shownScore}<small> pts</small></div>

          <div className={styles.endStats}>
            <div className={styles.endStat}><span className={styles.endStatNum}>{endStats.eaten}</span><span className={styles.endStatLabel}>aliments</span></div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}><span className={styles.endStatNum}>{endStats.length}</span><span className={styles.endStatLabel}>longueur</span></div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}><span className={styles.endStatNum}>x{Math.max(1, Math.min(5, endStats.bestCombo))}</span><span className={styles.endStatLabel}>meilleur combo</span></div>
          </div>

          {best > 0 && !endStats.record && <div className={styles.endRecord}>Record : {best} pts</div>}

          <div className={styles.endActions}>
            <button className={styles.playBtn} onClick={() => startGame(difficulty)}>REJOUER</button>
            <button className={styles.menuBtn} onClick={() => setScreen('menu')}>Menu</button>
            <button className={styles.menuBtn} onClick={quitToGames}>Retour aux jeux</button>
          </div>
        </div>
      </div>
    )
  }

  // ===== JEU =====
  const mult = Math.min(5, hud.combo)
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => { if (!pausedRef.current) setPause(true) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          <span>Menu</span>
        </button>
        <span className={`${styles.scoreLabel} ${scoreBump ? styles.scoreBump : ''}`}>{hud.score} pts</span>
        <div className={styles.topRight}>
          <button className={styles.pauseBtn} onClick={() => setPause(!paused)} aria-label={paused ? 'Reprendre' : 'Pause'}>
            {paused
              ? <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z" /></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>}
          </button>
          <button className={styles.muteBtn} onClick={toggleMute} aria-label="Son">{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>

      <div className={styles.infoRow}>
        <span className={styles.infoItem}>🍽️ {hud.eaten}</span>
        <div className={`${styles.combo} ${mult >= 2 ? styles.comboHot : ''}`}>
          <span className={styles.comboLabel}>{mult >= 2 ? `🔥 COMBO x${mult}` : 'Combo'}</span>
          <div className={styles.gauge}><div ref={gaugeRef} className={styles.gaugeFill} /></div>
        </div>
        <span className={`${styles.infoItem} ${styles[`diffTag_${difficulty}`]}`}>
          {DIFFICULTY_CONFIG[difficulty].emoji} {DIFFICULTY_CONFIG[difficulty].label}
        </span>
      </div>

      <div className={styles.frame}>
        <div className={styles.gridWrap} ref={wrapRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <canvas ref={canvasRef} className={styles.canvas} />
          {food && (
            <div
              key={food.id}
              className={styles.foodSlot}
              style={{ left: `${(food.x / GRID_W) * 100}%`, top: `${(food.y / GRID_H) * 100}%`, width: `${100 / GRID_W}%`, height: `${100 / GRID_H}%` }}
            >
              <span className={`${styles.halo} ${styles[`halo_${food.kind}`]}`} />
              <VegetalImage vegetal={food.vegetal} className={`${styles.foodImg} ${styles[`food_${food.kind}`]}`} />
            </div>
          )}

          {countLabel && !paused && <div key={countLabel} className={styles.countdown}>{countLabel}</div>}

          {paused && (
            <div className={styles.pauseOverlay}>
              <div className={styles.pauseCard}>
                <ChipieCharacter mood="sleep" size={96} />
                <p className={styles.pauseTitle}>Pause</p>
                <button className={styles.playBtn} onClick={() => setPause(false)}>REPRENDRE</button>
                <button className={styles.menuBtn} onClick={toggleMute}>{muted ? '🔇 Son coupé' : '🔊 Son activé'}</button>
                <button className={styles.menuBtn} onClick={quitToGames}>Quitter la partie</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => changeDirection('up')} aria-label="Haut">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
          </button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => changeDirection('left')} aria-label="Gauche">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M19 12H5m0 0l7-7m-7 7l7 7" /></svg>
          </button>
          <div className={styles.dirCenter}>🐰</div>
          <button className={styles.dirBtn} onClick={() => changeDirection('right')} aria-label="Droite">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M5 12h14m0 0l-7-7m7 7l-7 7" /></svg>
          </button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => changeDirection('down')} aria-label="Bas">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M12 5v14m0 0l7-7m-7 7l-7-7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { VEGETAUX, CATEGORIES, type Vegetal } from '../../data/vegetaux'
import VegetalImage from '../../components/VegetalImage/VegetalImage'
import VegetalIllustration from '../../components/VegetalIllustration/VegetalIllustration'
import ChipieCharacter from '../../components/ChipieCharacter/ChipieCharacter'
import type { ChipieMood } from '../../components/ChipieCharacter/ChipieCharacter'
import { hashSeed, rng } from '../../components/VegetalIllustration/describe'
import { confetti } from '../../services/confetti'
import { useMazeAudio } from './useMazeAudio'
import {
  generateMaze, canMove, openDirs, findPath, placeItems, placePortals,
  DIRS, OPPOSITE,
  type Cell, type Dir, type Rand,
} from './maze'
import styles from './LabyrintePage.module.css'

// ===== Modes de jeu =====
type ModeKind = 'single' | 'endless' | 'attack'

interface Mode {
  id: string
  label: string
  emoji: string
  desc: string
  kind: ModeKind
  size: number
  timeLimit: number   // secondes (0 = sans chrono)
  hints: number
  carrotCount: number
  fog: boolean
  mudCount: number
  portalPairs: number
  thornCount: number
  foxes: number
  foxMs: number       // durée d'un pas du renard
  bonuses: number
}

const MODES: Mode[] = [
  { id: 'facile', label: 'Facile', emoji: '🌱', desc: 'Grille 7×7, sans chrono', kind: 'single', size: 7, timeLimit: 0, hints: 3, carrotCount: 3, fog: false, mudCount: 0, portalPairs: 0, thornCount: 0, foxes: 0, foxMs: 0, bonuses: 1 },
  { id: 'normal', label: 'Normal', emoji: '🌿', desc: 'Grille 9×9, portails, boue et un renard', kind: 'single', size: 9, timeLimit: 60, hints: 2, carrotCount: 4, fog: true, mudCount: 3, portalPairs: 1, thornCount: 2, foxes: 1, foxMs: 520, bonuses: 2 },
  { id: 'difficile', label: 'Difficile', emoji: '🔥', desc: 'Grille 11×11, tous les obstacles', kind: 'single', size: 11, timeLimit: 45, hints: 1, carrotCount: 5, fog: true, mudCount: 4, portalPairs: 2, thornCount: 3, foxes: 1, foxMs: 380, bonuses: 2 },
  { id: 'quotidien', label: 'Défi du jour', emoji: '📅', desc: 'Le même labyrinthe pour tous, une fois par jour', kind: 'single', size: 9, timeLimit: 0, hints: 1, carrotCount: 4, fog: true, mudCount: 3, portalPairs: 1, thornCount: 2, foxes: 1, foxMs: 480, bonuses: 2 },
  { id: 'sansfin', label: 'Sans fin', emoji: '♾️', desc: '3 vies, des labyrinthes de plus en plus grands', kind: 'endless', size: 7, timeLimit: 0, hints: 1, carrotCount: 3, fog: false, mudCount: 2, portalPairs: 0, thornCount: 1, foxes: 0, foxMs: 480, bonuses: 1 },
  { id: 'montre', label: 'Contre la montre', emoji: '⏱️', desc: '75 s, +5 s par labyrinthe réussi', kind: 'attack', size: 7, timeLimit: 75, hints: 1, carrotCount: 3, fog: false, mudCount: 2, portalPairs: 1, thornCount: 1, foxes: 0, foxMs: 0, bonuses: 1 },
]

const ENDLESS_SIZES = [7, 7, 9, 9, 11, 11, 13, 13, 15]
const BEST_SCORES_KEY = 'chipie-maze-best'
const STEP_MS = 115
const BOOTS_STEP_MS = 70

type BonusKind = 'hourglass' | 'boots' | 'compass'

interface Fox { r: number; c: number; fr: number; fc: number; t: number; last: Dir | null }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; star: boolean }
interface Floater { x: number; y: number; text: string; life: number; max: number; color: string; size: number }

interface Game {
  mode: Mode
  rand: Rand
  size: number
  grid: Cell[][]
  fieldDirty: boolean
  // Chipie
  r: number; c: number
  fr: number; fc: number
  t: number
  moving: boolean
  running: boolean
  dir: Dir
  nextDir: Dir | null
  facing: 1 | -1
  // Parties
  steps: number
  elapsed: number
  timeLeft: number
  lives: number
  mazes: number
  carrotsTaken: number
  carrotsMaze: number
  carrotCountMaze: number
  hintsLeft: number
  hintsUsed: number
  optimal: number
  food: Vegetal
  // Objets
  carrots: Set<string>
  mud: Set<string>
  thorns: Set<string>
  portals: Map<string, string>
  bonuses: Map<string, BonusKind>
  visited: Set<string>
  // États temporaires (ms)
  frozen: number
  invuln: number
  boots: number
  compass: number
  hintT: number
  foxFreeze: number
  hintPath: [number, number][]
  hintRecalc: number
  foxes: Fox[]
  // Effets
  mood: ChipieMood
  moodT: number
  shake: number
  time: number
  particles: Particle[]
  floaters: Floater[]
  // Fin
  won: boolean
  lost: boolean
  endT: number
  finished: boolean
  fogOn: boolean
  startStepDir?: Dir
  pendingSound?: boolean
}

interface EndStats {
  won: boolean; mode: Mode; steps: number; elapsed: number; optimal: number
  carrots: number; carrotTotal: number; stars: number; record: boolean
  mazes: number; food: Vegetal
}

// ===== Outils =====
const todayKey = () => new Date().toISOString().slice(0, 10)

function loadBestScores(): Record<string, { stars: number; carrots: number }> {
  try { return JSON.parse(localStorage.getItem(BEST_SCORES_KEY) || '{}') } catch { return {} }
}

function saveBestScore(id: string, stars: number, carrots: number): boolean {
  const scores = loadBestScores()
  const prev = scores[id]
  const total = stars * 1000 + carrots
  const prevTotal = prev ? prev.stars * 1000 + prev.carrots : -1
  if (total > prevTotal) {
    scores[id] = { stars, carrots }
    try { localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(scores)) } catch { /* */ }
    return true
  }
  return false
}

const FOOD_POOL = VEGETAUX.filter(v => v.image && !v.image.includes('placeholder') && v.restriction !== 'a_eviter')
const pickFood = (rand: Rand) => FOOD_POOL[Math.floor(rand() * FOOD_POOL.length)]

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Images dessinées une seule fois (Chipie par humeur, aliments en illustration)
const chipieCache = new Map<ChipieMood, HTMLImageElement>()
function chipieImage(mood: ChipieMood): HTMLImageElement {
  let img = chipieCache.get(mood)
  if (!img) {
    const svg = renderToStaticMarkup(<ChipieCharacter mood={mood} animated={false} size={200} />)
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    chipieCache.set(mood, img)
  }
  return img
}

const foodCache = new Map<string, HTMLImageElement>()
function foodImage(v: Vegetal): HTMLImageElement {
  let img = foodCache.get(v.id)
  if (!img) {
    const svg = renderToStaticMarkup(<VegetalIllustration vegetal={v} />)
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" ')
    img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    foodCache.set(v.id, img)
  }
  return img
}

const key = (r: number, c: number) => `${r}-${c}`

// ===== Décor : sol de terre et haies feuillues =====
const HEDGE_GREENS = ['#2f7d32', '#3a8f3c', '#2a6f30', '#45a049', '#357f38']

function buildField(g: Game, W: number, dpr: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(W * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.scale(dpr, dpr)
  const size = g.size
  const cs = W / size
  const t = Math.max(5, cs * 0.3)
  const r = rng(hashSeed(`field-${size}-${g.grid[0]?.length}-${g.mazes}-${Math.round(g.optimal)}`))

  // herbe puis sentiers de terre
  ctx.fillStyle = '#5fa843'
  ctx.fillRect(0, 0, W, W)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#ecd9ae' : '#e4cf9f'
      ctx.fillRect(x * cs, y * cs, cs + 0.5, cs + 0.5)
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(150,110,60,0.22)' : 'rgba(255,255,255,0.28)'
        ctx.beginPath()
        ctx.arc(x * cs + r() * cs, y * cs + r() * cs, 0.8 + r() * 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // segments de haie
  const segs: Array<[number, number, number, number]> = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = g.grid[y][x]
      if (cell.top) segs.push([x * cs, y * cs, (x + 1) * cs, y * cs])
      if (cell.left) segs.push([x * cs, y * cs, x * cs, (y + 1) * cs])
      if (y === size - 1 && cell.bottom) segs.push([x * cs, (y + 1) * cs, (x + 1) * cs, (y + 1) * cs])
      if (x === size - 1 && cell.right) segs.push([(x + 1) * cs, y * cs, (x + 1) * cs, (y + 1) * cs])
    }
  }
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(40,25,5,0.3)'
  ctx.lineWidth = t
  ctx.beginPath()
  for (const [x1, y1, x2, y2] of segs) { ctx.moveTo(x1 + 1.5, y1 + 3); ctx.lineTo(x2 + 1.5, y2 + 3) }
  ctx.stroke()
  ctx.strokeStyle = '#2a6a2e'
  ctx.lineWidth = t
  ctx.beginPath()
  for (const [x1, y1, x2, y2] of segs) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2) }
  ctx.stroke()
  // feuillage
  for (const [x1, y1, x2, y2] of segs) {
    const len = Math.hypot(x2 - x1, y2 - y1)
    const n = Math.max(2, Math.round(len / (t * 0.42)))
    for (let i = 0; i <= n; i++) {
      const p = i / n
      const px = x1 + (x2 - x1) * p + (r() - 0.5) * t * 0.5
      const py = y1 + (y2 - y1) * p + (r() - 0.5) * t * 0.5
      ctx.fillStyle = HEDGE_GREENS[Math.floor(r() * HEDGE_GREENS.length)]
      ctx.beginPath(); ctx.arc(px, py, t * (0.32 + r() * 0.12), 0, Math.PI * 2); ctx.fill()
      if (r() < 0.55) {
        ctx.fillStyle = 'rgba(190,255,150,0.30)'
        ctx.beginPath(); ctx.arc(px - t * 0.1, py - t * 0.12, t * 0.13, 0, Math.PI * 2); ctx.fill()
      }
      if (r() < 0.05) {
        ctx.fillStyle = r() < 0.5 ? '#ff8fb3' : '#fff3a0'
        ctx.beginPath(); ctx.arc(px, py, t * 0.12, 0, Math.PI * 2); ctx.fill()
      }
    }
  }
  return canvas
}

// ===== Dessin des objets =====
function drawCarrot(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, time: number, seed: number) {
  const bob = Math.sin(time / 260 + seed) * cs * 0.04
  const s = cs * 0.5
  const glow = ctx.createRadialGradient(x, y, 0, x, y, cs * 0.55)
  glow.addColorStop(0, 'rgba(255,220,120,0.65)'); glow.addColorStop(1, 'rgba(255,220,120,0)')
  ctx.fillStyle = glow
  ctx.beginPath(); ctx.arc(x, y, cs * 0.55, 0, Math.PI * 2); ctx.fill()
  ctx.save()
  ctx.translate(x, y + bob)
  ctx.rotate(-0.6)
  ctx.fillStyle = '#4cd964'
  for (const a of [-0.5, 0, 0.5]) {
    ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -s * 0.62, s * 0.1, s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  ctx.fillStyle = '#f58a2a'
  ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.38); ctx.quadraticCurveTo(0, -s * 0.5, s * 0.2, -s * 0.38)
  ctx.lineTo(0, s * 0.62); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = 'rgba(160,70,0,0.45)'; ctx.lineWidth = Math.max(1, cs * 0.03)
  ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.1); ctx.lineTo(s * 0.07, -s * 0.1); ctx.moveTo(-s * 0.05, s * 0.15); ctx.lineTo(s * 0.1, s * 0.15); ctx.stroke()
  ctx.restore()
}

function drawMud(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, time: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath(); ctx.ellipse(x, y + cs * 0.05, cs * 0.34, cs * 0.24, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#7a5230'
  ctx.beginPath(); ctx.ellipse(x, y, cs * 0.33, cs * 0.23, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#9a6b3f'
  ctx.beginPath(); ctx.ellipse(x - cs * 0.06, y - cs * 0.05, cs * 0.2, cs * 0.11, 0, 0, Math.PI * 2); ctx.fill()
  const b = (Math.sin(time / 300) + 1) / 2
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.beginPath(); ctx.arc(x + cs * 0.1, y - cs * 0.02 - b * cs * 0.04, cs * 0.04, 0, Math.PI * 2); ctx.fill()
}

function drawThorns(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number) {
  ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = Math.max(1.5, cs * 0.06); ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - cs * 0.34, y + cs * 0.2); ctx.bezierCurveTo(x - cs * 0.1, y - cs * 0.3, x + cs * 0.1, y + cs * 0.3, x + cs * 0.34, y - cs * 0.2)
  ctx.moveTo(x - cs * 0.3, y - cs * 0.22); ctx.bezierCurveTo(x - cs * 0.05, y + cs * 0.3, x + cs * 0.1, y - cs * 0.25, x + cs * 0.32, y + cs * 0.22)
  ctx.stroke()
  ctx.fillStyle = '#8b1d1d'
  for (const [dx, dy] of [[-0.26, 0.14], [-0.04, -0.1], [0.18, 0.04], [0.3, -0.14], [-0.2, -0.16], [0.08, 0.2], [0.28, 0.18]]) {
    ctx.beginPath(); ctx.moveTo(x + cs * dx, y + cs * dy - cs * 0.07); ctx.lineTo(x + cs * dx - cs * 0.045, y + cs * dy + cs * 0.04); ctx.lineTo(x + cs * dx + cs * 0.045, y + cs * dy + cs * 0.04); ctx.closePath(); ctx.fill()
  }
  ctx.fillStyle = '#2f7d32'
  ctx.beginPath(); ctx.arc(x - cs * 0.02, y + cs * 0.02, cs * 0.07, 0, Math.PI * 2); ctx.fill()
}

function drawPortal(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, time: number, pair: number) {
  const hue = pair % 2 === 0 ? ['#b266ff', '#e6ccff'] : ['#33c3ff', '#ccf1ff']
  const glow = ctx.createRadialGradient(x, y, 0, x, y, cs * 0.5)
  glow.addColorStop(0, hue[1]); glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.beginPath(); ctx.arc(x, y, cs * 0.5, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = Math.max(1.5, cs * 0.07)
  ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = i % 2 ? hue[1] : hue[0]
    const r = cs * (0.12 + i * 0.1)
    const a0 = time / (260 + i * 90) * (i % 2 ? -1 : 1) + i * 2
    ctx.beginPath(); ctx.arc(x, y, r, a0, a0 + Math.PI * 1.4); ctx.stroke()
  }
}

function drawBonus(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, time: number, kind: BonusKind) {
  const bob = Math.sin(time / 280) * cs * 0.05
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.beginPath(); ctx.arc(x, y + bob, cs * 0.36, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = kind === 'hourglass' ? '#ffb02e' : kind === 'boots' ? '#38b6ff' : '#9b5de5'
  ctx.lineWidth = Math.max(1.5, cs * 0.06)
  ctx.stroke()
  ctx.font = `${cs * 0.5}px sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000'
  ctx.fillText(kind === 'hourglass' ? '⏳' : kind === 'boots' ? '👢' : '🧭', x, y + bob + cs * 0.02)
}

function drawFox(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, time: number, frozen: boolean) {
  const s = cs * 0.42
  ctx.save()
  ctx.translate(x, y + Math.sin(time / 140) * cs * 0.02)
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath(); ctx.ellipse(0, s * 0.95, s * 0.9, s * 0.3, 0, 0, Math.PI * 2); ctx.fill()
  // queue
  ctx.fillStyle = '#e8731f'
  ctx.beginPath(); ctx.ellipse(s * 0.95, s * 0.3, s * 0.55, s * 0.3, -0.7, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.ellipse(s * 1.25, s * 0.02, s * 0.2, s * 0.14, -0.7, 0, Math.PI * 2); ctx.fill()
  // corps et tête
  ctx.fillStyle = '#f08a2e'
  ctx.beginPath(); ctx.ellipse(0, s * 0.45, s * 0.75, s * 0.55, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.72, 0, Math.PI * 2); ctx.fill()
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(sx * s * 0.2, -s * 0.55); ctx.lineTo(sx * s * 0.75, -s * 1.1); ctx.lineTo(sx * s * 0.72, -s * 0.2); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#3a1a08'
    ctx.beginPath(); ctx.moveTo(sx * s * 0.38, -s * 0.62); ctx.lineTo(sx * s * 0.68, -s * 0.95); ctx.lineTo(sx * s * 0.66, -s * 0.4); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#f08a2e'
  }
  ctx.fillStyle = '#fff4e0'
  ctx.beginPath(); ctx.ellipse(0, s * 0.12, s * 0.46, s * 0.34, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#2a1408'
  ctx.beginPath(); ctx.arc(0, s * 0.02, s * 0.1, 0, Math.PI * 2); ctx.fill()
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * s * 0.3, -s * 0.18, s * 0.08, s * 0.12, 0, 0, Math.PI * 2); ctx.fill() }
  if (frozen) { ctx.fillStyle = 'rgba(150,210,255,0.55)'; ctx.beginPath(); ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}

// ===== Composant =====
type Screen = 'select' | 'play' | 'end'
interface Hud { steps: number; time: number; carrots: number; carrotTotal: number; lives: number; mazes: number; hints: number; frozen: boolean; boots: boolean; compass: boolean }
const EMPTY_HUD: Hud = { steps: 0, time: 0, carrots: 0, carrotTotal: 0, lives: 0, mazes: 0, hints: 0, frozen: false, boots: false, compass: false }

export default function LabyrintePage() {
  const navigate = useNavigate()
  const audio = useMazeAudio()
  const [screen, setScreen] = useState<Screen>('select')
  const [mode, setMode] = useState<Mode>(MODES[0])
  const [hud, setHud] = useState<Hud>(EMPTY_HUD)
  const [end, setEnd] = useState<EndStats | null>(null)
  const [bestScores, setBestScores] = useState(loadBestScores)
  const [foodShown, setFoodShown] = useState<Vegetal>(FOOD_POOL[0])
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem(audio.MUTE_KEY) === '1' } catch { return false } })

  const gRef = useRef<Game | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const touchRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => { (['happy', 'surprised', 'love', 'sad'] as ChipieMood[]).forEach(chipieImage) }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      try { localStorage.setItem(audio.MUTE_KEY, next ? '1' : '0') } catch { /* */ }
      return next
    })
  }, [audio.MUTE_KEY])

  // ----- Construction d'un labyrinthe (le premier ou le suivant) -----
  const buildMaze = useCallback((g: Game) => {
    const m = g.mode
    const size = m.kind === 'endless' ? ENDLESS_SIZES[Math.min(g.mazes, ENDLESS_SIZES.length - 1)] : m.size
    g.size = size
    g.grid = generateMaze(size, g.rand)
    g.fieldDirty = true
    g.r = 0; g.c = 0; g.fr = 0; g.fc = 0; g.t = 0
    g.moving = false; g.running = false; g.nextDir = null; g.dir = 'right'
    const forbidden = new Set([key(0, 0), key(size - 1, size - 1)])
    const take = (n: number) => { const s = placeItems(size, n, new Set(forbidden), g.rand); s.forEach(k => forbidden.add(k)); return s }
    g.carrots = take(m.kind === 'endless' ? 3 : m.carrotCount)
    g.carrotCountMaze = g.carrots.size
    g.carrotsMaze = 0
    g.mud = take(m.mudCount)
    g.thorns = take(m.kind === 'endless' && g.mazes === 0 ? 0 : m.thornCount)
    g.portals = placePortals(size, m.kind === 'endless' ? (g.mazes >= 3 ? 1 : 0) : m.portalPairs, forbidden, g.rand)

    const foxCount = m.kind === 'endless' ? (g.mazes >= 6 ? 2 : g.mazes >= 2 ? 1 : 0) : m.foxes
    const hasTimer = m.timeLimit > 0
    const bonusKinds: BonusKind[] = hasTimer || foxCount > 0 ? ['hourglass', 'boots', 'compass'] : ['boots', 'compass']
    g.bonuses = new Map()
    for (const k of take(m.bonuses)) g.bonuses.set(k, bonusKinds[Math.floor(g.rand() * bonusKinds.length)])

    g.foxes = []
    for (let i = 0; i < foxCount; i++) {
      let fr = size - 1, fc = 0
      for (let a = 0; a < 60; a++) {
        const rr = Math.floor(g.rand() * size), cc = Math.floor(g.rand() * size)
        if (rr + cc >= size - 1 && !forbidden.has(key(rr, cc))) { fr = rr; fc = cc; break }
      }
      g.foxes.push({ r: fr, c: fc, fr, fc, t: Math.random(), last: null })
    }
    g.fogOn = m.kind === 'endless' ? g.mazes >= 4 : m.fog
    g.food = pickFood(g.rand)
    setFoodShown(g.food)
    g.optimal = findPath(g.grid, size, [0, 0], [size - 1, size - 1]).length - 1
    g.visited = new Set([key(0, 0)])
    g.hintsLeft = m.kind === 'single' ? (g.mazes === 0 ? m.hints : g.hintsLeft) : m.hints
    g.hintT = 0; g.compass = 0; g.hintPath = []
    g.frozen = 0; g.invuln = 0
    g.particles = []; g.floaters = []
    g.won = false
  }, [])

  const startGame = useCallback((m: Mode) => {
    const rand: Rand = m.id === 'quotidien' ? rng(hashSeed(`labyrinthe-${todayKey()}`)) : Math.random
    const g = {
      mode: m, rand, size: m.size, grid: [], fieldDirty: true,
      r: 0, c: 0, fr: 0, fc: 0, t: 0, moving: false, running: false, dir: 'right', nextDir: null, facing: 1,
      steps: 0, elapsed: 0, timeLeft: m.timeLimit, lives: m.kind === 'endless' ? 3 : 0, mazes: 0,
      carrotsTaken: 0, carrotsMaze: 0, carrotCountMaze: 0, hintsLeft: m.hints, hintsUsed: 0, optimal: 0, food: FOOD_POOL[0],
      carrots: new Set(), mud: new Set(), thorns: new Set(), portals: new Map(), bonuses: new Map(), visited: new Set(),
      frozen: 0, invuln: 0, boots: 0, compass: 0, hintT: 0, foxFreeze: 0, hintPath: [], hintRecalc: 0, foxes: [],
      mood: 'happy', moodT: 0, shake: 0, time: 0, particles: [], floaters: [],
      won: false, lost: false, endT: 0, finished: false, fogOn: false,
    } as Game
    buildMaze(g)
    gRef.current = g
    setMode(m)
    setEnd(null)
    setHud(EMPTY_HUD)
    setScreen('play')
    audio.playStart()
  }, [buildMaze, audio])

  // ----- Entrées -----
  const input = useCallback((dir: Dir) => {
    const g = gRef.current
    if (!g || g.won || g.lost || g.finished || g.frozen > 0) return
    g.running = true
    if (g.moving) { g.nextDir = dir; return }
    if (!canMove(g.grid, g.r, g.c, dir)) { audio.playWallBump(); g.running = false; return }
    g.pendingSound = true
    g.startStepDir = dir
  }, [audio])

  const askHint = useCallback(() => {
    const g = gRef.current
    if (!g || g.hintsLeft <= 0 || g.won || g.lost || g.frozen > 0) return
    g.hintsLeft--
    g.hintsUsed++
    g.hintT = 2600
    audio.playHint()
  }, [audio])

  useEffect(() => {
    if (screen !== 'play') return
    const map: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const handler = (e: KeyboardEvent) => {
      const dir = map[e.key]
      if (dir) { e.preventDefault(); input(dir) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, input])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const start = touchRef.current
    if (!start) return
    const dx = e.touches[0].clientX - start.x
    const dy = e.touches[0].clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return
    input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [input])
  const onTouchEnd = useCallback(() => { touchRef.current = null }, [])

  // ----- Boucle de jeu et dessin -----
  useEffect(() => {
    if (screen !== 'play') return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return
    const reduce = prefersReducedMotion()

    let W = 0, dpr = 1
    let field: HTMLCanvasElement | null = null
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      if (rect.width < 10) return
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = rect.width
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(W * dpr)
      const g0 = gRef.current
      if (g0) g0.fieldDirty = true
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const burst = (g: Game, cx: number, cy: number, colors: string[], n: number) => {
      const count = reduce ? Math.ceil(n / 3) : n
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 30 + Math.random() * 120
        g.particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 25, life: 0, max: 420 + Math.random() * 420, color: colors[i % colors.length], size: 2 + Math.random() * 3, star: Math.random() < 0.3 })
      }
    }
    const say = (g: Game, r: number, c: number, text: string, color: string, size = 0.5) => {
      const cs = W / g.size
      g.floaters.push({ x: (c + 0.5) * cs, y: (r + 0.2) * cs, text, life: 0, max: 1000, color, size: cs * size })
    }
    const mood = (g: Game, m: ChipieMood, ms: number) => { g.mood = m; g.moodT = ms }

    const finish = (g: Game) => {
      g.finished = true
      const m = g.mode
      let stars = 0
      let score = 0
      if (m.kind === 'single') {
        if (g.won) {
          stars = 3
          if (g.steps > g.optimal * 1.5) stars = 2
          if (g.steps > g.optimal * 2.5) stars = 1
          stars = Math.max(1, stars - g.hintsUsed)
        }
        score = g.carrotsTaken
      } else {
        score = g.mazes * 100 + g.carrotsTaken * 5
      }
      const recordId = m.id === 'quotidien' ? `quotidien-${todayKey()}` : m.id
      const record = (m.kind === 'single' && !g.won) ? false : saveBestScore(recordId, stars, score)
      setBestScores(loadBestScores())
      setEnd({ won: g.won, mode: m, steps: g.steps, elapsed: Math.floor(g.elapsed), optimal: g.optimal, carrots: g.carrotsTaken, carrotTotal: g.carrotCountMaze, stars, record, mazes: g.mazes, food: g.food })
      setScreen('end')
    }

    const lose = (g: Game) => {
      if (g.lost || g.won) return
      g.lost = true
      g.endT = 800
      g.running = false
      mood(g, 'sad', 5000)
      audio.playLose()
    }

    const startStep = (g: Game, dir: Dir) => {
      const [dr, dc] = DIRS[dir]
      g.fr = g.r; g.fc = g.c
      g.dir = dir
      if (dir === 'left') g.facing = -1; else if (dir === 'right') g.facing = 1
      g.r += dr; g.c += dc
      g.t = 0
      g.moving = true
      g.steps++
    }

    const caught = (g: Game) => {
      const cs = W / g.size
      audio.playThorn()
      say(g, g.r, g.c, 'Attrapée !', '#ffb3a0', 0.4)
      burst(g, (g.c + 0.5) * cs, (g.r + 0.5) * cs, ['#ff8a65', '#fff', '#ffd54a'], 16)
      g.r = 0; g.c = 0; g.fr = 0; g.fc = 0; g.moving = false; g.running = false; g.nextDir = null; g.t = 0
      g.invuln = 2400
      g.foxFreeze = 1600
      g.shake = reduce ? 0 : 12
      mood(g, 'sad', 1200)
      if (g.mode.kind === 'endless') { g.lives--; if (g.lives <= 0) lose(g) }
      else if (g.mode.timeLimit > 0) g.timeLeft = Math.max(0, g.timeLeft - 5)
      else g.steps += 5
    }

    const arrive = (g: Game) => {
      const cs = W / g.size
      const k = key(g.r, g.c)
      const cx = (g.c + 0.5) * cs, cy = (g.r + 0.5) * cs
      g.visited.add(k)
      let stop = false

      if (g.carrots.delete(k)) {
        g.carrotsTaken++; g.carrotsMaze++
        if (g.mode.kind === 'attack') g.timeLeft += 2
        say(g, g.r, g.c, g.mode.kind === 'attack' ? '+2 s' : '+1 🥕', '#ffe08a')
        burst(g, cx, cy, ['#ffb74d', '#ffe082', '#fff'], 12)
        mood(g, 'love', 600)
        audio.playCarrot()
      }
      const bonus = g.bonuses.get(k)
      if (bonus) {
        g.bonuses.delete(k)
        audio.playHint()
        burst(g, cx, cy, ['#fff', '#a0e7ff', '#ffe08a'], 14)
        if (bonus === 'hourglass') {
          g.foxFreeze = 5000
          if (g.mode.timeLimit > 0) { g.timeLeft += 8; say(g, g.r, g.c, '⏳ +8 s', '#ffd27a', 0.42) } else say(g, g.r, g.c, '⏳ Renard gelé', '#ffd27a', 0.38)
        } else if (bonus === 'boots') { g.boots = 6500; say(g, g.r, g.c, '👢 Vitesse !', '#b0e4ff', 0.42) }
        else { g.compass = 4500; say(g, g.r, g.c, '🧭 Boussole', '#e0c8ff', 0.42) }
        mood(g, 'love', 600)
      }
      if (g.mud.delete(k)) {
        audio.playMud(); stop = true
        burst(g, cx, cy, ['#7a5230', '#9a6b3f', '#5c3d20'], 14)
        mood(g, 'surprised', 900)
        if (g.mode.timeLimit > 0) { g.timeLeft = Math.max(0, g.timeLeft - 3); say(g, g.r, g.c, 'Boue ! −3 s', '#e0b88a', 0.4) }
        else { g.steps += 2; say(g, g.r, g.c, 'Boue ! +2 pas', '#e0b88a', 0.4) }
      }
      if (g.thorns.delete(k)) {
        audio.playThorn(); stop = true
        g.frozen = 1000
        g.shake = reduce ? 0 : 9
        burst(g, cx, cy, ['#c62828', '#2f7d32', '#fff'], 14)
        mood(g, 'sad', 1100)
        say(g, g.r, g.c, 'Aïe ! Ronces', '#ff9a9a', 0.4)
        if (g.mode.kind === 'endless') { g.lives--; if (g.lives <= 0) lose(g) }
      }
      const dest = g.portals.get(k)
      if (dest) {
        audio.playPortal(); stop = true
        burst(g, cx, cy, ['#b266ff', '#e6ccff', '#33c3ff'], 16)
        const [pr, pc] = dest.split('-').map(Number)
        g.r = pr; g.c = pc; g.fr = pr; g.fc = pc
        g.visited.add(dest)
        burst(g, (pc + 0.5) * cs, (pr + 0.5) * cs, ['#b266ff', '#e6ccff', '#33c3ff'], 16)
      }
      if (g.r === g.size - 1 && g.c === g.size - 1 && !g.won) {
        g.won = true; g.running = false; stop = true
        audio.playWin()
        mood(g, 'love', 5000)
        burst(g, (g.c + 0.5) * cs, (g.r + 0.5) * cs, ['#ffd54a', '#fff', '#9be564', '#ff8fb3'], 30)
        if (g.mode.kind === 'single') { g.endT = 900; confetti() }
        else {
          g.mazes++
          if (g.mode.kind === 'attack') { g.timeLeft += 5; say(g, g.r, g.c, '+5 s', '#b6f5b0', 0.5) }
          else say(g, g.r, g.c, 'Bravo !', '#b6f5b0', 0.5)
          g.endT = 700
        }
      }

      // suite de la course : on suit le couloir tant qu'il n'y a qu'une issue
      if (g.won || g.frozen > 0 || g.lost) { g.running = false; g.nextDir = null; return }
      const open = openDirs(g.grid, g.r, g.c)
      let next: Dir | null = null
      if (g.nextDir && open.includes(g.nextDir)) next = g.nextDir
      else if (g.running && !stop) {
        const exits = open.filter(d => d !== OPPOSITE[g.dir])
        if (exits.length === 1) next = exits[0]
      }
      g.nextDir = null
      if (next) startStep(g, next)
      else g.running = false
    }

    const updateFoxes = (g: Game, dt: number) => {
      if (g.foxFreeze > 0) return
      for (const f of g.foxes) {
        f.t += dt / g.mode.foxMs
        if (f.t < 1) continue
        f.t = 0
        f.fr = f.r; f.fc = f.c
        const open = openDirs(g.grid, f.r, f.c)
        const choices = open.filter(d => d !== (f.last ? OPPOSITE[f.last] : null))
        const pool = choices.length > 0 ? choices : open
        // le renard préfère se rapprocher de Chipie quand elle est proche
        let pick = pool[Math.floor(Math.random() * pool.length)]
        if (Math.abs(f.r - g.r) + Math.abs(f.c - g.c) <= 4 && Math.random() < 0.6) {
          pick = pool.reduce((best, d) => {
            const dist = (dd: Dir) => Math.abs(f.r + DIRS[dd][0] - g.r) + Math.abs(f.c + DIRS[dd][1] - g.c)
            return dist(d) < dist(best) ? d : best
          }, pool[0])
        }
        f.last = pick
        f.r += DIRS[pick][0]; f.c += DIRS[pick][1]
      }
    }

    // ---- dessin ----
    const draw = (g: Game) => {
      if (!field || g.fieldDirty) { field = buildField(g, W, dpr); g.fieldDirty = false }
      const cs = W / g.size
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, W)
      ctx.save()
      if (g.shake > 0.3) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake)
      ctx.drawImage(field, 0, 0, W, W)

      const cx = (c: number) => (c + 0.5) * cs
      const cy = (r: number) => (r + 0.5) * cs

      // empreintes de pattes sur la piste parcourue
      ctx.fillStyle = 'rgba(110,75,40,0.2)'
      g.visited.forEach(k => {
        const [r, c] = k.split('-').map(Number)
        const x = cx(c), y = cy(r)
        ctx.beginPath(); ctx.ellipse(x, y + cs * 0.06, cs * 0.09, cs * 0.07, 0, 0, Math.PI * 2); ctx.fill()
        for (const [dx, dy] of [[-0.12, -0.05], [-0.04, -0.12], [0.04, -0.12], [0.12, -0.05]]) {
          ctx.beginPath(); ctx.arc(x + cs * dx, y + cs * dy, cs * 0.032, 0, Math.PI * 2); ctx.fill()
        }
      })

      // terrier de départ
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.beginPath(); ctx.ellipse(cx(0), cy(0) + cs * 0.12, cs * 0.3, cs * 0.18, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#3b2814'
      ctx.beginPath(); ctx.ellipse(cx(0), cy(0) + cs * 0.1, cs * 0.24, cs * 0.14, 0, 0, Math.PI * 2); ctx.fill()

      // gamelle d'arrivée avec l'aliment
      {
        const gx = cx(g.size - 1), gy = cy(g.size - 1)
        const pulse = 1 + Math.sin(g.time / 300) * 0.04
        const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, cs * 0.7)
        glow.addColorStop(0, 'rgba(255,240,150,0.7)'); glow.addColorStop(1, 'rgba(255,240,150,0)')
        ctx.fillStyle = glow
        ctx.beginPath(); ctx.arc(gx, gy, cs * 0.7 * pulse, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.beginPath(); ctx.ellipse(gx, gy + cs * 0.3, cs * 0.34, cs * 0.1, 0, 0, Math.PI * 2); ctx.fill()
        const fi = foodImage(g.food)
        if (fi.complete && fi.naturalWidth > 0) ctx.drawImage(fi, gx - cs * 0.3, gy - cs * 0.36, cs * 0.6, cs * 0.6)
        ctx.fillStyle = '#4aa3df'
        ctx.beginPath(); ctx.ellipse(gx, gy + cs * 0.12, cs * 0.34, cs * 0.17, 0, 0, Math.PI); ctx.fill()
        ctx.fillStyle = '#7cc4f2'
        ctx.beginPath(); ctx.ellipse(gx, gy + cs * 0.1, cs * 0.34, cs * 0.1, 0, 0, Math.PI * 2); ctx.fill()
      }

      // objets
      g.mud.forEach(k => { const [r, c] = k.split('-').map(Number); drawMud(ctx, cx(c), cy(r), cs, g.time) })
      g.thorns.forEach(k => { const [r, c] = k.split('-').map(Number); drawThorns(ctx, cx(c), cy(r), cs) })
      const pairIndex = new Map<string, number>()
      let pi = 0
      g.portals.forEach((dest, k) => { if (!pairIndex.has(k)) { pairIndex.set(k, pi); pairIndex.set(dest, pi); pi++ } })
      g.portals.forEach((_d, k) => { const [r, c] = k.split('-').map(Number); drawPortal(ctx, cx(c), cy(r), cs, g.time, pairIndex.get(k) ?? 0) })
      let seed = 0
      g.carrots.forEach(k => { const [r, c] = k.split('-').map(Number); drawCarrot(ctx, cx(c), cy(r), cs, g.time, seed++) })
      g.bonuses.forEach((kind, k) => { const [r, c] = k.split('-').map(Number); drawBonus(ctx, cx(c), cy(r), cs, g.time, kind) })

      // chemin en pointillés (indice ou boussole)
      if (g.hintT > 0 || g.compass > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.strokeStyle = 'rgba(120,60,200,0.8)'
        ctx.lineWidth = 1
        const phase = (g.time / 400) % 1
        for (let i = 0; i < g.hintPath.length - 1; i++) {
          const [r1, c1] = g.hintPath[i], [r2, c2] = g.hintPath[i + 1]
          for (const p of [phase * 0.5, phase * 0.5 + 0.5]) {
            const x = cx(c1) + (cx(c2) - cx(c1)) * p, y = cy(r1) + (cy(r2) - cy(r1)) * p
            ctx.beginPath(); ctx.arc(x, y, cs * 0.075, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
          }
        }
      }

      // renards
      for (const f of g.foxes) {
        const x = cx(f.fc + (f.c - f.fc) * f.t), y = cy(f.fr + (f.r - f.fr) * f.t)
        drawFox(ctx, x, y, cs, g.time, g.foxFreeze > 0)
      }

      // Chipie
      {
        const p = g.moving ? Math.min(1, g.t) : 1
        const px = cx(g.fc + (g.c - g.fc) * p)
        const py = cy(g.fr + (g.r - g.fr) * p)
        const hop = g.moving ? Math.sin(p * Math.PI) * cs * 0.14 : Math.sin(g.time / 380) * cs * 0.012
        const img = chipieImage(g.moodT > 0 ? g.mood : 'happy')
        const size = cs * 1.25
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.beginPath(); ctx.ellipse(px, py + cs * 0.36, cs * 0.3, cs * 0.09, 0, 0, Math.PI * 2); ctx.fill()
        if (img.complete && img.naturalWidth > 0) {
          ctx.save()
          if (g.invuln > 0 && Math.floor(g.time / 110) % 2 === 0) ctx.globalAlpha = 0.45
          const shiver = g.frozen > 0 ? Math.sin(g.time / 25) * cs * 0.025 : 0
          ctx.translate(px + shiver, py - hop - cs * 0.06)
          ctx.rotate(g.moving ? 0.1 * g.facing * Math.sin(p * Math.PI) : 0)
          const squash = g.moving ? 1 + Math.sin(p * Math.PI) * 0.06 : 1
          ctx.scale(g.facing * (1 / squash), squash)
          ctx.drawImage(img, -size / 2, -size / 2, size, size)
          ctx.restore()
          if (g.frozen > 0) {
            ctx.fillStyle = 'rgba(160,215,255,0.35)'
            ctx.beginPath(); ctx.arc(px, py - cs * 0.05, cs * 0.5, 0, Math.PI * 2); ctx.fill()
          }
        }
        if (g.boots > 0 && g.moving && !reduce) {
          ctx.fillStyle = 'rgba(255,255,255,0.4)'
          ctx.beginPath(); ctx.arc(px - g.facing * cs * 0.35, py + cs * 0.2, cs * 0.07, 0, Math.PI * 2); ctx.fill()
        }
      }

      // particules et textes
      for (const p of g.particles) {
        const k = 1 - p.life / p.max
        ctx.globalAlpha = Math.max(0, k)
        ctx.fillStyle = p.color
        if (p.star) {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life / 110)
          ctx.fillRect(-p.size, -p.size / 3, p.size * 2, p.size / 1.5); ctx.fillRect(-p.size / 3, -p.size, p.size / 1.5, p.size * 2)
          ctx.restore()
        } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k + 0.4, 0, Math.PI * 2); ctx.fill() }
      }
      ctx.globalAlpha = 1
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      for (const f of g.floaters) {
        const k = f.life / f.max
        ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
        ctx.font = `800 ${f.size}px Fredoka Variable, Nunito Variable, sans-serif`
        ctx.lineWidth = f.size * 0.2; ctx.strokeStyle = 'rgba(30,20,0,0.75)'
        ctx.strokeText(f.text, f.x, f.y - k * cs * 0.9)
        ctx.fillStyle = f.color
        ctx.fillText(f.text, f.x, f.y - k * cs * 0.9)
      }
      ctx.globalAlpha = 1

      // brouillard doux autour de Chipie
      if (g.fogOn) {
        const p = g.moving ? Math.min(1, g.t) : 1
        const px = cx(g.fc + (g.c - g.fc) * p), py = cy(g.fr + (g.r - g.fr) * p)
        const reveal = g.compass > 0 ? 1.6 : 1
        const fog = ctx.createRadialGradient(px, py, cs * 1.3 * reveal, px, py, cs * 3.6 * reveal)
        fog.addColorStop(0, 'rgba(12,30,18,0)'); fog.addColorStop(1, 'rgba(12,30,18,0.93)')
        ctx.fillStyle = fog
        ctx.fillRect(0, 0, W, W)
      }
      ctx.restore()
    }

    let raf = 0
    let last = performance.now()
    let lastSig = ''
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const g = gRef.current
      if (!g || W === 0) { last = now; return }
      let dt = Math.min(50, now - last)
      last = now
      if (document.hidden) dt = 0
      g.time += dt

      if (!g.finished) {
        if (g.endT > 0) {
          g.endT -= dt
          if (g.endT <= 0) {
            if (g.lost || (g.won && g.mode.kind === 'single')) finish(g)
            else if (g.won) { buildMaze(g); g.mood = 'happy'; g.moodT = 0 }
          }
        }
        const live = !g.won && !g.lost
        if (live) {
          g.elapsed += dt / 1000
          if (g.mode.timeLimit > 0) {
            g.timeLeft -= dt / 1000
            if (g.timeLeft <= 0) { g.timeLeft = 0; lose(g) }
            else if (g.timeLeft < 10.5 && Math.ceil(g.timeLeft) !== Math.ceil(g.timeLeft + dt / 1000)) audio.playTick()
          }
          // décompte des états temporaires
          g.frozen = Math.max(0, g.frozen - dt)
          g.invuln = Math.max(0, g.invuln - dt)
          g.boots = Math.max(0, g.boots - dt)
          g.compass = Math.max(0, g.compass - dt)
          g.hintT = Math.max(0, g.hintT - dt)
          g.foxFreeze = Math.max(0, g.foxFreeze - dt)
          if (g.hintT > 0 || g.compass > 0) {
            g.hintRecalc -= dt
            if (g.hintRecalc <= 0) { g.hintRecalc = 180; g.hintPath = findPath(g.grid, g.size, [g.r, g.c], [g.size - 1, g.size - 1]) }
          }
          // départ d'une course demandée par une entrée
          if (g.startStepDir && !g.moving && g.frozen <= 0) {
            const d = g.startStepDir
            g.startStepDir = undefined
            if (canMove(g.grid, g.r, g.c, d)) { startStep(g, d); if (g.pendingSound) { audio.playMove(); g.pendingSound = false } }
          }
          if (g.moving) {
            g.t += dt / (g.boots > 0 ? BOOTS_STEP_MS : STEP_MS)
            if (g.t >= 1) { g.t = 1; g.moving = false; arrive(g) }
          }
          updateFoxes(g, dt)
          // contact avec un renard
          if (g.invuln <= 0 && !g.won) {
            const p = g.moving ? Math.min(1, g.t) : 1
            const pr = g.fr + (g.r - g.fr) * p, pc = g.fc + (g.c - g.fc) * p
            for (const f of g.foxes) {
              const fr = f.fr + (f.r - f.fr) * f.t, fc = f.fc + (f.c - f.fc) * f.t
              if (Math.abs(fr - pr) < 0.62 && Math.abs(fc - pc) < 0.62) { caught(g); break }
            }
          }
        }
      }

      if (g.moodT > 0) g.moodT -= dt
      if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 0.03)
      for (const p of g.particles) { p.life += dt; p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.vy += 240 * dt / 1000 }
      g.particles = g.particles.filter(p => p.life < p.max)
      for (const f of g.floaters) f.life += dt
      g.floaters = g.floaters.filter(f => f.life < f.max)

      const sig = `${g.steps}|${Math.ceil(g.timeLeft)}|${Math.floor(g.elapsed)}|${g.carrotsTaken}|${g.lives}|${g.mazes}|${g.hintsLeft}|${g.frozen > 0}|${g.boots > 0}|${g.compass > 0}|${g.carrotCountMaze}`
      if (sig !== lastSig) {
        lastSig = sig
        setHud({
          steps: g.steps, time: g.mode.timeLimit > 0 ? Math.ceil(g.timeLeft) : Math.floor(g.elapsed), carrots: g.carrotsTaken,
          carrotTotal: g.carrotCountMaze, lives: g.lives, mazes: g.mazes, hints: g.hintsLeft,
          frozen: g.frozen > 0, boots: g.boots > 0, compass: g.compass > 0,
        })
      }
      draw(g)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [screen, audio, buildMaze])

  const cat = CATEGORIES.find(c => c.id === foodShown.categorie)
  const isSingle = mode.kind === 'single'

  // ===== Choix du mode =====
  if (screen === 'select') {
    const dailyDone = !!bestScores[`quotidien-${todayKey()}`]
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.back} onClick={() => navigate('/jeu')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            <span>Retour</span>
          </button>
          <button className={styles.muteBtn} onClick={toggleMute} aria-label={muted ? 'Activer le son' : 'Couper le son'}>{muted ? '🔇' : '🔊'}</button>
        </div>

        <div className={styles.levelScreen}>
          <div className={styles.heroChipie}><ChipieCharacter mood="happy" size={120} /></div>
          <h1 className={styles.levelTitle}>Labyrinthe</h1>
          <p className={styles.levelSubtitle}>Guidez Chipie vers son repas !</p>

          <div className={styles.levelCards}>
            {MODES.map(m => {
              const best = bestScores[m.id === 'quotidien' ? `quotidien-${todayKey()}` : m.id]
              return (
                <button key={m.id} className={styles.levelCard} onClick={() => startGame(m)}>
                  <span className={styles.cardEmoji}>{m.emoji}</span>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardLabel}>{m.label}{m.id === 'quotidien' && dailyDone ? ' ✅' : ''}</span>
                    <span className={styles.cardDesc}>{m.desc}</span>
                    {m.kind === 'single' && (m.mudCount > 0 || m.portalPairs > 0 || m.thornCount > 0 || m.foxes > 0) && (
                      <span className={styles.cardTraps}>
                        {m.mudCount > 0 && `💧${m.mudCount} `}{m.portalPairs > 0 && `🌀${m.portalPairs} `}{m.thornCount > 0 && `🌿${m.thornCount} `}{m.foxes > 0 && `🦊${m.foxes}`}
                      </span>
                    )}
                    {best && (
                      <span className={styles.cardBest}>
                        {m.kind === 'single' ? `${'⭐'.repeat(best.stars)} · ${best.carrots} 🥕` : `🏆 ${best.carrots} pts`}
                      </span>
                    )}
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              )
            })}
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>🥕 Bonus</span>
            <span className={styles.legendItem}>💧 Boue</span>
            <span className={styles.legendItem}>🌿 Ronces</span>
            <span className={styles.legendItem}>🌀 Portail</span>
            <span className={styles.legendItem}>🦊 Renard</span>
            <span className={styles.legendItem}>⏳👢🧭 Bonus</span>
          </div>
        </div>
      </div>
    )
  }

  // ===== Fin =====
  if (screen === 'end' && end) {
    const endMood: ChipieMood = end.won ? (end.stars >= 2 || !isSingle ? 'love' : 'happy') : 'sad'
    const endCat = CATEGORIES.find(c => c.id === end.food.categorie)
    return (
      <div className={styles.page}>
        <div className={styles.endScreen}>
          <ChipieCharacter mood={endMood} size={130} />
          <h2 className={styles.endTitle}>{isSingle ? (end.won ? 'Bravo !' : 'Temps écoulé !') : (end.mazes > 0 ? 'Bien joué !' : 'Dommage !')}</h2>
          <span className={styles.endBadge}>{end.mode.emoji} {end.mode.label}</span>

          {end.record && <div className={styles.newRecord}>Nouveau record !</div>}

          {isSingle && end.won && (
            <div className={styles.endStars}>
              {[1, 2, 3].map(i => <span key={i} className={`${styles.star} ${i <= end.stars ? styles.starFilled : ''}`}>⭐</span>)}
            </div>
          )}

          {!isSingle && (
            <div className={styles.bigResult}>{end.mazes}<small> labyrinthe{end.mazes > 1 ? 's' : ''} réussi{end.mazes > 1 ? 's' : ''}</small></div>
          )}

          <div className={styles.endStats}>
            <div className={styles.endStat}><span className={styles.endStatNum}>{end.steps}</span><span className={styles.endStatLabel}>pas</span></div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}><span className={styles.endStatNum}>{end.elapsed}s</span><span className={styles.endStatLabel}>temps</span></div>
            <div className={styles.endDivider} />
            {isSingle ? (
              <div className={styles.endStat}><span className={styles.endStatNum}>{end.optimal}</span><span className={styles.endStatLabel}>optimal</span></div>
            ) : (
              <div className={styles.endStat}><span className={styles.endStatNum}>{end.mazes}</span><span className={styles.endStatLabel}>🧩</span></div>
            )}
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{isSingle ? `${end.carrots}/${end.carrotTotal}` : end.carrots}</span>
              <span className={styles.endStatLabel}>🥕</span>
            </div>
          </div>

          {isSingle && end.won && (
            <div className={styles.endFood}>
              <VegetalImage vegetal={end.food} className={styles.endFoodImg} />
              <span>Chipie a trouvé : <strong>{end.food.nom}</strong> {endCat?.emoji}</span>
            </div>
          )}

          <div className={styles.endActions}>
            <button className={styles.restartBtn} onClick={() => startGame(end.mode)}>Rejouer ({end.mode.label})</button>
            <button className={styles.changeLvlBtn} onClick={() => setScreen('select')}>Changer de mode</button>
          </div>
          <button className={styles.backBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
        </div>
      </div>
    )
  }

  // ===== Jeu =====
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => setScreen('select')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          <span>Modes</span>
        </button>
        <span className={styles.modeTag}>{mode.emoji} {mode.label}</span>
        <button className={styles.muteBtn} onClick={toggleMute} aria-label={muted ? 'Activer le son' : 'Couper le son'}>{muted ? '🔇' : '🔊'}</button>
      </div>

      <p className={styles.subtitle}>Trouve {foodShown.nom} {cat?.emoji} pour Chipie !</p>

      <div className={styles.statsBar}>
        <div className={styles.stat}><span className={styles.statNum}>{hud.steps}</span><span className={styles.statLabel}>Pas</span></div>
        <div className={styles.statDivider} />
        <div className={`${styles.stat} ${mode.timeLimit > 0 && hud.time <= 10 ? styles.statDanger : ''}`}>
          <span className={styles.statNum}>{hud.time}s</span><span className={styles.statLabel}>Temps</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}><span className={styles.statNum}>{hud.carrots}</span><span className={styles.statLabel}>🥕</span></div>
        {mode.kind !== 'single' && (
          <>
            <div className={styles.statDivider} />
            <div className={styles.stat}><span className={styles.statNum}>{hud.mazes}</span><span className={styles.statLabel}>🧩</span></div>
          </>
        )}
        {mode.kind === 'endless' && (
          <>
            <div className={styles.statDivider} />
            <div className={styles.stat}><span className={styles.statNum}>{Math.max(0, hud.lives)}</span><span className={styles.statLabel}>❤️</span></div>
          </>
        )}
      </div>

      <div className={styles.buffs} aria-live="polite">
        {hud.boots && <span className={styles.buff}>👢 Vitesse</span>}
        {hud.compass && <span className={styles.buff}>🧭 Boussole</span>}
        {hud.frozen && <span className={styles.buff}>❄️ Gelée</span>}
      </div>

      <div className={styles.board}>
        <div className={styles.boardWrap} ref={wrapRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>
      </div>

      <button
        className={`${styles.hintBtn} ${hud.hints <= 0 ? styles.hintDisabled : ''}`}
        onClick={askHint}
        disabled={hud.hints <= 0 || hud.frozen}
      >
        <span>💡 Indice ({hud.hints})</span>
      </button>

      <div className={`${styles.controls} ${hud.frozen ? styles.controlsFrozen : ''}`}>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onPointerDown={() => input('up')} aria-label="Haut">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
          </button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onPointerDown={() => input('left')} aria-label="Gauche">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M19 12H5m0 0l7-7m-7 7l7 7" /></svg>
          </button>
          <div className={styles.dirCenter}><span>{hud.frozen ? '❄️' : '🐰'}</span></div>
          <button className={styles.dirBtn} onPointerDown={() => input('right')} aria-label="Droite">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M5 12h14m0 0l-7-7m7 7l-7 7" /></svg>
          </button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onPointerDown={() => input('down')} aria-label="Bas">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M12 5v14m0 0l7-7m-7 7l-7-7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

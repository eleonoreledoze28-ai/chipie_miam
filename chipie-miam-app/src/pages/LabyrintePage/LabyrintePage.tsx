import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import { useMazeAudio } from './useMazeAudio'
import styles from './LabyrintePage.module.css'

// ===== Types =====
interface Cell {
  top: boolean; right: boolean; bottom: boolean; left: boolean
  visited: boolean
}

interface Level {
  id: string; label: string; emoji: string; desc: string
  size: number; timeLimit: number; hints: number; carrotCount: number; fog: boolean
  mudCount: number; portalPairs: number; thornCount: number
}

const LEVELS: Level[] = [
  { id: 'facile', label: 'Facile', emoji: '🌱', desc: 'Grille 7×7, sans chrono', size: 7, timeLimit: 0, hints: 3, carrotCount: 3, fog: false, mudCount: 0, portalPairs: 0, thornCount: 0 },
  { id: 'normal', label: 'Normal', emoji: '🌿', desc: 'Grille 9×9, portails + boue', size: 9, timeLimit: 60, hints: 2, carrotCount: 4, fog: true, mudCount: 3, portalPairs: 1, thornCount: 2 },
  { id: 'difficile', label: 'Difficile', emoji: '🔥', desc: 'Grille 11×11, tous obstacles', size: 11, timeLimit: 45, hints: 1, carrotCount: 5, fog: true, mudCount: 4, portalPairs: 2, thornCount: 3 },
]

const BEST_SCORES_KEY = 'chipie-maze-best'

// ===== Maze generation (Recursive Backtracker) =====
function generateMaze(size: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      top: true, right: true, bottom: true, left: true, visited: false,
    }))
  )

  const stack: [number, number][] = []
  grid[0][0].visited = true
  stack.push([0, 0])

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1]
    const neighbors: [number, number, string, string][] = []

    if (r > 0 && !grid[r - 1][c].visited) neighbors.push([r - 1, c, 'top', 'bottom'])
    if (c < size - 1 && !grid[r][c + 1].visited) neighbors.push([r, c + 1, 'right', 'left'])
    if (r < size - 1 && !grid[r + 1][c].visited) neighbors.push([r + 1, c, 'bottom', 'top'])
    if (c > 0 && !grid[r][c - 1].visited) neighbors.push([r, c - 1, 'left', 'right'])

    if (neighbors.length === 0) {
      stack.pop()
    } else {
      const [nr, nc, wall, opposite] = neighbors[Math.floor(Math.random() * neighbors.length)];
      (grid[r][c] as Record<string, boolean>)[wall] = false;
      (grid[nr][nc] as Record<string, boolean>)[opposite] = false
      grid[nr][nc].visited = true
      stack.push([nr, nc])
    }
  }

  return grid
}

// ===== BFS to find optimal path (returns full path) =====
function findPathBFS(grid: Cell[][], size: number, from: [number, number], to: [number, number]): [number, number][] {
  const visited = Array.from({ length: size }, () => Array(size).fill(false))
  const parent = Array.from({ length: size }, () => Array<[number, number] | null>(size).fill(null))
  const queue: [number, number][] = [from]
  visited[from[0]][from[1]] = true

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    if (r === to[0] && c === to[1]) {
      const path: [number, number][] = []
      let cur: [number, number] | null = to
      while (cur) {
        path.unshift(cur)
        cur = parent[cur[0]][cur[1]]
      }
      return path
    }

    const moves: [number, number, keyof Cell][] = [
      [r - 1, c, 'top'], [r, c + 1, 'right'],
      [r + 1, c, 'bottom'], [r, c - 1, 'left'],
    ]

    for (const [nr, nc, wall] of moves) {
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc] && !grid[r][c][wall]) {
        visited[nr][nc] = true
        parent[nr][nc] = [r, c]
        queue.push([nr, nc])
      }
    }
  }
  return []
}

// ===== Place items randomly (avoiding forbidden + existing) =====
function placeItems(size: number, count: number, forbidden: Set<string>): Set<string> {
  const items = new Set<string>()
  let attempts = 0
  while (items.size < count && attempts < 300) {
    const r = Math.floor(Math.random() * size)
    const c = Math.floor(Math.random() * size)
    const key = `${r}-${c}`
    if (!forbidden.has(key) && !items.has(key)) {
      items.add(key)
    }
    attempts++
  }
  return items
}

// ===== Place portal pairs =====
function placePortals(size: number, pairs: number, forbidden: Set<string>): Map<string, string> {
  const portals = new Map<string, string>()
  let attempts = 0
  let placed = 0
  while (placed < pairs && attempts < 400) {
    const r1 = Math.floor(Math.random() * size)
    const c1 = Math.floor(Math.random() * size)
    const r2 = Math.floor(Math.random() * size)
    const c2 = Math.floor(Math.random() * size)
    const k1 = `${r1}-${c1}`
    const k2 = `${r2}-${c2}`
    if (k1 !== k2 && !forbidden.has(k1) && !forbidden.has(k2) && !portals.has(k1) && !portals.has(k2)) {
      portals.set(k1, k2)
      portals.set(k2, k1)
      forbidden.add(k1)
      forbidden.add(k2)
      placed++
    }
    attempts++
  }
  return portals
}

// ===== Random food =====
function getRandomFood() {
  const pool = VEGETAUX.filter(v => v.image && !v.image.includes('placeholder') && v.restriction !== 'a_eviter')
  return pool[Math.floor(Math.random() * pool.length)]
}

// ===== Best scores =====
function loadBestScores(): Record<string, { stars: number; carrots: number }> {
  try {
    return JSON.parse(localStorage.getItem(BEST_SCORES_KEY) || '{}')
  } catch { return {} }
}

function saveBestScore(levelId: string, stars: number, carrots: number) {
  const scores = loadBestScores()
  const prev = scores[levelId]
  const total = stars * 10 + carrots
  const prevTotal = prev ? prev.stars * 10 + prev.carrots : 0
  if (total > prevTotal) {
    scores[levelId] = { stars, carrots }
    localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(scores))
    return true
  }
  return false
}

type Screen = 'select' | 'play' | 'end'

// ===== Component =====
export default function LabyrintePage() {
  const navigate = useNavigate()
  const [screen, setScreen] = useState<Screen>('select')
  const [level, setLevel] = useState<Level>(LEVELS[0])
  const [grid, setGrid] = useState<Cell[][]>([])
  const [pos, setPos] = useState<[number, number]>([0, 0])
  const [steps, setSteps] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [food, setFood] = useState(getRandomFood)
  const [optimalPath, setOptimalPath] = useState(0)
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [moveAnim, setMoveAnim] = useState<string | null>(null)
  const [visitedCells, setVisitedCells] = useState<Set<string>>(new Set())
  const [carrots, setCarrots] = useState<Set<string>>(new Set())
  const [collectedCarrots, setCollectedCarrots] = useState(0)
  const [carrotAnim, setCarrotAnim] = useState<string | null>(null)
  const [hintsLeft, setHintsLeft] = useState(0)
  const [hintCell, setHintCell] = useState<[number, number] | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [bestScores] = useState(loadBestScores)
  // Traps
  const [mudCells, setMudCells] = useState<Set<string>>(new Set())
  const [thornCells, setThornCells] = useState<Set<string>>(new Set())
  const [portals, setPortals] = useState<Map<string, string>>(new Map())
  const [trapFeedback, setTrapFeedback] = useState<{ type: string; key: string } | null>(null)
  const [teleportAnim, setTeleportAnim] = useState(false)

  const touchRef = useRef<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Audio & vibration
  const audio = useMazeAudio()
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem(audio.MUTE_KEY) === '1' } catch { return false } })
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      try { localStorage.setItem(audio.MUTE_KEY, next ? '1' : '0') } catch { /* noop */ }
      return next
    })
  }, [audio.MUTE_KEY])

  const startGame = useCallback((lvl: Level) => {
    setLevel(lvl)
    const maze = generateMaze(lvl.size)
    setGrid(maze)
    setPos([0, 0])
    setSteps(0)
    setTimeLeft(lvl.timeLimit)
    setElapsed(0)
    setFood(getRandomFood())
    const path = findPathBFS(maze, lvl.size, [0, 0], [lvl.size - 1, lvl.size - 1])
    setOptimalPath(path.length - 1)
    setWon(false)
    setLost(false)
    setFrozen(false)
    setVisitedCells(new Set(['0-0']))

    // Place all items avoiding start/end
    const forbidden = new Set(['0-0', `${lvl.size - 1}-${lvl.size - 1}`])
    const newCarrots = placeItems(lvl.size, lvl.carrotCount, new Set(forbidden))
    newCarrots.forEach(k => forbidden.add(k))
    const newMud = placeItems(lvl.size, lvl.mudCount, new Set(forbidden))
    newMud.forEach(k => forbidden.add(k))
    const newThorns = placeItems(lvl.size, lvl.thornCount, new Set(forbidden))
    newThorns.forEach(k => forbidden.add(k))
    const newPortals = placePortals(lvl.size, lvl.portalPairs, new Set(forbidden))

    setCarrots(newCarrots)
    setMudCells(newMud)
    setThornCells(newThorns)
    setPortals(newPortals)
    setCollectedCarrots(0)
    setCarrotAnim(null)
    setHintsLeft(lvl.hints)
    setHintCell(null)
    setHintsUsed(0)
    setIsNewRecord(false)
    setTrapFeedback(null)
    setTeleportAnim(false)
    setScreen('play')
    audio.playStart()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Timer
  useEffect(() => {
    if (screen !== 'play' || won || lost) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1)
      if (level.timeLimit > 0) {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setLost(true)
            setScreen('end')
            audio.playLose()
            return 0
          }
          if (prev <= 11) audio.playTick()
          return prev - 1
        })
      }
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, won, lost, level.timeLimit])

  // Move player
  const move = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (won || lost || frozen || screen !== 'play') return
    setPos(prev => {
      const [r, c] = prev
      const cell = grid[r]?.[c]
      if (!cell) return prev

      let nr = r, nc = c
      if (dir === 'up' && !cell.top) nr--
      else if (dir === 'down' && !cell.bottom) nr++
      else if (dir === 'left' && !cell.left) nc--
      else if (dir === 'right' && !cell.right) nc++
      else { audio.playWallBump(); return prev }

      if (nr === r && nc === c) { audio.playWallBump(); return prev }

      audio.playMove()
      setSteps(s => s + 1)
      setMoveAnim(dir)
      setTimeout(() => setMoveAnim(null), 150)

      let finalR = nr, finalC = nc
      const key = `${nr}-${nc}`
      setVisitedCells(prev => new Set(prev).add(key))

      // Collect carrot
      if (carrots.has(key)) {
        setCarrots(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        setCollectedCarrots(n => n + 1)
        setCarrotAnim(key)
        setTimeout(() => setCarrotAnim(null), 400)
        audio.playCarrot()
      }

      // Mud trap: lose time or extra steps
      if (mudCells.has(key)) {
        audio.playMud()
        setTrapFeedback({ type: 'mud', key })
        setTimeout(() => setTrapFeedback(null), 800)
        if (level.timeLimit > 0) {
          setTimeLeft(t => Math.max(0, t - 3))
        } else {
          setSteps(s => s + 2)
        }
        // Remove mud after triggered (one-time)
        setMudCells(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }

      // Thorn trap: freeze player for 1s
      if (thornCells.has(key)) {
        audio.playThorn()
        setTrapFeedback({ type: 'thorn', key })
        setTimeout(() => setTrapFeedback(null), 1000)
        setFrozen(true)
        setTimeout(() => setFrozen(false), 1000)
        // Remove thorn after triggered
        setThornCells(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }

      // Portal: teleport
      const portalDest = portals.get(key)
      if (portalDest) {
        audio.playPortal()
        const [pr, pc] = portalDest.split('-').map(Number)
        finalR = pr
        finalC = pc
        setTeleportAnim(true)
        setTimeout(() => setTeleportAnim(false), 500)
        setVisitedCells(prev => new Set(prev).add(portalDest))
        setTrapFeedback({ type: 'portal', key })
        setTimeout(() => setTrapFeedback(null), 600)
      }

      // Check win
      if (finalR === level.size - 1 && finalC === level.size - 1) {
        setWon(true)
        audio.playWin()
        setTimeout(() => setScreen('end'), 600)
      }

      return [finalR, finalC]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, lost, frozen, screen, grid, level.size, level.timeLimit, carrots, mudCells, thornCells, portals])

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); move('up') }
      if (e.key === 'ArrowDown') { e.preventDefault(); move('down') }
      if (e.key === 'ArrowLeft') { e.preventDefault(); move('left') }
      if (e.key === 'ArrowRight') { e.preventDefault(); move('right') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [move])

  // Touch/swipe controls
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchRef.current.x
    const dy = t.clientY - touchRef.current.y
    const minSwipe = 20
    touchRef.current = null

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipe) move(dx > 0 ? 'right' : 'left')
    } else {
      if (Math.abs(dy) > minSwipe) move(dy > 0 ? 'down' : 'up')
    }
  }, [move])

  // Hint
  const useHint = useCallback(() => {
    if (hintsLeft <= 0 || won || lost || frozen || screen !== 'play') return
    const path = findPathBFS(grid, level.size, pos, [level.size - 1, level.size - 1])
    if (path.length > 1) {
      audio.playHint()
      setHintCell(path[1])
      setHintsLeft(h => h - 1)
      setHintsUsed(h => h + 1)
      setTimeout(() => setHintCell(null), 1500)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintsLeft, won, lost, frozen, screen, grid, level.size, pos])

  // Scoring
  const getStars = useCallback(() => {
    if (!won) return 0
    let stars = 3
    if (steps > optimalPath * 1.5) stars = 2
    if (steps > optimalPath * 2.5) stars = 1
    stars = Math.max(1, stars - hintsUsed)
    return stars
  }, [won, steps, optimalPath, hintsUsed])

  // Save best score on end
  useEffect(() => {
    if (screen === 'end' && won) {
      const stars = getStars()
      const record = saveBestScore(level.id, stars, collectedCarrots)
      setIsNewRecord(record)
    }
  }, [screen, won, level.id, collectedCarrots, getStars])

  const getMessage = () => {
    const stars = getStars()
    if (!won) return 'Oh non, le temps est \u00e9coul\u00e9 ! Chipie n\'a pas trouv\u00e9 son chemin...'
    if (stars === 3) return 'Incroyable ! Chipie a trouv\u00e9 le chemin le plus court !'
    if (stars === 2) return 'Bien jou\u00e9 ! Chipie est arriv\u00e9e sans trop se perdre !'
    return 'Chipie a fini par trouver ! Un peu de d\u00e9tours mais c\'est gagn\u00e9 !'
  }

  // Fog of war
  const getCellOpacity = useCallback((r: number, c: number) => {
    if (!level.fog) return 1
    const dist = Math.abs(r - pos[0]) + Math.abs(c - pos[1])
    if (dist <= 2) return 1
    if (dist <= 4) return 0.35
    return 0.08
  }, [level.fog, pos])

  const cat = CATEGORIES.find(c => c.id === food.categorie)
  const cellSize = Math.min(Math.floor(320 / level.size), 42)
  const bestForLevel = bestScores[level.id]

  // Portal color helper
  const getPortalColor = (key: string): number => {
    const entries = [...portals.entries()]
    for (let i = 0; i < entries.length; i++) {
      if (entries[i][0] === key) return Math.floor(i / 2)
    }
    return 0
  }
  const PORTAL_COLORS = ['🟣', '🔵']

  // ===== RENDER =====

  // Level select screen
  if (screen === 'select') {
    const allBest = loadBestScores()
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.back} onClick={() => navigate('/jeu')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
              <path d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <span>Retour</span>
          </button>
          <button className={styles.muteBtn} onClick={toggleMute} aria-label={muted ? 'Activer le son' : 'Couper le son'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className={styles.levelScreen}>
          <span className={styles.levelEmoji}>🌀</span>
          <h1 className={styles.levelTitle}>Labyrinthe</h1>
          <p className={styles.levelSubtitle}>Guidez Chipie vers son repas !</p>

          <div className={styles.levelCards}>
            {LEVELS.map(lvl => {
              const best = allBest[lvl.id]
              return (
                <button key={lvl.id} className={styles.levelCard} onClick={() => startGame(lvl)}>
                  <span className={styles.cardEmoji}>{lvl.emoji}</span>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardLabel}>{lvl.label}</span>
                    <span className={styles.cardDesc}>{lvl.desc}</span>
                    {(lvl.mudCount > 0 || lvl.portalPairs > 0 || lvl.thornCount > 0) && (
                      <span className={styles.cardTraps}>
                        {lvl.mudCount > 0 && `💧${lvl.mudCount} `}
                        {lvl.portalPairs > 0 && `🌀${lvl.portalPairs} `}
                        {lvl.thornCount > 0 && `🌿${lvl.thornCount}`}
                      </span>
                    )}
                    {best && (
                      <span className={styles.cardBest}>
                        {'⭐'.repeat(best.stars)} · {best.carrots} 🥕
                      </span>
                    )}
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            <span className={styles.legendItem}>🥕 Bonus</span>
            <span className={styles.legendItem}>💧 Boue (-3s)</span>
            <span className={styles.legendItem}>🌿 Ronces (gel)</span>
            <span className={styles.legendItem}>🌀 Portail</span>
          </div>
        </div>
      </div>
    )
  }

  // End screen
  if (screen === 'end') {
    const stars = getStars()
    return (
      <div className={styles.page}>
        <div className={styles.endScreen}>
          {won && <div className={styles.confetti} aria-hidden>{'🎊✨🌟🎉⭐🥕'.split('').map((e, i) => (
            <span key={i} className={styles.confettiItem} style={{ animationDelay: `${i * 0.12}s`, left: `${10 + i * 14}%` }}>{e}</span>
          ))}</div>}

          <span className={styles.endEmoji}>{won ? '🎉' : '😢'}</span>
          <h2 className={styles.endTitle}>{won ? 'Bravo !' : 'Temps \u00e9coul\u00e9 !'}</h2>
          <span className={styles.endBadge}>{level.emoji} {level.label}</span>

          {isNewRecord && (
            <div className={styles.newRecord}>Nouveau record !</div>
          )}

          {won && (
            <div className={styles.endStars}>
              {[1, 2, 3].map(i => (
                <span key={i} className={`${styles.star} ${i <= stars ? styles.starFilled : ''}`}>⭐</span>
              ))}
            </div>
          )}

          <div className={styles.endStats}>
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{steps}</span>
              <span className={styles.endStatLabel}>pas</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{elapsed}s</span>
              <span className={styles.endStatLabel}>temps</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{optimalPath}</span>
              <span className={styles.endStatLabel}>optimal</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{collectedCarrots}/{level.carrotCount}</span>
              <span className={styles.endStatLabel}>🥕</span>
            </div>
          </div>

          {won && (
            <div className={styles.endFood}>
              <img src={assetUrl(food.image)} alt="" className={styles.endFoodImg} />
              <span>Chipie a trouv\u00e9 : <strong>{food.nom}</strong> {cat?.emoji}</span>
            </div>
          )}

          <p className={styles.endMsg}>{getMessage()}</p>

          <div className={styles.endActions}>
            <button className={styles.restartBtn} onClick={() => startGame(level)}>
              Rejouer ({level.label})
            </button>
            <button className={styles.changeLvlBtn} onClick={() => setScreen('select')}>
              Changer de niveau
            </button>
          </div>

          <button className={styles.backBtn} onClick={() => navigate('/jeu')}>
            Retour aux jeux
          </button>
        </div>
      </div>
    )
  }

  // Play screen
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span>Retour</span>
        </button>
        <button className={styles.muteBtn} onClick={toggleMute} aria-label={muted ? 'Activer le son' : 'Couper le son'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      <h1 className={styles.title}>Labyrinthe <span className={styles.diffBadge}>{level.emoji} {level.label}</span></h1>
      <p className={styles.subtitle}>Trouvez {food.nom} {cat?.emoji} pour Chipie !</p>

      {/* Trap feedback toast */}
      {trapFeedback && (
        <div className={`${styles.trapToast} ${styles[`trap_${trapFeedback.type}`]}`}>
          {trapFeedback.type === 'mud' && (level.timeLimit > 0 ? '💧 Boue ! -3 secondes' : '💧 Boue ! +2 pas')}
          {trapFeedback.type === 'thorn' && '🌿 Ronces ! Gel\u00e9 1s'}
          {trapFeedback.type === 'portal' && '🌀 T\u00e9l\u00e9portation !'}
        </div>
      )}

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{steps}</span>
          <span className={styles.statLabel}>Pas</span>
        </div>
        <div className={styles.statDivider} />
        {level.timeLimit > 0 ? (
          <div className={`${styles.stat} ${timeLeft <= 10 ? styles.statDanger : ''}`}>
            <span className={styles.statNum}>{timeLeft}s</span>
            <span className={styles.statLabel}>Temps</span>
          </div>
        ) : (
          <div className={styles.stat}>
            <span className={styles.statNum}>{elapsed}s</span>
            <span className={styles.statLabel}>Temps</span>
          </div>
        )}
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{collectedCarrots}</span>
          <span className={styles.statLabel}>🥕</span>
        </div>
      </div>

      {/* Maze grid */}
      <div
        className={styles.mazeContainer}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className={styles.maze} style={{
          gridTemplateColumns: `repeat(${level.size}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${level.size}, ${cellSize}px)`,
        }}>
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r}-${c}`
              const isPlayer = r === pos[0] && c === pos[1]
              const isGoal = r === level.size - 1 && c === level.size - 1
              const isStart = r === 0 && c === 0
              const isVisited = visitedCells.has(key)
              const isCarrot = carrots.has(key)
              const isMud = mudCells.has(key)
              const isThorn = thornCells.has(key)
              const isPortal = portals.has(key)
              const isHint = hintCell && hintCell[0] === r && hintCell[1] === c
              const opacity = getCellOpacity(r, c)

              const cellClasses = [
                styles.cell,
                isVisited ? styles.cellVisited : '',
                isHint ? styles.cellHint : '',
                isGoal ? styles.cellGoal : '',
                isMud ? styles.cellMud : '',
                isThorn ? styles.cellThorn : '',
                isPortal ? styles.cellPortal : '',
              ].filter(Boolean).join(' ')

              return (
                <div
                  key={key}
                  className={cellClasses}
                  style={{
                    borderTop: cell.top ? `2px solid var(--maze-wall)` : '2px solid transparent',
                    borderRight: cell.right ? `2px solid var(--maze-wall)` : '2px solid transparent',
                    borderBottom: cell.bottom ? `2px solid var(--maze-wall)` : '2px solid transparent',
                    borderLeft: cell.left ? `2px solid var(--maze-wall)` : '2px solid transparent',
                    width: cellSize,
                    height: cellSize,
                    opacity,
                  }}
                >
                  {isPlayer && (
                    <span className={`${styles.player} ${moveAnim ? styles.playerMove : ''} ${frozen ? styles.playerFrozen : ''} ${teleportAnim ? styles.playerTeleport : ''}`}>🐰</span>
                  )}
                  {isGoal && !isPlayer && (
                    <img src={assetUrl(food.image)} alt="" className={styles.goalImg} />
                  )}
                  {isCarrot && !isPlayer && (
                    <span className={`${styles.carrot} ${carrotAnim === key ? styles.carrotCollect : ''}`}>🥕</span>
                  )}
                  {isMud && !isPlayer && (
                    <span className={styles.mudIcon}>💧</span>
                  )}
                  {isThorn && !isPlayer && (
                    <span className={styles.thornIcon}>🌿</span>
                  )}
                  {isPortal && !isPlayer && (
                    <span className={styles.portalIcon}>{PORTAL_COLORS[getPortalColor(key)] || '🟣'}</span>
                  )}
                  {isStart && !isPlayer && !isCarrot && !isMud && !isThorn && !isPortal && (
                    <span className={styles.startMark}>🏁</span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Hint button */}
      <button
        className={`${styles.hintBtn} ${hintsLeft <= 0 ? styles.hintDisabled : ''}`}
        onClick={useHint}
        disabled={hintsLeft <= 0 || frozen}
      >
        <span>💡 Indice ({hintsLeft})</span>
      </button>

      {/* Direction buttons */}
      <div className={`${styles.controls} ${frozen ? styles.controlsFrozen : ''}`}>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => move('up')} disabled={frozen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22">
              <path d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => move('left')} disabled={frozen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22">
              <path d="M19 12H5m0 0l7-7m-7 7l7 7" />
            </svg>
          </button>
          <div className={styles.dirCenter}>
            <span>{frozen ? '❄️' : '🐰'}</span>
          </div>
          <button className={styles.dirBtn} onClick={() => move('right')} disabled={frozen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22">
              <path d="M5 12h14m0 0l-7-7m7 7l-7 7" />
            </svg>
          </button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => move('down')} disabled={frozen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22">
              <path d="M12 5v14m0 0l7-7m-7 7l-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Best score reminder */}
      {bestForLevel && (
        <div className={styles.bestReminder}>
          Record : {'⭐'.repeat(bestForLevel.stars)} · {bestForLevel.carrots} 🥕
        </div>
      )}
    </div>
  )
}

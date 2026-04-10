import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, type Vegetal } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './SnakePage.module.css'

// ===== Audio =====
function useSnakeAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const MUTE_KEY = 'chipie-snake-muted'
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])
  const isMuted = useCallback(() => { try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false } }, [MUTE_KEY])
  const vibrate = useCallback((p: number | number[]) => { try { navigator?.vibrate?.(p) } catch { /* */ } }, [])
  const tone = useCallback((f: number, d: number, t: OscillatorType = 'sine', v = 0.08) => {
    if (isMuted()) return
    try { const c = getCtx(); const o = c.createOscillator(); const g = c.createGain(); o.type = t; o.frequency.setValueAtTime(f, c.currentTime); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(g).connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + d) } catch { /* */ }
  }, [getCtx, isMuted])
  const playEat = useCallback(() => { tone(880, 0.08); setTimeout(() => tone(1100, 0.1, 'sine', 0.06), 50); vibrate(20) }, [tone, vibrate])
  const playBadEat = useCallback(() => { tone(300, 0.12, 'sawtooth', 0.08); setTimeout(() => tone(220, 0.15, 'sawtooth', 0.06), 80); vibrate(60) }, [tone, vibrate])
  const playModerate = useCallback(() => { tone(660, 0.1, 'triangle', 0.08); vibrate(15) }, [tone, vibrate])
  const playGameOver = useCallback(() => { tone(400, 0.2, 'sawtooth', 0.08); setTimeout(() => tone(300, 0.25, 'sawtooth', 0.06), 150); setTimeout(() => tone(200, 0.3, 'sawtooth', 0.05), 350); vibrate([100, 50, 200]) }, [tone, vibrate])
  const playStart = useCallback(() => { tone(523, 0.08); setTimeout(() => tone(659, 0.08, 'sine', 0.06), 80); setTimeout(() => tone(784, 0.12, 'sine', 0.06), 160) }, [tone])
  return useMemo(() => ({ playEat, playBadEat, playModerate, playGameOver, playStart, isMuted, MUTE_KEY }),
    [playEat, playBadEat, playModerate, playGameOver, playStart, isMuted, MUTE_KEY])
}

// ===== Game constants =====
const GRID_W = 13
const GRID_H = 15
const BASE_SPEED = 220 // ms per tick
const MIN_SPEED = 90
const SPEED_STEP = 8 // reduce speed every food eaten
const BEST_KEY = 'chipie-snake-best'

type Cell = [number, number]
type Direction = 'up' | 'down' | 'left' | 'right'
type FoodKind = 'good' | 'moderate' | 'bad'
interface Food { x: number; y: number; vegetal: Vegetal; kind: FoodKind }
type Screen = 'menu' | 'play' | 'end'

// ===== Helpers =====
function getPool() {
  const all = VEGETAUX.filter(v => v.image && !v.image.includes('placeholder'))
  return {
    good: all.filter(v => v.restriction === 'aucune'),
    moderate: all.filter(v => v.restriction === 'petite_quantite'),
    bad: all.filter(v => v.restriction === 'a_eviter'),
  }
}

function randomEmptyCell(snake: Cell[], exclude?: Food): Cell {
  const occupied = new Set(snake.map(([x, y]) => `${x}-${y}`))
  if (exclude) occupied.add(`${exclude.x}-${exclude.y}`)
  let attempts = 0
  while (attempts < 200) {
    const x = Math.floor(Math.random() * GRID_W)
    const y = Math.floor(Math.random() * GRID_H)
    if (!occupied.has(`${x}-${y}`)) return [x, y]
    attempts++
  }
  return [0, 0]
}

function loadBest(): number {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 }
}

function saveBest(score: number): boolean {
  const prev = loadBest()
  if (score > prev) { localStorage.setItem(BEST_KEY, String(score)); return true }
  return false
}

// ===== Component =====
export default function SnakePage() {
  const navigate = useNavigate()
  const audio = useSnakeAudio()
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem(audio.MUTE_KEY) === '1' } catch { return false } })
  const pool = useMemo(getPool, [])

  const [screen, setScreen] = useState<Screen>('menu')
  const [snake, setSnake] = useState<Cell[]>([])
  const [direction, setDirection] = useState<Direction>('right')
  const [food, setFood] = useState<Food | null>(null)
  const [score, setScore] = useState(0)
  const [foodEaten, setFoodEaten] = useState(0)
  const [speed, setSpeed] = useState(BASE_SPEED)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [flashCell, setFlashCell] = useState<string | null>(null)

  const directionRef = useRef<Direction>('right')
  const nextDirRef = useRef<Direction>('right')
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchRef = useRef<{ x: number; y: number } | null>(null)

  const toggleMute = useCallback(() => {
    setMuted(prev => { const n = !prev; try { localStorage.setItem(audio.MUTE_KEY, n ? '1' : '0') } catch { /* */ } return n })
  }, [audio.MUTE_KEY])

  const pickFood = useCallback((currentSnake: Cell[]): Food => {
    const [x, y] = randomEmptyCell(currentSnake)
    // Weighted: 70% good, 20% moderate, 10% bad
    const r = Math.random()
    let kind: FoodKind = 'good'
    if (r < 0.10 && pool.bad.length > 0) kind = 'bad'
    else if (r < 0.30 && pool.moderate.length > 0) kind = 'moderate'
    const list = kind === 'good' ? pool.good : kind === 'moderate' ? pool.moderate : pool.bad
    const vegetal = list[Math.floor(Math.random() * list.length)]
    return { x, y, vegetal, kind }
  }, [pool])

  const startGame = useCallback(() => {
    const initialSnake: Cell[] = [[6, 7], [5, 7], [4, 7]]
    setSnake(initialSnake)
    setDirection('right')
    directionRef.current = 'right'
    nextDirRef.current = 'right'
    setFood(pickFood(initialSnake))
    setScore(0)
    setFoodEaten(0)
    setSpeed(BASE_SPEED)
    setIsNewRecord(false)
    setFlashCell(null)
    setScreen('play')
    audio.playStart()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickFood])

  const changeDirection = useCallback((dir: Direction) => {
    const current = directionRef.current
    // Prevent 180° reversal
    if (
      (dir === 'up' && current === 'down') ||
      (dir === 'down' && current === 'up') ||
      (dir === 'left' && current === 'right') ||
      (dir === 'right' && current === 'left')
    ) return
    nextDirRef.current = dir
  }, [])

  // Game tick
  useEffect(() => {
    if (screen !== 'play') {
      if (tickRef.current) clearInterval(tickRef.current)
      return
    }

    tickRef.current = setInterval(() => {
      setSnake(prevSnake => {
        directionRef.current = nextDirRef.current
        setDirection(nextDirRef.current)

        const [headX, headY] = prevSnake[0]
        let nx = headX, ny = headY
        if (nextDirRef.current === 'up') ny--
        else if (nextDirRef.current === 'down') ny++
        else if (nextDirRef.current === 'left') nx--
        else nx++

        // Wall collision
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) {
          audio.playGameOver()
          setScreen('end')
          return prevSnake
        }

        // Self collision
        if (prevSnake.some(([x, y]) => x === nx && y === ny)) {
          audio.playGameOver()
          setScreen('end')
          return prevSnake
        }

        const newHead: Cell = [nx, ny]
        let newSnake = [newHead, ...prevSnake]

        // Eat food?
        if (food && nx === food.x && ny === food.y) {
          if (food.kind === 'good') {
            audio.playEat()
            setScore(s => s + 10)
            setFoodEaten(n => n + 1)
            setSpeed(s => Math.max(MIN_SPEED, s - SPEED_STEP))
          } else if (food.kind === 'moderate') {
            audio.playModerate()
            setScore(s => s + 5)
            setFoodEaten(n => n + 1)
            // grow but no speed change
            newSnake = [newHead, ...prevSnake]
          } else {
            // BAD - game over
            audio.playBadEat()
            setFlashCell(`${nx}-${ny}`)
            setTimeout(() => setScreen('end'), 400)
            return newSnake
          }
          setFood(pickFood(newSnake))
        } else {
          // No food eaten = remove tail
          newSnake.pop()
        }

        return newSnake
      })
    }, speed)

    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, speed, food])

  // End game effect
  useEffect(() => {
    if (screen === 'end') {
      setIsNewRecord(saveBest(score))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  // Keyboard
  useEffect(() => {
    if (screen !== 'play') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); changeDirection('up') }
      if (e.key === 'ArrowDown') { e.preventDefault(); changeDirection('down') }
      if (e.key === 'ArrowLeft') { e.preventDefault(); changeDirection('left') }
      if (e.key === 'ArrowRight') { e.preventDefault(); changeDirection('right') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, changeDirection])

  // Touch swipe
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    touchRef.current = null
    const minSwipe = 20
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipe) changeDirection(dx > 0 ? 'right' : 'left')
    } else {
      if (Math.abs(dy) > minSwipe) changeDirection(dy > 0 ? 'down' : 'up')
    }
  }, [changeDirection])

  const best = loadBest()

  // Render grid as snake cell map
  const snakeCellMap = useMemo(() => {
    const map = new Map<string, number>() // index in snake (0 = head)
    snake.forEach(([x, y], i) => map.set(`${x}-${y}`, i))
    return map
  }, [snake])

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
          <span className={styles.menuEmoji}>🐍</span>
          <h1 className={styles.menuTitle}>Snake Chipie</h1>
          <p className={styles.menuSubtitle}>Guide Chipie dans le jardin !</p>

          <div className={styles.menuRules}>
            <div className={styles.ruleItem}><span>✅</span> Bons aliments : +10 pts, Chipie grandit</div>
            <div className={styles.ruleItem}><span>⚠️</span> Modérés : +5 pts, à donner avec modération</div>
            <div className={styles.ruleItem}><span>❌</span> Toxiques : Game Over !</div>
            <div className={styles.ruleItem}><span>🏃</span> La vitesse augmente à chaque bon repas</div>
            <div className={styles.ruleItem}><span>💥</span> Évite les murs et ton propre corps</div>
          </div>

          {best > 0 && <div className={styles.menuBest}>Record : {best} pts</div>}
          <button className={styles.playBtn} onClick={startGame}>Jouer</button>
        </div>
      </div>
    )
  }

  if (screen === 'end') {
    return (
      <div className={styles.page}>
        <div className={styles.endScreen}>
          <span className={styles.endEmoji}>{score >= 150 ? '👑' : score >= 80 ? '🏆' : score >= 30 ? '🎉' : '💥'}</span>
          <h2 className={styles.endTitle}>Game Over !</h2>

          {isNewRecord && <div className={styles.newRecord}>Nouveau record !</div>}

          <div className={styles.endStats}>
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{score}</span>
              <span className={styles.endStatLabel}>score</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{foodEaten}</span>
              <span className={styles.endStatLabel}>aliments</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{snake.length}</span>
              <span className={styles.endStatLabel}>longueur</span>
            </div>
          </div>

          {best > 0 && !isNewRecord && (
            <div className={styles.endRecord}>Record : {best} pts</div>
          )}

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
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          <span>Retour</span>
        </button>
        <span className={styles.scoreLabel}>{score} pts</span>
        <button className={styles.muteBtn} onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
      </div>

      {/* Info row */}
      <div className={styles.infoRow}>
        <span className={styles.infoItem}>🍽️ {foodEaten}</span>
        <span className={styles.infoItem}>📏 {snake.length}</span>
        <span className={styles.infoItem}>⚡ {Math.round((BASE_SPEED - speed) / SPEED_STEP)}</span>
      </div>

      {/* Game grid */}
      <div className={styles.gridWrap} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${GRID_W}, 1fr)`, gridTemplateRows: `repeat(${GRID_H}, 1fr)` }}>
          {Array.from({ length: GRID_W * GRID_H }, (_, i) => {
            const x = i % GRID_W
            const y = Math.floor(i / GRID_W)
            const key = `${x}-${y}`
            const snakeIdx = snakeCellMap.get(key)
            const isHead = snakeIdx === 0
            const isBody = snakeIdx !== undefined && snakeIdx > 0
            const isFood = food && food.x === x && food.y === y
            const isFlash = flashCell === key

            return (
              <div key={key} className={`${styles.cell} ${isBody ? styles.cellBody : ''} ${isHead ? styles.cellHead : ''} ${isFlash ? styles.cellFlash : ''}`}>
                {isHead && <span className={`${styles.head} ${styles[`head_${direction}`]}`}>🐰</span>}
                {isFood && food && (
                  <img src={assetUrl(food.vegetal.image)} alt=""
                    className={`${styles.foodImg} ${styles[`food_${food.kind}`]}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* D-pad controls */}
      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => changeDirection('up')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
          </button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => changeDirection('left')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M19 12H5m0 0l7-7m-7 7l7 7" /></svg>
          </button>
          <div className={styles.dirCenter}>🐰</div>
          <button className={styles.dirBtn} onClick={() => changeDirection('right')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M5 12h14m0 0l-7-7m7 7l-7 7" /></svg>
          </button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => changeDirection('down')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><path d="M12 5v14m0 0l7-7m-7 7l-7-7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import GameShell, { GameResult } from '../../components/GameShell/GameShell'
import { useBestScore } from '../../hooks/useBestScore'
import { useProfil } from '../../hooks/useProfil'
import styles from './TaupinierePage.module.css'

type Kind = 'awake' | 'sleep'
interface Occupant { id: number; kind: Kind }
type Fx = 'good' | 'bad' | null
type Phase = 'ready' | 'playing' | 'over'

const HOLES = 9
const DURATION = 30
const POINTS = 10
const SLEEP_PROBABILITY = 0.25
const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

const emptyHoles = (): (Occupant | null)[] => Array<Occupant | null>(HOLES).fill(null)
const emptyFx = (): Fx[] => Array<Fx>(HOLES).fill(null)

export default function TaupinierePage() {
  const { profil } = useProfil()
  const { best, submit } = useBestScore('chipie-taupiniere-best')
  const avatar = profil.avatar || DEFAULT_AVATAR

  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [holes, setHoles] = useState<(Occupant | null)[]>(emptyHoles)
  const [fx, setFx] = useState<Fx[]>(emptyFx)
  const [caresses, setCaresses] = useState(0)
  const [wakeUps, setWakeUps] = useState(0)
  const [isRecord, setIsRecord] = useState(false)

  const holesRef = useRef<(Occupant | null)[]>(emptyHoles())
  const idRef = useRef(0)
  const scoreRef = useRef(0)

  const writeHoles = useCallback((next: (Occupant | null)[]) => {
    holesRef.current = next
    setHoles(next)
  }, [])

  const start = useCallback(() => {
    scoreRef.current = 0
    idRef.current = 0
    writeHoles(emptyHoles())
    setFx(emptyFx())
    setScore(0)
    setCaresses(0)
    setWakeUps(0)
    setTimeLeft(DURATION)
    setIsRecord(false)
    setPhase('playing')
  }, [writeHoles])

  // Boucle de jeu : minuteur + apparitions
  useEffect(() => {
    if (phase !== 'playing') return
    const timers = new Set<number>()
    const startedAt = Date.now()
    let stopped = false

    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(() => { timers.delete(t); fn() }, ms)
      timers.add(t)
    }

    const spawn = () => {
      if (stopped) return
      const elapsed = (Date.now() - startedAt) / 1000
      const free = holesRef.current.flatMap((h, i) => (h === null ? [i] : []))
      if (free.length > 0) {
        const index = free[Math.floor(Math.random() * free.length)]
        const occupant: Occupant = {
          id: ++idRef.current,
          kind: Math.random() < SLEEP_PROBABILITY ? 'sleep' : 'awake',
        }
        const next = [...holesRef.current]
        next[index] = occupant
        writeHoles(next)

        const stay = Math.max(600, 1200 - elapsed * 20)
        later(() => {
          // ne retire que le même occupant (il a pu être caressé entre-temps)
          if (holesRef.current[index]?.id !== occupant.id) return
          const after = [...holesRef.current]
          after[index] = null
          writeHoles(after)
        }, stay)
      }
      later(spawn, Math.max(380, 850 - elapsed * 18))
    }

    spawn()
    const clock = window.setInterval(() => {
      const left = Math.max(0, DURATION - Math.floor((Date.now() - startedAt) / 1000))
      setTimeLeft(left)
      if (left === 0) {
        stopped = true
        setPhase('over')
      }
    }, 250)

    return () => {
      stopped = true
      window.clearInterval(clock)
      timers.forEach(t => window.clearTimeout(t))
    }
  }, [phase, writeHoles])

  // Fin de partie : record
  useEffect(() => {
    if (phase === 'over') setIsRecord(submit(scoreRef.current))
  }, [phase, submit])

  const flash = useCallback((index: number, kind: Exclude<Fx, null>) => {
    setFx(prev => prev.map((f, i) => (i === index ? kind : f)))
    window.setTimeout(() => setFx(prev => prev.map((f, i) => (i === index ? null : f))), 350)
  }, [])

  const tap = useCallback((index: number) => {
    if (phase !== 'playing') return
    const occupant = holesRef.current[index]
    if (!occupant) return

    const next = [...holesRef.current]
    next[index] = null
    writeHoles(next)

    if (occupant.kind === 'awake') {
      scoreRef.current += POINTS
      setCaresses(c => c + 1)
      flash(index, 'good')
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - POINTS)
      setWakeUps(w => w + 1)
      flash(index, 'bad')
    }
    setScore(scoreRef.current)
  }, [phase, writeHoles, flash])

  return (
    <GameShell
      title="Taupinière"
      emoji="🕳️"
      stats={<><span>⭐ {score}</span><span>⏱️ {timeLeft}s</span></>}
    >
      {phase === 'ready' && (
        <div className={styles.intro}>
          <p>{profil.nom} sort de son terrier ! <strong>Caresse-la</strong> quand elle est réveillée (+{POINTS}), mais <strong>ne la dérange pas</strong> quand elle dort 😴 (−{POINTS}).</p>
          <p className={styles.best}>Meilleur score : {best}</p>
          <button className={styles.startBtn} onClick={start}>Jouer</button>
        </div>
      )}

      {phase !== 'ready' && (
        <div className={styles.board} aria-label="Terrier">
          {holes.map((occupant, i) => (
            <button
              key={i}
              className={`${styles.hole} ${fx[i] === 'good' ? styles.fxGood : ''} ${fx[i] === 'bad' ? styles.fxBad : ''}`}
              onPointerDown={() => tap(i)}
              aria-label={occupant ? (occupant.kind === 'awake' ? 'Chipie réveillée' : 'Chipie endormie') : 'Trou vide'}
            >
              <span className={styles.dirt} />
              {occupant && (
                <span className={`${styles.rabbit} ${occupant.kind === 'sleep' ? styles.sleeping : ''}`} key={occupant.id}>
                  <img src={avatar} alt="" className={styles.face} draggable={false} />
                  <span className={styles.badge}>{occupant.kind === 'sleep' ? '😴' : '💕'}</span>
                </span>
              )}
              {fx[i] === 'good' && <span className={styles.pop}>+{POINTS}</span>}
              {fx[i] === 'bad' && <span className={`${styles.pop} ${styles.popBad}`}>−{POINTS}</span>}
            </button>
          ))}
        </div>
      )}

      {phase === 'over' && (
        <GameResult
          title="Temps écoulé !"
          isRecord={isRecord}
          lines={[
            `Score : ${score}`,
            `${caresses} caresse${caresses > 1 ? 's' : ''}, ${wakeUps} réveil${wakeUps > 1 ? 's' : ''} en sursaut`,
            `Meilleur score : ${Math.max(best, score)}`,
          ]}
          onReplay={start}
        />
      )}
    </GameShell>
  )
}

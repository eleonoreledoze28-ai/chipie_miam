import { useCallback, useEffect, useRef, useState } from 'react'
import GameShell, { GameResult } from '../../components/GameShell/GameShell'
import { useBestScore } from '../../hooks/useBestScore'
import { useProfil } from '../../hooks/useProfil'
import styles from './CacheCachePage.module.css'

type Phase = 'ready' | 'run' | 'guess' | 'result' | 'over'

const CUPS = 3
const LIVES = 3
const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

const sleep = (ms: number) => new Promise<void>(resolve => { window.setTimeout(resolve, ms) })

const swapCount = (round: number) => Math.min(14, 4 + Math.floor(round * 1.5))
const swapDuration = (round: number) => Math.max(200, 520 - round * 35)

const IDENTITY = Array.from({ length: CUPS }, (_, i) => i)

export default function CacheCachePage() {
  const { profil } = useProfil()
  const { best, submit } = useBestScore('chipie-cachecache-best')
  const avatar = profil.avatar || DEFAULT_AVATAR

  const [phase, setPhase] = useState<Phase>('ready')
  const [round, setRound] = useState(0)          // manches réussies
  const [lives, setLives] = useState(LIVES)
  const [slots, setSlots] = useState<number[]>(IDENTITY) // slots[buisson] = emplacement
  const [target, setTarget] = useState(1)        // buisson où se cache Chipie
  const [lifted, setLifted] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [isRecord, setIsRecord] = useState(false)

  const slotsRef = useRef<number[]>(IDENTITY)
  const roundRef = useRef(0)

  const writeSlots = useCallback((next: number[]) => { slotsRef.current = next; setSlots(next) }, [])

  const startRound = useCallback((currentRound: number) => {
    const hideAt = Math.floor(Math.random() * CUPS)
    roundRef.current = currentRound
    writeSlots(IDENTITY)
    setTarget(hideAt)
    setPicked(null)
    setLifted([hideAt]) // on montre où elle se cache
    setPhase('run')
  }, [writeSlots])

  const start = useCallback(() => {
    setRound(0)
    setLives(LIVES)
    setIsRecord(false)
    startRound(0)
  }, [startRound])

  // Déroulé d'une manche : montrer, mélanger, puis laisser deviner
  useEffect(() => {
    if (phase !== 'run') return
    let cancelled = false

    ;(async () => {
      await sleep(1200)
      if (cancelled) return
      setLifted([])
      await sleep(400)

      const duration = swapDuration(roundRef.current)
      for (let i = 0; i < swapCount(roundRef.current); i++) {
        if (cancelled) return
        const a = Math.floor(Math.random() * CUPS)
        let b = Math.floor(Math.random() * (CUPS - 1))
        if (b >= a) b++
        const next = [...slotsRef.current]
        ;[next[a], next[b]] = [next[b], next[a]]
        writeSlots(next)
        await sleep(duration + 60)
      }
      if (!cancelled) setPhase('guess')
    })()

    return () => { cancelled = true }
  }, [phase, writeSlots])

  const guess = (cup: number) => {
    if (phase !== 'guess') return
    setPicked(cup)
    setLifted(cup === target ? [target] : [cup, target])
    setPhase('result')

    if (cup === target) {
      setRound(r => r + 1)
    } else if (lives <= 1) {
      setLives(0)
      setIsRecord(submit(roundRef.current))
      setPhase('over')
    } else {
      setLives(l => l - 1)
    }
  }

  const found = picked === target

  return (
    <GameShell
      title="Cache-cache"
      emoji="🌿"
      stats={<><span>⭐ {round}</span><span>{'❤️'.repeat(lives)}{'🖤'.repeat(LIVES - lives)}</span></>}
    >
      {phase === 'ready' ? (
        <div className={styles.intro}>
          <p>{profil.nom} se cache sous un buisson, puis les buissons se <strong>mélangent</strong>. Suis-le des yeux et retrouve-la !</p>
          <p className={styles.best}>Meilleur score : {best}</p>
          <button className={styles.startBtn} onClick={start}>Jouer</button>
        </div>
      ) : (
        <>
          <p className={styles.status}>
            {phase === 'run' && (lifted.length > 0 ? `Regarde bien où se cache ${profil.nom}…` : 'Suis le bon buisson !')}
            {phase === 'guess' && 'Où est-elle ? Touche un buisson.'}
            {phase === 'result' && (found ? 'Trouvée ! 🎉' : 'Pas ici… 😿')}
            {phase === 'over' && 'Perdu !'}
          </p>

          <div className={styles.stage}>
            {Array.from({ length: CUPS }, (_, cup) => {
              const isLifted = lifted.includes(cup)
              return (
                <button
                  key={cup}
                  className={styles.cup}
                  style={{ left: `${slots[cup] * (100 / CUPS)}%`, transitionDuration: `${swapDuration(round)}ms` }}
                  onClick={() => guess(cup)}
                  disabled={phase !== 'guess'}
                  aria-label={`Buisson ${slots[cup] + 1}`}
                >
                  {cup === target && (
                    <img src={avatar} alt="" className={`${styles.face} ${isLifted ? styles.faceVisible : ''}`} draggable={false} />
                  )}
                  <span className={`${styles.bush} ${isLifted ? styles.bushLifted : ''}`}>🌿</span>
                </button>
              )
            })}
          </div>

          {phase === 'result' && (
            <button className={styles.nextBtn} onClick={() => startRound(round)}>
              {found ? 'Manche suivante' : 'Réessayer'}
            </button>
          )}

          {phase === 'over' && (
            <GameResult
              title="Plus de vies !"
              isRecord={isRecord}
              lines={[`${round} manche${round > 1 ? 's' : ''} réussie${round > 1 ? 's' : ''}`, `Meilleur score : ${Math.max(best, round)}`]}
              onReplay={start}
            />
          )}
        </>
      )}
    </GameShell>
  )
}

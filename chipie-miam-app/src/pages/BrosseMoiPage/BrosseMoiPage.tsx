import { useCallback, useRef, useState } from 'react'
import GameShell, { GameResult } from '../../components/GameShell/GameShell'
import { useBestScore } from '../../hooks/useBestScore'
import { useProfil } from '../../hooks/useProfil'
import styles from './BrosseMoiPage.module.css'

interface Tuft { id: number; x: number; y: number; size: number; rot: number } // x, y en % de la zone

const TUFT_COUNT = 14
const REACH = 30 // rayon de la brosse, en pixels
const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

const MESSAGES = [
  'Chipie adore ça 😌',
  'Ses poils volent partout ! ☁️',
  'Encore un peu… 🪮',
  'Elle ronronne (presque) 💕',
]

function makeTufts(): Tuft[] {
  return Array.from({ length: TUFT_COUNT }, (_, id) => ({
    id,
    x: 12 + Math.random() * 76,
    y: 12 + Math.random() * 76,
    size: 30 + Math.random() * 18,
    rot: Math.random() * 360,
  }))
}

export default function BrosseMoiPage() {
  const { profil } = useProfil()
  const { best, submit } = useBestScore('chipie-brosse-best')
  const avatar = profil.avatar || DEFAULT_AVATAR

  const [tufts, setTufts] = useState<Tuft[]>(makeTufts)
  const [brushed, setBrushed] = useState<Set<number>>(new Set())
  const [brush, setBrush] = useState<{ x: number; y: number } | null>(null)
  const [seconds, setSeconds] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [isRecord, setIsRecord] = useState(false)

  const zoneRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<number | null>(null)
  const brushedRef = useRef<Set<number>>(new Set())

  const done = seconds !== null
  const progress = brushed.size / TUFT_COUNT
  const message = MESSAGES[Math.min(MESSAGES.length - 1, Math.floor(progress * MESSAGES.length))]

  const restart = useCallback(() => {
    setTufts(makeTufts())
    brushedRef.current = new Set()
    setBrushed(new Set())
    setBrush(null)
    setSeconds(null)
    setIsRecord(false)
    startRef.current = null
  }, [])

  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const zone = zoneRef.current
    if (!zone || done) return
    const rect = zone.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    setBrush({ x: px, y: py })

    if (startRef.current === null) startRef.current = Date.now()

    let changed = false
    const next = new Set(brushedRef.current)
    tufts.forEach(t => {
      if (next.has(t.id)) return
      const dx = (t.x / 100) * rect.width - px
      const dy = (t.y / 100) * rect.height - py
      if (Math.hypot(dx, dy) <= REACH) { next.add(t.id); changed = true }
    })
    if (!changed) return

    brushedRef.current = next
    setBrushed(next)

    if (next.size === TUFT_COUNT) {
      const elapsed = Math.max(1, Math.round((Date.now() - (startRef.current ?? Date.now())) / 1000))
      const finalScore = Math.max(10, 100 - elapsed * 2)
      setSeconds(elapsed)
      setScore(finalScore)
      setIsRecord(submit(finalScore))
    }
  }, [tufts, done, submit])

  return (
    <GameShell
      title="Brosse-moi"
      emoji="🪮"
      stats={<span>☁️ {brushed.size}/{TUFT_COUNT}</span>}
    >
      <p className={styles.help}>Passe la brosse sur {profil.nom} pour enlever tous ses poils morts. Glisse le doigt dessus !</p>

      <div
        ref={zoneRef}
        className={styles.zone}
        onPointerMove={handleMove}
        onPointerLeave={() => setBrush(null)}
      >
        <img src={avatar} alt={profil.nom} className={`${styles.rabbit} ${done ? styles.happy : ''}`} draggable={false} />

        {tufts.map(t => (
          <span
            key={t.id}
            className={`${styles.tuft} ${brushed.has(t.id) ? styles.gone : ''}`}
            style={{
              left: `${t.x}%`,
              top: `${t.y}%`,
              width: t.size,
              height: t.size * 0.7,
              '--rot': `${t.rot}deg`,
              '--fly': `${(t.id % 2 === 0 ? 1 : -1) * (40 + (t.id % 5) * 12)}px`,
            } as React.CSSProperties}
          />
        ))}

        {brush && !done && <span className={styles.brush} style={{ left: brush.x, top: brush.y }}>🪮</span>}
        {done && <span className={styles.hearts}>💕 ✨ 💕</span>}
      </div>

      {!done ? (
        <>
          <div className={styles.bar}><div className={styles.fill} style={{ width: `${progress * 100}%` }} /></div>
          <p className={styles.message}>{message}</p>
          <p className={styles.best}>Meilleur score : {best}</p>
        </>
      ) : (
        <GameResult
          title={`${profil.nom} est toute douce !`}
          isRecord={isRecord}
          lines={[`Brossée en ${seconds} s`, `Score : ${score}`, `Meilleur score : ${Math.max(best, score)}`]}
          onReplay={restart}
        />
      )}
    </GameShell>
  )
}

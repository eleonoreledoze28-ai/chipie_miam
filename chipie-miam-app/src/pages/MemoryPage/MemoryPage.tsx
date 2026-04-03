import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './MemoryPage.module.css'

type Card = { id: string; vegetalId: string; type: 'image' | 'name'; display: string; imageUrl?: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateCards(pairCount: number): Card[] {
  const pool = VEGETAUX.filter(v => v.image && !v.image.includes('placeholder'))
  const selected = shuffle(pool).slice(0, pairCount)

  const cards: Card[] = []
  selected.forEach((v, i) => {
    cards.push({ id: `img_${i}`, vegetalId: v.id, type: 'image', display: v.nom, imageUrl: assetUrl(v.image) })
    cards.push({ id: `name_${i}`, vegetalId: v.id, type: 'name', display: v.nom })
  })
  return shuffle(cards)
}

const PAIR_COUNT = 6

export default function MemoryPage() {
  const navigate = useNavigate()
  const [cards, setCards] = useState(() => generateCards(PAIR_COUNT))
  const [flipped, setFlipped] = useState<Set<string>>(new Set())
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const [startTime] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const lockRef = useRef(false)

  // Timer
  useEffect(() => {
    if (gameOver) return
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [startTime, gameOver])

  // Check game over
  useEffect(() => {
    if (matched.size === cards.length && cards.length > 0) {
      setGameOver(true)
    }
  }, [matched, cards.length])

  const handleCardClick = useCallback((cardId: string) => {
    if (lockRef.current || flipped.has(cardId) || matched.has(cardId)) return

    const newSelected = [...selected, cardId]
    setFlipped(prev => new Set([...prev, cardId]))
    setSelected(newSelected)

    if (newSelected.length === 2) {
      lockRef.current = true
      setMoves(m => m + 1)

      const [first, second] = newSelected
      const card1 = cards.find(c => c.id === first)!
      const card2 = cards.find(c => c.id === second)!

      if (card1.vegetalId === card2.vegetalId) {
        // Match!
        setTimeout(() => {
          setMatched(prev => new Set([...prev, first, second]))
          setSelected([])
          lockRef.current = false
        }, 400)
      } else {
        // No match — flip back
        setTimeout(() => {
          setFlipped(prev => {
            const next = new Set(prev)
            next.delete(first)
            next.delete(second)
            return next
          })
          setSelected([])
          lockRef.current = false
        }, 800)
      }
    }
  }, [selected, flipped, matched, cards])

  const handleRestart = () => {
    setCards(generateCards(PAIR_COUNT))
    setFlipped(new Set())
    setMatched(new Set())
    setSelected([])
    setMoves(0)
    setGameOver(false)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const pairsFound = matched.size / 2

  // End screen
  if (gameOver) {
    const stars = moves <= PAIR_COUNT * 2 ? 3 : moves <= PAIR_COUNT * 3 ? 2 : 1
    return (
      <div className={styles.page}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span>Retour</span>
        </button>
        <div className={styles.endScreen}>
          <span className={styles.endEmoji}>{'⭐'.repeat(stars)}</span>
          <h1 className={styles.endTitle}>Bravo !</h1>
          <div className={styles.endStats}>
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{moves}</span>
              <span className={styles.endStatLabel}>Coups</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{formatTime(elapsed)}</span>
              <span className={styles.endStatLabel}>Temps</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{stars}/3</span>
              <span className={styles.endStatLabel}>Étoiles</span>
            </div>
          </div>
          <p className={styles.endMessage}>
            🐰 {stars === 3 ? 'Mémoire exceptionnelle ! Chipie est impressionnée !'
              : stars === 2 ? 'Bien joué ! Chipie est fière de toi !'
              : 'Continue à t\'entraîner, Chipie croit en toi !'}
          </p>
          <button className={styles.restartBtn} onClick={handleRestart}>🔄 Rejouer</button>
          <button className={styles.backBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <h1 className={styles.title}>🧠 Memory</h1>
      <p className={styles.subtitle}>Trouvez les {PAIR_COUNT} paires</p>

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{pairsFound}/{PAIR_COUNT}</span>
          <span className={styles.statLabel}>Paires</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{moves}</span>
          <span className={styles.statLabel}>Coups</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{formatTime(elapsed)}</span>
          <span className={styles.statLabel}>Temps</span>
        </div>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {cards.map(card => {
          const isFlipped = flipped.has(card.id) || matched.has(card.id)
          const isMatched = matched.has(card.id)
          return (
            <button
              key={card.id}
              className={`${styles.card} ${isFlipped ? styles.cardFlipped : ''} ${isMatched ? styles.cardMatched : ''}`}
              onClick={() => handleCardClick(card.id)}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardBack}>🐰</div>
                <div className={styles.cardFront}>
                  {card.type === 'image' ? (
                    <img src={card.imageUrl} alt="" className={styles.cardImg} />
                  ) : (
                    <span className={styles.cardName}>{card.display}</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

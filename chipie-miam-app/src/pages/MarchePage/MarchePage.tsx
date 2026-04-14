import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './MarchePage.module.css'

interface Item {
  id: string
  emoji: string
  name: string
  price: number
  good: boolean
}

const MARKET: Item[] = [
  { id: 'carotte',   emoji: '🥕', name: 'Carotte',    price: 2, good: true  },
  { id: 'salade',    emoji: '🥬', name: 'Salade',     price: 3, good: true  },
  { id: 'persil',    emoji: '🌿', name: 'Persil',     price: 2, good: true  },
  { id: 'foin',      emoji: '🌾', name: 'Foin',       price: 4, good: true  },
  { id: 'concombre', emoji: '🥒', name: 'Concombre',  price: 2, good: true  },
  { id: 'epinard',   emoji: '🍃', name: 'Épinard',    price: 3, good: true  },
  { id: 'radis',     emoji: '🫚', name: 'Radis',      price: 1, good: true  },
  { id: 'celeri',    emoji: '🌱', name: 'Céleri',     price: 2, good: true  },
  { id: 'raisin',    emoji: '🍇', name: 'Raisin',     price: 2, good: false },
  { id: 'oignon',    emoji: '🧅', name: 'Oignon',     price: 1, good: false },
  { id: 'chocolat',  emoji: '🍫', name: 'Chocolat',   price: 3, good: false },
  { id: 'mais',      emoji: '🌽', name: 'Maïs',       price: 2, good: false },
]

interface Round {
  list: string[]   // ids of items Chipie wants
  budget: number
}

const ROUNDS: Round[] = [
  { list: ['carotte', 'salade', 'persil'],    budget: 8  },
  { list: ['foin', 'concombre', 'radis'],     budget: 8  },
  { list: ['epinard', 'carotte', 'celeri'],   budget: 8  },
  { list: ['salade', 'foin', 'persil'],       budget: 10 },
  { list: ['concombre', 'celeri', 'epinard'], budget: 9  },
]

function getBest(): number { return parseInt(localStorage.getItem('marche_best') ?? '0') }

type Phase = 'menu' | 'play' | 'end'

export default function MarchePage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('menu')
  const [roundIdx, setRoundIdx] = useState(0)
  const [cart, setCart] = useState<Record<string, number>>({})  // id → qty
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(getBest)
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean } | null>(null)

  const round = ROUNDS[roundIdx % ROUNDS.length]
  const spent = MARKET.reduce((s, it) => s + it.price * (cart[it.id] ?? 0), 0)
  const remaining = round.budget - spent

  const start = () => {
    setRoundIdx(0)
    setCart({})
    setScore(0)
    setPhase('play')
  }

  const addToCart = (item: Item) => {
    if (spent + item.price > round.budget) {
      setFeedback({ id: item.id, ok: false })
      setTimeout(() => setFeedback(null), 600)
      return
    }
    setCart(prev => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))
    setFeedback({ id: item.id, ok: true })
    setTimeout(() => setFeedback(null), 400)
  }

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const next = { ...prev }
      if ((next[id] ?? 0) > 1) next[id]--
      else delete next[id]
      return next
    })
  }

  const validate = () => {
    const wantedIds = new Set(round.list)
    const boughtIds = new Set(Object.keys(cart).filter(id => (cart[id] ?? 0) > 0))

    let pts = 0
    // +10 per correct item bought
    round.list.forEach(id => { if (boughtIds.has(id)) pts += 10 })
    // -5 per wrong item bought
    boughtIds.forEach(id => { if (!wantedIds.has(id)) pts -= 5 })
    // -5 per wrong (toxic) item
    boughtIds.forEach(id => {
      const item = MARKET.find(m => m.id === id)
      if (item && !item.good) pts -= 10
    })
    // +5 budget bonus if not overspent
    if (spent <= round.budget) pts += 5

    const newScore = score + Math.max(0, pts)
    setScore(newScore)

    if (roundIdx + 1 >= ROUNDS.length) {
      // game over
      if (newScore > best) {
        localStorage.setItem('marche_best', String(newScore))
        setBest(newScore)
      }
      setPhase('end')
    } else {
      setRoundIdx(r => r + 1)
      setCart({})
    }
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  if (phase === 'menu') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>
      <div className={styles.menuScreen}>
        <div className={styles.menuEmoji}>🛒</div>
        <h1 className={styles.menuTitle}>Marché de Chipie</h1>
        <p className={styles.menuSub}>Fais les courses pour Chipie !</p>
        {best > 0 && <div className={styles.menuBest}>🏆 Meilleur score : {best} pts</div>}
        <div className={styles.rules}>
          <div className={styles.rule}><span>📋</span>Chipie te donne sa liste de courses</div>
          <div className={styles.rule}><span>💰</span>Ne dépasse pas le budget</div>
          <div className={styles.rule}><span>☠️</span>Évite les aliments toxiques pour lapins</div>
          <div className={styles.rule}><span>✅</span>Valide quand tu es prêt(e)</div>
        </div>
        <button className={styles.playBtn} onClick={start}>Commencer !</button>
      </div>
    </div>
  )

  if (phase === 'end') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>
      <div className={styles.endScreen}>
        <div className={styles.endEmoji}>{score >= 120 ? '🏆' : score >= 70 ? '⭐' : '🥕'}</div>
        <h2 className={styles.endTitle}>{score >= 120 ? 'Parfait !' : score >= 70 ? 'Bien joué !' : 'Continue !'}</h2>
        {score >= best && <div className={styles.newRecord}>🎉 Nouveau record !</div>}
        <div className={styles.endStats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{score}</span>
            <span className={styles.statLabel}>points</span>
          </div>
        </div>
        <div className={styles.endActions}>
          <button className={styles.playBtn} onClick={start}>Rejouer</button>
          <button className={styles.menuBtn} onClick={() => setPhase('menu')}>Menu</button>
        </div>
      </div>
    </div>
  )

  // play
  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>

      {/* HUD */}
      <div className={styles.hud}>
        <span className={styles.hudScore}>⭐ {score} pts</span>
        <span className={styles.hudRound}>Manche {roundIdx + 1}/{ROUNDS.length}</span>
        <span className={remaining < 2 ? styles.hudBudgetLow : styles.hudBudget}>
          💰 {remaining}🪙 restant{remaining > 1 ? 's' : ''}
        </span>
      </div>

      {/* Shopping list */}
      <div className={styles.listCard}>
        <div className={styles.listTitle}>🐰 Liste de Chipie :</div>
        <div className={styles.listItems}>
          {round.list.map(id => {
            const item = MARKET.find(m => m.id === id)!
            const bought = (cart[id] ?? 0) > 0
            return (
              <span key={id} className={`${styles.listItem} ${bought ? styles.listItemDone : ''}`}>
                {item.emoji} {item.name} {bought ? '✓' : ''}
              </span>
            )
          })}
        </div>
      </div>

      {/* Market grid */}
      <div className={styles.marketGrid}>
        {MARKET.map(item => {
          const qty = cart[item.id] ?? 0
          const fb = feedback?.id === item.id
          return (
            <div
              key={item.id}
              className={`${styles.marketItem} ${fb ? (feedback!.ok ? styles.marketOk : styles.marketNo) : ''}`}
            >
              <button className={styles.marketBtn} onClick={() => addToCart(item)}>
                <span className={styles.marketEmoji}>{item.emoji}</span>
                <span className={styles.marketName}>{item.name}</span>
                <span className={styles.marketPrice}>{item.price}🪙</span>
              </button>
              {qty > 0 && (
                <div className={styles.qtyRow}>
                  <button className={styles.qtyBtn} onClick={() => removeFromCart(item.id)}>−</button>
                  <span className={styles.qty}>{qty}</span>
                  <button className={styles.qtyBtn} onClick={() => addToCart(item)}>+</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Validate */}
      <button
        className={styles.validateBtn}
        onClick={validate}
        disabled={cartCount === 0}
      >
        Valider ({cartCount} article{cartCount > 1 ? 's' : ''}) — {spent}🪙
      </button>
    </div>
  )
}

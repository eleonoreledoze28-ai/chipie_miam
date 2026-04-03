import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './TamagotchiPage.module.css'

// Pick random vegetables for feeding options
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getRandomFood(count: number) {
  const pool = VEGETAUX.filter(v => v.image && !v.image.includes('placeholder'))
  return shuffle(pool).slice(0, count)
}

// Chipie moods
function getMood(faim: number, soif: number, bonheur: number): { emoji: string; label: string; color: string } {
  const avg = (faim + soif + bonheur) / 3
  if (avg >= 80) return { emoji: '😍', label: 'Aux anges !', color: 'var(--accent-green)' }
  if (avg >= 60) return { emoji: '😊', label: 'Content(e)', color: 'var(--accent-green)' }
  if (avg >= 40) return { emoji: '😐', label: 'Ça va...', color: 'var(--accent-yellow)' }
  if (avg >= 20) return { emoji: '😢', label: 'Pas bien...', color: 'var(--accent-orange)' }
  return { emoji: '😭', label: 'Au secours !', color: 'var(--accent-red)' }
}

const STORAGE_KEY = 'chipie_tamagotchi'

interface TamaState {
  faim: number
  soif: number
  bonheur: number
  lastUpdate: number
  totalFed: number
  daysAlive: number
  startDate: string
}

function loadState(): TamaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { faim: 70, soif: 70, bonheur: 70, lastUpdate: Date.now(), totalFed: 0, daysAlive: 0, startDate: new Date().toISOString().split('T')[0] }
}

function saveState(state: TamaState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// Decay stats based on time passed
function applyDecay(state: TamaState): TamaState {
  const now = Date.now()
  const minutesPassed = (now - state.lastUpdate) / 60000
  const decay = Math.floor(minutesPassed * 0.5) // 0.5 per minute
  const startDate = new Date(state.startDate + 'T00:00:00')
  const daysAlive = Math.floor((now - startDate.getTime()) / 86400000)
  return {
    ...state,
    faim: Math.max(0, state.faim - decay),
    soif: Math.max(0, state.soif - decay * 1.2),
    bonheur: Math.max(0, state.bonheur - decay * 0.3),
    lastUpdate: now,
    daysAlive,
  }
}

export default function TamagotchiPage() {
  const navigate = useNavigate()
  const [state, setState] = useState(() => applyDecay(loadState()))
  const [foodOptions, setFoodOptions] = useState(() => getRandomFood(4))
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [showFeed, setShowFeed] = useState(false)

  const mood = getMood(state.faim, state.soif, state.bonheur)

  // Save on change
  useEffect(() => { saveState(state) }, [state])

  // Decay every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => applyDecay(prev))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const feed = useCallback((vegetal: typeof VEGETAUX[number]) => {
    const cat = CATEGORIES.find(c => c.id === vegetal.categorie)
    let faimBoost = 15
    let bonheurBoost = 10

    // Fruits give more bonheur but less faim
    if (vegetal.categorie === 'fruits') { faimBoost = 8; bonheurBoost = 20 }
    // Salades give more faim
    if (vegetal.categorie === 'salades') { faimBoost = 20; bonheurBoost = 8 }
    // If restriction, negative effect
    if (vegetal.restriction === 'a_eviter') { faimBoost = -10; bonheurBoost = -15 }

    setState(prev => ({
      ...prev,
      faim: Math.min(100, prev.faim + faimBoost),
      bonheur: Math.min(100, prev.bonheur + bonheurBoost),
      totalFed: prev.totalFed + 1,
    }))

    if (vegetal.restriction === 'a_eviter') {
      setLastAction(`😵 Chipie n'aime pas ${vegetal.nom} !`)
    } else {
      setLastAction(`😋 Chipie adore ${vegetal.nom} ! ${cat?.emoji || ''}`)
    }
    setShowFeed(false)
    setFoodOptions(getRandomFood(4))
    setTimeout(() => setLastAction(null), 2500)
  }, [])

  const giveWater = useCallback(() => {
    setState(prev => ({
      ...prev,
      soif: Math.min(100, prev.soif + 25),
      bonheur: Math.min(100, prev.bonheur + 5),
    }))
    setLastAction('💧 Chipie a bien bu !')
    setTimeout(() => setLastAction(null), 2000)
  }, [])

  const pet = useCallback(() => {
    setState(prev => ({
      ...prev,
      bonheur: Math.min(100, prev.bonheur + 15),
    }))
    setLastAction('🥰 Chipie ronronne de bonheur !')
    setTimeout(() => setLastAction(null), 2000)
  }, [])

  const giveHay = useCallback(() => {
    setState(prev => ({
      ...prev,
      faim: Math.min(100, prev.faim + 10),
      bonheur: Math.min(100, prev.bonheur + 5),
    }))
    setLastAction('🌾 Chipie grignote son foin !')
    setTimeout(() => setLastAction(null), 2000)
  }, [])

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <h1 className={styles.title}>🐰 Chipie Virtuelle</h1>
      <p className={styles.subtitle}>Jour {state.daysAlive + 1} — {state.totalFed} repas servis</p>

      {/* Chipie */}
      <div className={styles.chipieArea}>
        <div className={styles.chipieCircle}>
          <img src={`${import.meta.env.BASE_URL}chipie-avatar.jpeg`} alt="Chipie" className={styles.chipieImg} />
        </div>
        <div className={styles.moodBadge} style={{ color: mood.color }}>
          <span className={styles.moodEmoji}>{mood.emoji}</span>
          <span>{mood.label}</span>
        </div>
      </div>

      {/* Action feedback */}
      {lastAction && (
        <div className={styles.actionFeedback}>{lastAction}</div>
      )}

      {/* Stats bars */}
      <div className={styles.statsCard}>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>🥬 Faim</span>
          <div className={styles.barTrack}>
            <div className={`${styles.barFill} ${state.faim <= 20 ? styles.barDanger : state.faim <= 40 ? styles.barWarn : styles.barOk}`}
              style={{ width: `${state.faim}%` }} />
          </div>
          <span className={styles.barValue}>{Math.round(state.faim)}%</span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>💧 Soif</span>
          <div className={styles.barTrack}>
            <div className={`${styles.barFill} ${state.soif <= 20 ? styles.barDanger : state.soif <= 40 ? styles.barWarn : styles.barOk}`}
              style={{ width: `${state.soif}%` }} />
          </div>
          <span className={styles.barValue}>{Math.round(state.soif)}%</span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>😊 Bonheur</span>
          <div className={styles.barTrack}>
            <div className={`${styles.barFill} ${state.bonheur <= 20 ? styles.barDanger : state.bonheur <= 40 ? styles.barWarn : styles.barOk}`}
              style={{ width: `${state.bonheur}%` }} />
          </div>
          <span className={styles.barValue}>{Math.round(state.bonheur)}%</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => setShowFeed(!showFeed)}>
          <span className={styles.actionEmoji}>🥬</span>
          <span>Nourrir</span>
        </button>
        <button className={styles.actionBtn} onClick={giveWater}>
          <span className={styles.actionEmoji}>💧</span>
          <span>Eau</span>
        </button>
        <button className={styles.actionBtn} onClick={giveHay}>
          <span className={styles.actionEmoji}>🌾</span>
          <span>Foin</span>
        </button>
        <button className={styles.actionBtn} onClick={pet}>
          <span className={styles.actionEmoji}>🤗</span>
          <span>Caresser</span>
        </button>
      </div>

      {/* Food selection */}
      {showFeed && (
        <div className={styles.foodPanel}>
          <span className={styles.foodTitle}>Choisir un aliment :</span>
          <div className={styles.foodGrid}>
            {foodOptions.map(v => (
              <button key={v.id} className={styles.foodItem} onClick={() => feed(v)}>
                <img src={assetUrl(v.image)} alt="" className={styles.foodImg} />
                <span className={styles.foodName}>{v.nom}</span>
              </button>
            ))}
          </div>
          <button className={styles.foodRefresh} onClick={() => setFoodOptions(getRandomFood(4))}>
            🔄 Autres aliments
          </button>
        </div>
      )}
    </div>
  )
}

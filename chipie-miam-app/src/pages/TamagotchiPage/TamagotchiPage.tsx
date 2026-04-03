import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './TamagotchiPage.module.css'

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

// Random events
const EVENTS = [
  { text: '🌞 Il fait beau ! Chipie veut jouer dehors.', action: 'pet', boost: 'bonheur' },
  { text: '🌧️ Il pleut... Chipie a besoin de réconfort.', action: 'pet', boost: 'bonheur' },
  { text: '🥕 Chipie renifle l\'air... elle a faim !', action: 'feed', boost: 'faim' },
  { text: '💤 Chipie bâille... elle se repose un peu.', action: 'none', boost: 'bonheur' },
  { text: '🏃 Chipie fait des binkies ! Elle est heureuse !', action: 'none', boost: 'bonheur' },
  { text: '🔍 Chipie explore son enclos avec curiosité.', action: 'none', boost: 'bonheur' },
  { text: '☀️ Chipie se prélasse au soleil.', action: 'none', boost: 'bonheur' },
  { text: '🌿 Chipie grignote un brin d\'herbe.', action: 'none', boost: 'faim' },
]

// Chipie dialogue bubbles
function getDialogue(faim: number, soif: number, bonheur: number): string {
  if (faim <= 15) return 'J\'ai tellement faim... 🥺'
  if (soif <= 15) return 'De l\'eau s\'il te plaît ! 💧'
  if (bonheur <= 15) return 'Je me sens seul(e)... 😢'
  if (faim >= 90 && soif >= 90 && bonheur >= 90) return 'Je suis le plus heureux des lapins ! 🌟'
  if (bonheur >= 80) return 'Je t\'adore ! 💕'
  if (faim >= 80) return 'Mmmh, j\'ai bien mangé ! 😋'
  if (soif >= 80) return 'Aaah, rafraîchissant ! 💦'
  return ''
}

// XP and Level
function getLevel(totalFed: number): { level: number; xp: number; xpNeeded: number; title: string } {
  const thresholds = [0, 5, 15, 30, 50, 80, 120, 170, 230, 300]
  const titles = ['Débutant', 'Apprenti', 'Soigneur', 'Nourricier', 'Gardien', 'Protecteur', 'Expert', 'Maître', 'Champion', 'Légende']
  let level = 0
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalFed >= thresholds[i]) { level = i; break }
  }
  const xp = totalFed - thresholds[level]
  const xpNeeded = (thresholds[level + 1] || thresholds[level] + 100) - thresholds[level]
  return { level: level + 1, xp, xpNeeded, title: titles[level] }
}

function getMood(faim: number, soif: number, bonheur: number) {
  const avg = (faim + soif + bonheur) / 3
  if (avg >= 80) return { emoji: '😍', label: 'Aux anges !' }
  if (avg >= 60) return { emoji: '😊', label: 'Content(e)' }
  if (avg >= 40) return { emoji: '😐', label: 'Ça va...' }
  if (avg >= 20) return { emoji: '😢', label: 'Pas bien...' }
  return { emoji: '😭', label: 'Au secours !' }
}

// Chipie animation class
function getAnimation(faim: number, soif: number, bonheur: number, action: string | null): string {
  if (action) return styles.chipieBounce
  const avg = (faim + soif + bonheur) / 3
  if (avg >= 70) return styles.chipieHappy
  if (avg <= 25) return styles.chipieSad
  return ''
}

const STORAGE_KEY = 'chipie_tamagotchi'

interface TamaState {
  faim: number
  soif: number
  bonheur: number
  lastUpdate: number
  totalFed: number
  startDate: string
}

function loadState(): TamaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { faim: 70, soif: 70, bonheur: 70, lastUpdate: Date.now(), totalFed: 0, startDate: new Date().toISOString().split('T')[0] }
}

function saveState(state: TamaState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function applyDecay(state: TamaState): TamaState {
  const now = Date.now()
  const minutesPassed = (now - state.lastUpdate) / 60000
  const decay = Math.floor(minutesPassed * 0.4)
  return {
    ...state,
    faim: Math.max(0, state.faim - decay),
    soif: Math.max(0, state.soif - decay * 1.2),
    bonheur: Math.max(0, state.bonheur - decay * 0.25),
    lastUpdate: now,
  }
}

export default function TamagotchiPage() {
  const navigate = useNavigate()
  const [state, setState] = useState(() => applyDecay(loadState()))
  const [foodOptions, setFoodOptions] = useState(() => getRandomFood(6))
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [showFeed, setShowFeed] = useState(false)
  const [event, setEvent] = useState<string | null>(null)
  const [zzz, setZzz] = useState(false)

  const mood = getMood(state.faim, state.soif, state.bonheur)
  const dialogue = getDialogue(state.faim, state.soif, state.bonheur)
  const levelInfo = getLevel(state.totalFed)
  const animClass = getAnimation(state.faim, state.soif, state.bonheur, lastAction)
  const daysAlive = Math.floor((Date.now() - new Date(state.startDate + 'T00:00:00').getTime()) / 86400000)

  useEffect(() => { saveState(state) }, [state])

  // Decay every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setState(prev => applyDecay(prev)), 30000)
    return () => clearInterval(interval)
  }, [])

  // Random events every 45 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)]
        setEvent(ev.text)
        if (ev.boost === 'bonheur') setState(prev => ({ ...prev, bonheur: Math.min(100, prev.bonheur + 3) }))
        if (ev.boost === 'faim') setState(prev => ({ ...prev, faim: Math.max(0, prev.faim - 2) }))
        setTimeout(() => setEvent(null), 4000)
      }
    }, 45000)
    return () => clearInterval(interval)
  }, [])

  const feed = useCallback((vegetal: typeof VEGETAUX[number]) => {
    const cat = CATEGORIES.find(c => c.id === vegetal.categorie)
    let faimBoost = 15
    let bonheurBoost = 10
    if (vegetal.categorie === 'fruits') { faimBoost = 8; bonheurBoost = 20 }
    if (vegetal.categorie === 'salades') { faimBoost = 22; bonheurBoost = 8 }
    if (vegetal.categorie === 'aromatiques') { faimBoost = 12; bonheurBoost = 15 }
    if (vegetal.restriction === 'a_eviter') { faimBoost = -10; bonheurBoost = -15 }

    setState(prev => ({
      ...prev,
      faim: Math.min(100, prev.faim + faimBoost),
      bonheur: Math.min(100, prev.bonheur + bonheurBoost),
      totalFed: prev.totalFed + 1,
    }))

    setLastAction(vegetal.restriction === 'a_eviter'
      ? `😵 Beurk ! Chipie recrache ${vegetal.nom} !`
      : `😋 Miam ! Chipie adore ${vegetal.nom} ! ${cat?.emoji || ''}`)
    setShowFeed(false)
    setFoodOptions(getRandomFood(6))
    setTimeout(() => setLastAction(null), 2500)
  }, [])

  const giveWater = useCallback(() => {
    setState(prev => ({ ...prev, soif: Math.min(100, prev.soif + 25), bonheur: Math.min(100, prev.bonheur + 5) }))
    setLastAction('💧 Glou glou ! Chipie boit avec plaisir !')
    setTimeout(() => setLastAction(null), 2000)
  }, [])

  const pet = useCallback(() => {
    setState(prev => ({ ...prev, bonheur: Math.min(100, prev.bonheur + 15) }))
    setLastAction('🥰 Chipie ferme les yeux de bonheur...')
    setTimeout(() => setLastAction(null), 2000)
  }, [])

  const giveHay = useCallback(() => {
    setState(prev => ({ ...prev, faim: Math.min(100, prev.faim + 10), bonheur: Math.min(100, prev.bonheur + 5) }))
    setLastAction('🌾 Crunch crunch ! Chipie grignote son foin !')
    setTimeout(() => setLastAction(null), 2000)
  }, [])

  const sleep = useCallback(() => {
    setZzz(true)
    setState(prev => ({ ...prev, bonheur: Math.min(100, prev.bonheur + 10) }))
    setLastAction('💤 Chipie fait une sieste...')
    setTimeout(() => { setZzz(false); setLastAction(null) }, 3000)
  }, [])

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      {/* Header with level */}
      <div className={styles.header}>
        <h1 className={styles.title}>🐰 Chipie Virtuelle</h1>
        <div className={styles.levelBadge}>
          <span className={styles.levelNum}>Niv. {levelInfo.level}</span>
          <span className={styles.levelTitle}>{levelInfo.title}</span>
        </div>
      </div>
      <p className={styles.subtitle}>Jour {daysAlive + 1} — {state.totalFed} repas servis</p>

      {/* XP bar */}
      <div className={styles.xpBar}>
        <div className={styles.xpFill} style={{ width: `${(levelInfo.xp / levelInfo.xpNeeded) * 100}%` }} />
        <span className={styles.xpText}>{levelInfo.xp}/{levelInfo.xpNeeded} XP</span>
      </div>

      {/* Chipie scene */}
      <div className={styles.scene}>
        {/* Background elements */}
        <div className={styles.sceneBg}>
          <span className={styles.sceneSun}>☀️</span>
          <span className={styles.sceneCloud1}>☁️</span>
          <span className={styles.sceneCloud2}>☁️</span>
          <span className={styles.sceneGrass}>🌿🌱🌿🌱🌿🌱🌿</span>
        </div>

        {/* Chipie */}
        <div className={`${styles.chipieWrap} ${animClass} ${zzz ? styles.chipieSleep : ''}`}>
          <img src={`${import.meta.env.BASE_URL}chipie-avatar.jpeg`} alt="Chipie" className={styles.chipieImg} />
          {zzz && <span className={styles.zzzBubble}>💤</span>}
        </div>

        {/* Speech bubble */}
        {(dialogue || lastAction) && (
          <div className={styles.speechBubble}>
            {lastAction || dialogue}
          </div>
        )}

        {/* Mood */}
        <div className={styles.moodTag}>
          <span>{mood.emoji}</span>
          <span>{mood.label}</span>
        </div>
      </div>

      {/* Event banner */}
      {event && <div className={styles.eventBanner}>{event}</div>}

      {/* Stats */}
      <div className={styles.statsCard}>
        {[
          { label: '🥬 Faim', value: state.faim },
          { label: '💧 Soif', value: state.soif },
          { label: '😊 Bonheur', value: state.bonheur },
        ].map(s => (
          <div key={s.label} className={styles.barRow}>
            <span className={styles.barLabel}>{s.label}</span>
            <div className={styles.barTrack}>
              <div className={`${styles.barFill} ${s.value <= 20 ? styles.barDanger : s.value <= 40 ? styles.barWarn : styles.barOk}`}
                style={{ width: `${s.value}%` }} />
            </div>
            <span className={styles.barValue}>{Math.round(s.value)}%</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {[
          { emoji: '🥬', label: 'Nourrir', onClick: () => setShowFeed(!showFeed) },
          { emoji: '💧', label: 'Eau', onClick: giveWater },
          { emoji: '🌾', label: 'Foin', onClick: giveHay },
          { emoji: '🤗', label: 'Caresser', onClick: pet },
          { emoji: '💤', label: 'Dodo', onClick: sleep },
        ].map(a => (
          <button key={a.label} className={styles.actionBtn} onClick={a.onClick}>
            <span className={styles.actionEmoji}>{a.emoji}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Food panel */}
      {showFeed && (
        <div className={styles.foodPanel}>
          <span className={styles.foodTitle}>Que voulez-vous donner a Chipie ?</span>
          <div className={styles.foodGrid}>
            {foodOptions.map(v => (
              <button key={v.id} className={styles.foodItem} onClick={() => feed(v)}>
                <img src={assetUrl(v.image)} alt="" className={styles.foodImg} />
                <div className={styles.foodInfo}>
                  <span className={styles.foodName}>{v.nom}</span>
                  <span className={styles.foodCat}>
                    {CATEGORIES.find(c => c.id === v.categorie)?.emoji} {CATEGORIES.find(c => c.id === v.categorie)?.nom}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <button className={styles.foodRefresh} onClick={() => setFoodOptions(getRandomFood(6))}>
            🔄 Autres aliments
          </button>
        </div>
      )}
    </div>
  )
}

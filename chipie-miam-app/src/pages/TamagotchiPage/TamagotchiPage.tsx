import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import ChipieSvg, { type ChipieMood } from './ChipieSvg'
import {
  type Season, type Weather,
  SEASONS, WEATHER_INFO, ACHIEVEMENTS, SHOP_ITEMS, RANDOM_EVENTS,
  getLevel, getMood, getSeason, getWeather, getTimeOfDay, pickDailyQuests,
  type Quest, type AchievementCheckState,
} from './tamagotchiData'
import styles from './TamagotchiPage.module.css'

// ===== Utils =====
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

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v))
}

// ===== State =====
const STORAGE_KEY = 'chipie_tamagotchi_v2'

interface DailyCounters {
  feeds: number; waters: number; pets: number; brushes: number
  sleeps: number; fruits: number; hays: number; plays: number
  allHigh: number
}

interface QuestProgress {
  id: string; progress: number; claimed: boolean
}

interface TamaState {
  faim: number; soif: number; bonheur: number
  energie: number; sante: number; proprete: number
  lastUpdate: number; totalFed: number; startDate: string
  coins: number
  unlockedAchievements: string[]
  ownedItems: string[]
  equippedAccessory: string | null
  equippedDecorations: string[]
  equippedBackground: string | null
  uniqueFoodsGiven: string[]
  totalPets: number; totalBrushes: number; totalPlays: number
  questsCompletedTotal: number
  // Daily state
  dailyDate: string
  dailyCounters: DailyCounters
  dailyQuestProgress: QuestProgress[]
}

const DEFAULT_COUNTERS: DailyCounters = {
  feeds: 0, waters: 0, pets: 0, brushes: 0,
  sleeps: 0, fruits: 0, hays: 0, plays: 0, allHigh: 0,
}

function defaultState(): TamaState {
  const today = new Date().toISOString().split('T')[0]
  return {
    faim: 70, soif: 70, bonheur: 70, energie: 80, sante: 85, proprete: 75,
    lastUpdate: Date.now(), totalFed: 0, startDate: today,
    coins: 0,
    unlockedAchievements: [], ownedItems: [], equippedAccessory: null,
    equippedDecorations: [], equippedBackground: null, uniqueFoodsGiven: [],
    totalPets: 0, totalBrushes: 0, totalPlays: 0, questsCompletedTotal: 0,
    dailyDate: today, dailyCounters: { ...DEFAULT_COUNTERS },
    dailyQuestProgress: pickDailyQuests(today).map(q => ({ id: q.id, progress: 0, claimed: false })),
  }
}

function migrateOldState(): TamaState | null {
  try {
    const old = localStorage.getItem('chipie_tamagotchi')
    if (!old) return null
    const o = JSON.parse(old)
    const s = defaultState()
    s.faim = o.faim ?? 70; s.soif = o.soif ?? 70; s.bonheur = o.bonheur ?? 70
    s.totalFed = o.totalFed ?? 0; s.startDate = o.startDate ?? s.startDate
    s.lastUpdate = o.lastUpdate ?? Date.now()
    localStorage.removeItem('chipie_tamagotchi')
    return s
  } catch { return null }
}

function loadState(): TamaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as TamaState
      // Reset daily if new day
      const today = new Date().toISOString().split('T')[0]
      if (s.dailyDate !== today) {
        s.dailyDate = today
        s.dailyCounters = { ...DEFAULT_COUNTERS }
        s.dailyQuestProgress = pickDailyQuests(today).map(q => ({ id: q.id, progress: 0, claimed: false }))
      }
      return s
    }
  } catch { /* ignore */ }
  return migrateOldState() || defaultState()
}

function saveState(state: TamaState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function applyDecay(state: TamaState): TamaState {
  const now = Date.now()
  const mins = (now - state.lastUpdate) / 60000
  if (mins < 0.5) return { ...state, lastUpdate: now }
  const s = { ...state, lastUpdate: now }
  s.faim = clamp(s.faim - mins * 0.35)
  s.soif = clamp(s.soif - mins * 0.45)
  s.bonheur = clamp(s.bonheur - mins * 0.12)
  s.energie = clamp(s.energie - mins * 0.2)
  s.proprete = clamp(s.proprete - mins * 0.08)
  // Health depends on other stats
  const avg = (s.faim + s.soif + s.bonheur + s.energie + s.proprete) / 5
  if (avg < 30) s.sante = clamp(s.sante - mins * 0.3)
  else if (avg < 50) s.sante = clamp(s.sante - mins * 0.05)
  else s.sante = clamp(s.sante + mins * 0.05)
  return s
}

// ===== Dialogue =====
function getDialogue(s: TamaState): string {
  if (s.faim <= 12) return 'J\'ai tellement faim... 🥺'
  if (s.soif <= 12) return 'De l\'eau s\'il te plaît ! 💧'
  if (s.energie <= 12) return 'Je suis épuisé(e)... 😴'
  if (s.proprete <= 15) return 'Je me sens tout sale... 🙁'
  if (s.bonheur <= 12) return 'Je me sens seul(e)... 😢'
  if (s.sante <= 20) return 'Je ne me sens pas bien... 🤒'
  const avg = (s.faim + s.soif + s.bonheur + s.energie + s.sante + s.proprete) / 6
  if (avg >= 85) return 'Je suis le plus heureux des lapins ! 🌟'
  if (s.bonheur >= 80) return 'Je t\'adore ! 💕'
  if (s.faim >= 85) return 'Mmmh, j\'ai bien mangé ! 😋'
  return ''
}

function getChipieMood(s: TamaState, sleeping: boolean, eating: boolean): ChipieMood {
  if (sleeping) return 'sleeping'
  if (eating) return 'eating'
  const avg = (s.faim + s.soif + s.bonheur + s.energie + s.sante + s.proprete) / 6
  if (avg >= 85) return 'excited'
  if (avg >= 70) return 'happy'
  if (avg >= 50) return 'content'
  if (avg >= 30) return 'neutral'
  return 'sad'
}

// ===== Tabs =====
type TabId = 'soins' | 'quetes' | 'boutique' | 'succes'

// ===== Component =====
export default function TamagotchiPage() {
  const navigate = useNavigate()
  const [state, setState] = useState(() => applyDecay(loadState()))
  const [foodOptions, setFoodOptions] = useState(() => getRandomFood(6))
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [showFeed, setShowFeed] = useState(false)
  const [event, setEvent] = useState<string | null>(null)
  const [zzz, setZzz] = useState(false)
  const [eating, setEating] = useState(false)
  const [tab, setTab] = useState<TabId>('soins')
  const [particles, setParticles] = useState<{ id: number; emoji: string; x: number }[]>([])
  const [newAchievement, setNewAchievement] = useState<string | null>(null)

  // Derived
  const daysAlive = Math.floor((Date.now() - new Date(state.startDate + 'T00:00:00').getTime()) / 86400000)
  const season = getSeason(daysAlive)
  const weather = getWeather(daysAlive, season)
  const timeOfDay = getTimeOfDay()
  const seasonData = SEASONS[season]
  const weatherData = WEATHER_INFO[weather]
  const levelInfo = getLevel(state.totalFed)
  const statAvg = (state.faim + state.soif + state.bonheur + state.energie + state.sante + state.proprete) / 6
  const mood = getMood(statAvg)
  const dialogue = getDialogue(state)
  const chipieMood = getChipieMood(state, zzz, eating)
  const dailyQuests = useMemo(() => pickDailyQuests(state.dailyDate), [state.dailyDate])

  // Persist
  useEffect(() => { saveState(state) }, [state])

  // Decay every 30s
  useEffect(() => {
    const i = setInterval(() => setState(prev => applyDecay(prev)), 30000)
    return () => clearInterval(i)
  }, [])

  // Random events every 60s
  useEffect(() => {
    const i = setInterval(() => {
      if (Math.random() > 0.45) {
        const ev = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]
        setEvent(ev.text)
        setState(prev => ({ ...prev, [ev.stat]: clamp((prev as Record<string, number>)[ev.stat] + ev.value) }))
        setTimeout(() => setEvent(null), 4000)
      }
    }, 60000)
    return () => clearInterval(i)
  }, [])

  // Achievement check
  useEffect(() => {
    const checkState: AchievementCheckState = {
      totalFed: state.totalFed, totalDays: daysAlive + 1,
      uniqueFoods: state.uniqueFoodsGiven, coins: state.coins,
      allStatsAbove90: state.faim >= 90 && state.soif >= 90 && state.bonheur >= 90 && state.energie >= 90 && state.sante >= 90 && state.proprete >= 90,
      allStatsAbove50: statAvg >= 50, currentHour: new Date().getHours(),
      totalPets: state.totalPets, totalBrushes: state.totalBrushes,
      totalPlays: state.totalPlays, itemsOwned: state.ownedItems.length,
      questsCompleted: state.questsCompletedTotal,
    }
    const newUnlocks: string[] = []
    for (const a of ACHIEVEMENTS) {
      if (!state.unlockedAchievements.includes(a.id) && a.condition(checkState)) {
        newUnlocks.push(a.id)
      }
    }
    if (newUnlocks.length > 0) {
      setState(prev => ({
        ...prev,
        unlockedAchievements: [...prev.unlockedAchievements, ...newUnlocks],
        coins: prev.coins + newUnlocks.reduce((sum, id) => sum + (ACHIEVEMENTS.find(a => a.id === id)?.rewardCoins || 0), 0),
      }))
      const first = ACHIEVEMENTS.find(a => a.id === newUnlocks[0])
      if (first) {
        setNewAchievement(`${first.icon} ${first.name}`)
        setTimeout(() => setNewAchievement(null), 3500)
      }
    }
  }, [state.totalFed, state.totalPets, state.totalBrushes, state.totalPlays, state.ownedItems.length, state.questsCompletedTotal, daysAlive, statAvg])

  // Particles
  const spawnParticles = useCallback((emojis: string[]) => {
    const newP = emojis.map((emoji, i) => ({
      id: Date.now() + i, emoji, x: 30 + Math.random() * 40,
    }))
    setParticles(prev => [...prev, ...newP])
    setTimeout(() => setParticles(prev => prev.filter(p => !newP.find(n => n.id === p.id))), 1500)
  }, [])

  // Update daily counters helper
  const updateCounter = useCallback((key: keyof DailyCounters, amount = 1) => {
    setState(prev => {
      const counters = { ...prev.dailyCounters, [key]: prev.dailyCounters[key] + amount }
      // Check allHigh
      const avg = (prev.faim + prev.soif + prev.bonheur + prev.energie + prev.sante + prev.proprete) / 6
      if (avg >= 70) counters.allHigh = 1
      // Update quest progress
      const qp = prev.dailyQuestProgress.map(q => {
        const quest = dailyQuests.find(dq => dq.id === q.id)
        if (!quest) return q
        if (quest.trackKey === key) return { ...q, progress: Math.min(quest.target, q.progress + amount) }
        if (quest.trackKey === 'allHigh' && counters.allHigh >= 1) return { ...q, progress: 1 }
        return q
      })
      return { ...prev, dailyCounters: counters, dailyQuestProgress: qp }
    })
  }, [dailyQuests])

  // Actions
  const feed = useCallback((vegetal: typeof VEGETAUX[number]) => {
    let faimBoost = 15, bonheurBoost = 10
    if (vegetal.categorie === 'fruits') { faimBoost = 8; bonheurBoost = 18 }
    if (vegetal.categorie === 'salades') { faimBoost = 22; bonheurBoost = 6 }
    if (vegetal.categorie === 'aromatiques') { faimBoost = 12; bonheurBoost = 14 }
    if (vegetal.restriction === 'a_eviter') { faimBoost = -8; bonheurBoost = -12 }
    const cat = CATEGORIES.find(c => c.id === vegetal.categorie)

    setEating(true)
    setState(prev => ({
      ...prev,
      faim: clamp(prev.faim + faimBoost),
      bonheur: clamp(prev.bonheur + bonheurBoost),
      totalFed: prev.totalFed + 1, coins: prev.coins + 1,
      uniqueFoodsGiven: prev.uniqueFoodsGiven.includes(vegetal.id) ? prev.uniqueFoodsGiven : [...prev.uniqueFoodsGiven, vegetal.id],
    }))
    updateCounter('feeds')
    if (vegetal.categorie === 'fruits') updateCounter('fruits')

    if (vegetal.restriction === 'a_eviter') {
      setLastAction(`😵 Beurk ! Chipie recrache ${vegetal.nom} !`)
    } else {
      setLastAction(`😋 Miam ! Chipie adore ${vegetal.nom} ! ${cat?.emoji || ''}`)
      spawnParticles(['✨', '😋', '⭐'])
    }
    setShowFeed(false)
    setFoodOptions(getRandomFood(6))
    setTimeout(() => { setLastAction(null); setEating(false) }, 2500)
  }, [updateCounter, spawnParticles])

  const giveWater = useCallback(() => {
    setState(prev => ({ ...prev, soif: clamp(prev.soif + 25), bonheur: clamp(prev.bonheur + 4) }))
    updateCounter('waters')
    setLastAction('💧 Glou glou ! Chipie boit avec plaisir !')
    spawnParticles(['💧', '💦', '✨'])
    setTimeout(() => setLastAction(null), 2000)
  }, [updateCounter, spawnParticles])

  const giveHay = useCallback(() => {
    setState(prev => ({ ...prev, faim: clamp(prev.faim + 12), bonheur: clamp(prev.bonheur + 4), energie: clamp(prev.energie + 3) }))
    updateCounter('hays')
    setLastAction('🌾 Crunch crunch ! Chipie grignote son foin !')
    spawnParticles(['🌾', '✨'])
    setTimeout(() => setLastAction(null), 2000)
  }, [updateCounter, spawnParticles])

  const petAction = useCallback(() => {
    setState(prev => ({ ...prev, bonheur: clamp(prev.bonheur + 15), totalPets: prev.totalPets + 1 }))
    updateCounter('pets')
    setLastAction('🥰 Chipie ferme les yeux de bonheur...')
    spawnParticles(['❤️', '💕', '🥰'])
    setTimeout(() => setLastAction(null), 2000)
  }, [updateCounter, spawnParticles])

  const brushAction = useCallback(() => {
    setState(prev => ({ ...prev, proprete: clamp(prev.proprete + 25), bonheur: clamp(prev.bonheur + 8), totalBrushes: prev.totalBrushes + 1 }))
    updateCounter('brushes')
    setLastAction('✨ Chipie est toute propre et douce !')
    spawnParticles(['✨', '🧹', '💫'])
    setTimeout(() => setLastAction(null), 2000)
  }, [updateCounter, spawnParticles])

  const playAction = useCallback(() => {
    setState(prev => ({ ...prev, bonheur: clamp(prev.bonheur + 18), energie: clamp(prev.energie - 8), totalPlays: prev.totalPlays + 1 }))
    updateCounter('plays')
    setLastAction('🎾 Chipie saute et court partout !')
    spawnParticles(['🎾', '⭐', '🏃'])
    setTimeout(() => setLastAction(null), 2500)
  }, [updateCounter, spawnParticles])

  const sleepAction = useCallback(() => {
    setZzz(true)
    setState(prev => ({ ...prev, energie: clamp(prev.energie + 30), bonheur: clamp(prev.bonheur + 5), sante: clamp(prev.sante + 5) }))
    updateCounter('sleeps')
    setLastAction('💤 Chipie fait une douce sieste...')
    setTimeout(() => { setZzz(false); setLastAction(null) }, 3500)
  }, [updateCounter])

  // Claim quest reward
  const claimQuest = useCallback((questId: string) => {
    const quest = dailyQuests.find(q => q.id === questId)
    if (!quest) return
    setState(prev => ({
      ...prev,
      coins: prev.coins + quest.rewardCoins,
      totalFed: prev.totalFed + Math.floor(quest.rewardXp / 2), // XP bonus as extra feeds
      questsCompletedTotal: prev.questsCompletedTotal + 1,
      dailyQuestProgress: prev.dailyQuestProgress.map(q =>
        q.id === questId ? { ...q, claimed: true } : q
      ),
    }))
    spawnParticles(['🪙', '⭐', '🎉'])
  }, [dailyQuests, spawnParticles])

  // Buy item
  const buyItem = useCallback((itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item || state.coins < item.price || state.ownedItems.includes(itemId)) return
    setState(prev => ({
      ...prev,
      coins: prev.coins - item.price,
      ownedItems: [...prev.ownedItems, itemId],
    }))
    spawnParticles(['🛍️', '✨', '🎉'])
  }, [state.coins, state.ownedItems, spawnParticles])

  // Equip item
  const equipItem = useCallback((itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item || !state.ownedItems.includes(itemId)) return
    if (item.category === 'accessoire') {
      setState(prev => ({ ...prev, equippedAccessory: prev.equippedAccessory === itemId ? null : itemId }))
    } else if (item.category === 'fond') {
      setState(prev => ({ ...prev, equippedBackground: prev.equippedBackground === itemId ? null : itemId }))
    } else {
      setState(prev => {
        const has = prev.equippedDecorations.includes(itemId)
        return { ...prev, equippedDecorations: has ? prev.equippedDecorations.filter(d => d !== itemId) : [...prev.equippedDecorations, itemId] }
      })
    }
  }, [state.ownedItems])

  // Scene colors
  const skyColors = (() => {
    if (timeOfDay === 'nuit') return { sky1: '#1a1a2e', sky2: '#16213e' }
    if (timeOfDay === 'aube') return { sky1: '#FFE0B2', sky2: '#FFCC80' }
    if (timeOfDay === 'crepuscule') return { sky1: '#FF8A65', sky2: '#FFAB91' }
    if (timeOfDay === 'soir') return { sky1: '#FFB74D', sky2: '#FFE0B2' }
    return seasonData.colors
  })()

  // Stats array for rendering
  const stats = [
    { key: 'faim', icon: '🥬', label: 'Faim', value: state.faim, color: '#4CAF50' },
    { key: 'soif', icon: '💧', label: 'Soif', value: state.soif, color: '#2196F3' },
    { key: 'bonheur', icon: '😊', label: 'Bonheur', value: state.bonheur, color: '#FF9800' },
    { key: 'energie', icon: '⚡', label: 'Énergie', value: state.energie, color: '#FFC107' },
    { key: 'sante', icon: '❤️', label: 'Santé', value: state.sante, color: '#F44336' },
    { key: 'proprete', icon: '✨', label: 'Propreté', value: state.proprete, color: '#9C27B0' },
  ]

  return (
    <div className={styles.page}>
      {/* Back button */}
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.levelBadge}>Niv. {levelInfo.level}</span>
          <span className={styles.levelTitle}>{levelInfo.title}</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.coinBadge}>🪙 {state.coins}</span>
        </div>
      </div>

      {/* XP bar */}
      <div className={styles.xpBar}>
        <div className={styles.xpFill} style={{ width: `${(levelInfo.xp / levelInfo.xpNeeded) * 100}%` }} />
        <span className={styles.xpText}>{levelInfo.xp}/{levelInfo.xpNeeded} XP</span>
      </div>

      {/* Scene */}
      <div className={styles.scene}>
        {/* Sky with gradient layers */}
        <div className={styles.sky} style={{
          background: `linear-gradient(175deg, ${skyColors.sky1} 0%, ${skyColors.sky2} 60%, ${seasonData.colors.ground1}33 100%)`,
        }} />

        {/* Sun or Moon */}
        {timeOfDay !== 'nuit' && weather !== 'pluie' && weather !== 'orage' && (
          <div className={styles.sun} />
        )}
        {timeOfDay === 'nuit' && (
          <div className={styles.moon} />
        )}

        {/* Weather & season indicator */}
        <div className={styles.weatherTag}>
          {weatherData.emoji} {seasonData.emoji}
        </div>

        {/* Clouds */}
        {weather !== 'neige' && (
          <>
            <div className={styles.cloud1} />
            <div className={styles.cloud2} />
            <div className={styles.cloud3} />
          </>
        )}

        {/* Rain / Snow */}
        {(weather === 'pluie' || weather === 'orage') && (
          <div className={styles.rainContainer}>
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className={styles.raindrop} style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${0.4 + Math.random() * 0.3}s`,
              }} />
            ))}
          </div>
        )}
        {weather === 'neige' && (
          <div className={styles.snowContainer}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className={styles.snowflake} style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                fontSize: `${6 + Math.random() * 8}px`,
              }}>*</div>
            ))}
          </div>
        )}

        {/* Stars at night */}
        {timeOfDay === 'nuit' && (
          <div className={styles.starsContainer}>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className={styles.star} style={{
                left: `${3 + Math.random() * 94}%`,
                top: `${3 + Math.random() * 45}%`,
                animationDelay: `${Math.random() * 3}s`,
                width: `${1.5 + Math.random() * 2.5}px`,
                height: `${1.5 + Math.random() * 2.5}px`,
              }} />
            ))}
          </div>
        )}

        {/* Background hills */}
        <div className={styles.hillBack} style={{
          background: `${seasonData.colors.ground1}88`,
        }} />
        <div className={styles.hillMid} style={{
          background: `${seasonData.colors.ground1}BB`,
        }} />

        {/* Trees */}
        <div className={styles.treeTrunk} style={{ left: '6%' }} />
        <div className={styles.treeCanopy} style={{ left: '0%', background: season === 'automne' ? '#C0713A' : season === 'hiver' ? '#8B7355' : '#3A7D44' }} />
        <div className={styles.treeTrunk} style={{ right: '8%' }} />
        <div className={styles.treeCanopy} style={{ right: '2%', background: season === 'automne' ? '#D4943A' : season === 'hiver' ? '#7A6B55' : '#2D6B35' }} />

        {/* Bush left */}
        <div className={styles.bush} style={{ left: '2%', background: season === 'automne' ? '#A0784A' : season === 'hiver' ? '#6B6B5A' : '#4A8B52' }} />
        {/* Bush right */}
        <div className={styles.bush} style={{ right: '0%', background: season === 'automne' ? '#B08050' : season === 'hiver' ? '#5A5A4E' : '#3D7A42' }} />

        {/* Ground */}
        <div className={styles.ground} style={{
          background: `linear-gradient(180deg, ${seasonData.colors.ground1} 0%, ${seasonData.colors.ground2} 100%)`,
        }}>
          {/* Grass tufts */}
          <div className={styles.grassTuft} style={{ left: '8%' }} />
          <div className={styles.grassTuft} style={{ left: '20%' }} />
          <div className={styles.grassTuft} style={{ left: '38%' }} />
          <div className={styles.grassTuft} style={{ left: '55%' }} />
          <div className={styles.grassTuft} style={{ left: '72%' }} />
          <div className={styles.grassTuft} style={{ left: '88%' }} />

          {/* Small stones */}
          <div className={styles.stone} style={{ left: '30%', bottom: '8px' }} />
          <div className={styles.stone} style={{ right: '25%', bottom: '12px' }} />

          {/* Season-specific ground details */}
          {season === 'printemps' && (
            <>
              <div className={styles.flower} style={{ left: '12%', bottom: '24px' }}>🌸</div>
              <div className={styles.flower} style={{ left: '35%', bottom: '28px' }}>🌼</div>
              <div className={styles.flower} style={{ left: '58%', bottom: '20px' }}>🌷</div>
              <div className={styles.flower} style={{ left: '80%', bottom: '26px' }}>🌸</div>
              <div className={styles.flower} style={{ left: '48%', bottom: '12px', fontSize: '8px' }}>🌿</div>
            </>
          )}
          {season === 'ete' && (
            <>
              <div className={styles.flower} style={{ left: '15%', bottom: '22px' }}>🌻</div>
              <div className={styles.flower} style={{ left: '70%', bottom: '20px' }}>🌺</div>
              <div className={styles.flower} style={{ left: '45%', bottom: '14px', fontSize: '8px' }}>🦋</div>
            </>
          )}
          {season === 'automne' && (
            <>
              <div className={styles.flower} style={{ left: '18%', bottom: '16px' }}>🍂</div>
              <div className={styles.flower} style={{ left: '42%', bottom: '20px' }}>🍁</div>
              <div className={styles.flower} style={{ left: '68%', bottom: '14px' }}>🍂</div>
              <div className={styles.flower} style={{ left: '85%', bottom: '18px' }}>🍄</div>
            </>
          )}
          {season === 'hiver' && (
            <>
              <div className={styles.flower} style={{ left: '20%', bottom: '16px', fontSize: '10px' }}>❄️</div>
              <div className={styles.flower} style={{ left: '55%', bottom: '20px', fontSize: '8px' }}>❄️</div>
            </>
          )}
        </div>

        {/* Decorations from shop */}
        {state.equippedDecorations.includes('mushrooms') && (
          <div className={styles.decoItem} style={{ left: '14%', bottom: '58px' }}>🍄</div>
        )}
        {state.equippedDecorations.includes('flowers') && (
          <div className={styles.decoItem} style={{ right: '18%', bottom: '56px' }}>🌺</div>
        )}
        {state.equippedDecorations.includes('ball') && (
          <div className={styles.decoItem} style={{ left: '24%', bottom: '52px' }}>🎾</div>
        )}
        {state.equippedDecorations.includes('carrot_pile') && (
          <div className={styles.decoItem} style={{ right: '22%', bottom: '52px' }}>🥕</div>
        )}
        {state.equippedDecorations.includes('butterflies') && (
          <>
            <div className={`${styles.decoItem} ${styles.butterfly}`} style={{ left: '20%', top: '30%' }}>🦋</div>
            <div className={`${styles.decoItem} ${styles.butterfly}`} style={{ right: '18%', top: '25%' }}>🦋</div>
          </>
        )}
        {state.equippedDecorations.includes('lanterns') && (
          <>
            <div className={`${styles.decoItem} ${styles.lanternGlow}`} style={{ left: '5%', top: '22px', fontSize: '20px' }}>🏮</div>
            <div className={`${styles.decoItem} ${styles.lanternGlow}`} style={{ right: '6%', top: '18px', fontSize: '18px' }}>🏮</div>
          </>
        )}

        {/* Speech bubble */}
        {(dialogue || lastAction) && (
          <div className={styles.speechBubble}>
            {lastAction || dialogue}
          </div>
        )}

        {/* Chipie */}
        <div className={`${styles.chipieWrap} ${
          chipieMood === 'excited' || chipieMood === 'happy' ? styles.chipieHappy :
          chipieMood === 'sad' ? styles.chipieSad :
          lastAction ? styles.chipieBounce : ''
        }`}>
          <ChipieSvg mood={chipieMood} accessory={state.equippedAccessory} className={styles.chipieSvg} />
        </div>

        {/* Particles */}
        {particles.map(p => (
          <div key={p.id} className={styles.particle} style={{ left: `${p.x}%` }}>
            {p.emoji}
          </div>
        ))}

        {/* Mood tag */}
        <div className={styles.moodTag}>
          <span>{mood.emoji}</span>
          <span>{mood.label}</span>
        </div>
      </div>

      {/* Day info */}
      <p className={styles.dayInfo}>
        Jour {daysAlive + 1} — {state.totalFed} repas — {seasonData.label} {seasonData.emoji}
      </p>

      {/* Achievement notification */}
      {newAchievement && (
        <div className={styles.achievementPopup}>
          🏆 Succès débloqué : {newAchievement}
        </div>
      )}

      {/* Event banner */}
      {event && <div className={styles.eventBanner}>{event}</div>}

      {/* Stats - circular gauges */}
      <div className={styles.statsGrid}>
        {stats.map(s => {
          const pct = Math.round(s.value)
          const circumference = 2 * Math.PI * 18
          const offset = circumference - (pct / 100) * circumference
          return (
            <div key={s.key} className={styles.statItem}>
              <svg className={styles.statRing} viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border-subtle)" strokeWidth="3.5" />
                <circle cx="22" cy="22" r="18" fill="none" stroke={pct <= 20 ? 'var(--accent-red)' : pct <= 40 ? 'var(--accent-yellow)' : s.color}
                  strokeWidth="3.5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                  transform="rotate(-90 22 22)" className={pct <= 20 ? styles.ringDanger : ''} />
              </svg>
              <span className={styles.statIcon}>{s.icon}</span>
              <span className={styles.statPct}>{pct}%</span>
            </div>
          )
        })}
      </div>

      {/* Tab navigation */}
      <div className={styles.tabBar}>
        {([
          { id: 'soins' as TabId, icon: '🩺', label: 'Soins' },
          { id: 'quetes' as TabId, icon: '📜', label: 'Quêtes' },
          { id: 'boutique' as TabId, icon: '🛍️', label: 'Boutique' },
          { id: 'succes' as TabId, icon: '🏆', label: 'Succès' },
        ]).map(t => (
          <button key={t.id} className={`${styles.tabBtn} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {/* ===== SOINS TAB ===== */}
        {tab === 'soins' && (
          <>
            <div className={styles.actionsGrid}>
              {[
                { emoji: '🥬', label: 'Nourrir', onClick: () => setShowFeed(!showFeed) },
                { emoji: '💧', label: 'Eau', onClick: giveWater },
                { emoji: '🌾', label: 'Foin', onClick: giveHay },
                { emoji: '🤗', label: 'Câlin', onClick: petAction },
                { emoji: '🧹', label: 'Brosser', onClick: brushAction },
                { emoji: '🎾', label: 'Jouer', onClick: playAction },
                { emoji: '💤', label: 'Dodo', onClick: sleepAction },
              ].map(a => (
                <button key={a.label} className={styles.actionBtn} onClick={a.onClick}>
                  <span className={styles.actionEmoji}>{a.emoji}</span>
                  <span className={styles.actionLabel}>{a.label}</span>
                </button>
              ))}
            </div>

            {showFeed && (
              <div className={styles.foodPanel}>
                <span className={styles.foodTitle}>Que donner à Chipie ?</span>
                <div className={styles.foodGrid}>
                  {foodOptions.map(v => {
                    const cat = CATEGORIES.find(c => c.id === v.categorie)
                    return (
                      <button key={v.id} className={styles.foodItem} onClick={() => feed(v)}>
                        <img src={assetUrl(v.image)} alt="" className={styles.foodImg} />
                        <div className={styles.foodInfo}>
                          <span className={styles.foodName}>{v.nom}</span>
                          <span className={styles.foodCat}>{cat?.emoji} {cat?.nom}</span>
                        </div>
                        {v.restriction === 'a_eviter' && <span className={styles.foodBad}>⚠️</span>}
                      </button>
                    )
                  })}
                </div>
                <button className={styles.foodRefresh} onClick={() => setFoodOptions(getRandomFood(6))}>
                  🔄 Autres aliments
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== QUÊTES TAB ===== */}
        {tab === 'quetes' && (
          <div className={styles.questList}>
            <h3 className={styles.sectionTitle}>📜 Quêtes du jour</h3>
            {dailyQuests.map((quest, idx) => {
              const progress = state.dailyQuestProgress[idx]
              if (!progress) return null
              const done = progress.progress >= quest.target
              return (
                <div key={quest.id} className={`${styles.questCard} ${done ? styles.questDone : ''}`}>
                  <div className={styles.questHeader}>
                    <span className={styles.questIcon}>{quest.icon}</span>
                    <span className={styles.questText}>{quest.text}</span>
                  </div>
                  <div className={styles.questBottom}>
                    <div className={styles.questBarTrack}>
                      <div className={styles.questBarFill} style={{ width: `${(progress.progress / quest.target) * 100}%` }} />
                    </div>
                    <span className={styles.questProgress}>{progress.progress}/{quest.target}</span>
                    {done && !progress.claimed && (
                      <button className={styles.questClaim} onClick={() => claimQuest(quest.id)}>
                        🎁 +{quest.rewardCoins}🪙
                      </button>
                    )}
                    {progress.claimed && <span className={styles.questClaimed}>✅</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ===== BOUTIQUE TAB ===== */}
        {tab === 'boutique' && (
          <div className={styles.shopContainer}>
            {(['accessoire', 'decoration', 'fond'] as const).map(cat => {
              const items = SHOP_ITEMS.filter(i => i.category === cat)
              const catLabel = cat === 'accessoire' ? '🎀 Accessoires' : cat === 'decoration' ? '🌺 Décorations' : '🖼️ Fonds'
              return (
                <div key={cat}>
                  <h3 className={styles.sectionTitle}>{catLabel}</h3>
                  <div className={styles.shopGrid}>
                    {items.map(item => {
                      const owned = state.ownedItems.includes(item.id)
                      const equipped = item.category === 'accessoire' ? state.equippedAccessory === item.id
                        : item.category === 'fond' ? state.equippedBackground === item.id
                        : state.equippedDecorations.includes(item.id)
                      return (
                        <div key={item.id} className={`${styles.shopCard} ${equipped ? styles.shopEquipped : ''}`}>
                          <span className={styles.shopIcon}>{item.icon}</span>
                          <span className={styles.shopName}>{item.name}</span>
                          <span className={styles.shopDesc}>{item.description}</span>
                          {!owned ? (
                            <button className={styles.shopBuy} disabled={state.coins < item.price}
                              onClick={() => buyItem(item.id)}>
                              🪙 {item.price}
                            </button>
                          ) : (
                            <button className={`${styles.shopEquipBtn} ${equipped ? styles.equipped : ''}`}
                              onClick={() => equipItem(item.id)}>
                              {equipped ? 'Retirer' : 'Équiper'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ===== SUCCÈS TAB ===== */}
        {tab === 'succes' && (
          <div className={styles.achievementList}>
            <h3 className={styles.sectionTitle}>🏆 Succès ({state.unlockedAchievements.length}/{ACHIEVEMENTS.length})</h3>
            {ACHIEVEMENTS.map(a => {
              const unlocked = state.unlockedAchievements.includes(a.id)
              return (
                <div key={a.id} className={`${styles.achievementCard} ${unlocked ? styles.achievementUnlocked : ''}`}>
                  <span className={styles.achievementIcon}>{unlocked ? a.icon : '🔒'}</span>
                  <div className={styles.achievementInfo}>
                    <span className={styles.achievementName}>{a.name}</span>
                    <span className={styles.achievementDesc}>{a.description}</span>
                  </div>
                  {unlocked && <span className={styles.achievementReward}>+{a.rewardCoins}🪙</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

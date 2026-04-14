import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PlantePage.module.css'

const STORAGE_KEY = 'chipie_garden'

interface Seed {
  id: string
  name: string
  emoji: string
  growMs: number
  cost: number
  yield: number
}

const SEEDS: Seed[] = [
  { id: 'basilic', name: 'Basilic', emoji: '🌿', growMs: 30_000,       cost: 5,  yield: 12  },
  { id: 'menthe',  name: 'Menthe',  emoji: '🍃', growMs: 2 * 60_000,   cost: 10, yield: 28  },
  { id: 'persil',  name: 'Persil',  emoji: '🌱', growMs: 5 * 60_000,   cost: 20, yield: 60  },
  { id: 'carotte', name: 'Carotte', emoji: '🥕', growMs: 15 * 60_000,  cost: 45, yield: 160 },
  { id: 'radis',   name: 'Radis',   emoji: '🌸', growMs: 8 * 60_000,   cost: 30, yield: 95  },
  { id: 'tomate',  name: 'Tomate',  emoji: '🍅', growMs: 25 * 60_000,  cost: 60, yield: 220 },
  { id: 'laitue',  name: 'Laitue',  emoji: '🥬', growMs: 45 * 60_000,  cost: 80, yield: 350 },
]

interface Plot {
  id: number
  state: 'empty' | 'growing' | 'ready'
  seedId: string | null
  startedAt: number | null
  growMs: number | null
}

interface GardenState {
  coins: number
  plots: Plot[]
  fertLevel: number
  yieldLevel: number
  unlockedPlots: number
  lastSave: number
}

const FERT_COST   = [0, 40, 80, 150]
const YIELD_COST  = [0, 50, 100, 180]
const UNLOCK_COST = [0, 0, 60, 120]

type Weather = '☀️' | '🌧️' | '🌵'

function getWeather(): Weather {
  const slot = Math.floor(Date.now() / (5 * 60_000))
  const n = ((slot * 2654435761) & 0xffffffff) >>> 0
  const r = n % 5
  if (r <= 2) return '☀️'
  if (r === 3) return '🌧️'
  return '🌵'
}

function weatherMult(w: Weather): number {
  if (w === '🌧️') return 0.8
  if (w === '🌵') return 1.25
  return 1.0
}

function weatherLabel(w: Weather): string {
  if (w === '🌧️') return 'Pluie · -20% temps'
  if (w === '🌵') return 'Sécheresse · +25% temps'
  return 'Beau temps'
}

function growthEmoji(seed: Seed, progress: number): string {
  if (progress < 0.25) return '🫘'
  if (progress < 0.65) return '🌿'
  return seed.emoji
}

function makePlots(n: number): Plot[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, state: 'empty', seedId: null, startedAt: null, growMs: null }))
}

function defaultState(): GardenState {
  return { coins: 30, plots: makePlots(4), fertLevel: 0, yieldLevel: 0, unlockedPlots: 2, lastSave: Date.now() }
}

function loadState(): GardenState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const s = JSON.parse(raw) as GardenState
    // Migration: add unlockedPlots for existing saves
    if (s.unlockedPlots === undefined) s.unlockedPlots = 4
    // Offline progress: advance growing plots that finished
    const now = Date.now()
    for (const p of s.plots) {
      if (p.state === 'growing' && p.startedAt && p.growMs) {
        if (now >= p.startedAt + p.growMs) p.state = 'ready'
      }
    }
    return s
  } catch { return defaultState() }
}

function saveState(s: GardenState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, lastSave: Date.now() })) } catch { /* */ }
}

function effectiveGrowMs(base: number, fertLevel: number, weather: Weather): number {
  return Math.round(base * Math.pow(0.8, fertLevel) * weatherMult(weather))
}

function effectiveYield(base: number, yieldLevel: number): number {
  return Math.round(base * Math.pow(1.4, yieldLevel))
}

function formatTime(ms: number): string {
  if (ms < 60_000) return `${Math.ceil(ms / 1000)}s`
  if (ms < 3600_000) return `${Math.ceil(ms / 60_000)}min`
  return `${(ms / 3600_000).toFixed(1)}h`
}

// ===== Audio =====
function usePlantAudio() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return ctxRef.current
  }, [])

  const beep = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.3) => {
    try {
      const ac = getCtx()
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(gainVal, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
      osc.start()
      osc.stop(ac.currentTime + duration)
    } catch { /* ignore */ }
  }, [getCtx])

  const playPlant = useCallback(() => {
    beep(440, 0.08)
    setTimeout(() => beep(550, 0.06), 70)
  }, [beep])

  const playHarvest = useCallback(() => {
    beep(523, 0.07)
    setTimeout(() => beep(659, 0.07), 70)
    setTimeout(() => beep(784, 0.12), 140)
    try { navigator.vibrate([30, 20, 60]) } catch { /* ignore */ }
  }, [beep])

  const playBug = useCallback(() => {
    beep(180, 0.2, 'sawtooth', 0.2)
    try { navigator.vibrate(60) } catch { /* ignore */ }
  }, [beep])

  const playKillBug = useCallback(() => {
    beep(660, 0.06, 'square', 0.15)
    setTimeout(() => beep(880, 0.08), 60)
    try { navigator.vibrate(20) } catch { /* ignore */ }
  }, [beep])

  const playUnlock = useCallback(() => {
    beep(523, 0.07)
    setTimeout(() => beep(659, 0.07), 80)
    setTimeout(() => beep(784, 0.07), 160)
    setTimeout(() => beep(1047, 0.15), 240)
    try { navigator.vibrate([20, 10, 40]) } catch { /* ignore */ }
  }, [beep])

  return { playPlant, playHarvest, playBug, playKillBug, playUnlock }
}

export default function PlantePage() {
  const navigate = useNavigate()
  const { playPlant, playHarvest, playBug, playKillBug, playUnlock } = usePlantAudio()

  const [garden, setGarden] = useState<GardenState>(loadState)
  const [pickingPlot, setPickingPlot] = useState<number | null>(null)
  const [harvestAnim, setHarvestAnim] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [bugs, setBugs] = useState<number[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [weather, setWeather] = useState<Weather>(getWeather)

  const bugsRef = useRef<number[]>([])
  const gardenRef = useRef(garden)

  useEffect(() => { gardenRef.current = garden }, [garden])
  useEffect(() => { bugsRef.current = bugs }, [bugs])

  // Tick every second
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now())
      setWeather(getWeather())
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-mark ready plots
  useEffect(() => {
    setGarden(g => {
      let changed = false
      const plots = g.plots.map(p => {
        if (p.state === 'growing' && p.startedAt && p.growMs && now >= p.startedAt + p.growMs) {
          changed = true
          return { ...p, state: 'ready' as const }
        }
        return p
      })
      if (!changed) return g
      const next = { ...g, plots }
      saveState(next)
      return next
    })
  }, [now])

  // Bug system: every 45s, randomly attack a growing plot at 30–80% progress
  useEffect(() => {
    const interval = setInterval(() => {
      const g = gardenRef.current
      const activeBugs = bugsRef.current
      const nowTs = Date.now()
      const candidates = g.plots.filter(p => {
        if (p.id >= g.unlockedPlots) return false
        if (p.state !== 'growing' || activeBugs.includes(p.id)) return false
        if (!p.startedAt || !p.growMs) return false
        const prog = (nowTs - p.startedAt) / p.growMs
        return prog >= 0.3 && prog <= 0.8
      })
      if (candidates.length === 0) return
      const target = candidates[Math.floor(Math.random() * candidates.length)]
      setBugs(prev => [...prev, target.id])
      playBug()
      setToast('🐛 Un parasite attaque !')
      setTimeout(() => setToast(null), 1800)
    }, 45_000)
    return () => clearInterval(interval)
  }, [playBug])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }, [])

  const update = useCallback((fn: (g: GardenState) => GardenState) => {
    setGarden(g => { const next = fn(g); saveState(next); return next })
  }, [])

  const plant = useCallback((plotId: number, seed: Seed) => {
    update(g => {
      if (g.coins < seed.cost) return g
      const grow = effectiveGrowMs(seed.growMs, g.fertLevel, weather)
      const plots = g.plots.map(p =>
        p.id === plotId ? { ...p, state: 'growing' as const, seedId: seed.id, startedAt: Date.now(), growMs: grow } : p
      )
      return { ...g, coins: g.coins - seed.cost, plots }
    })
    setPickingPlot(null)
    playPlant()
  }, [update, weather, playPlant])

  const harvest = useCallback((plotId: number) => {
    const hasBug = bugsRef.current.includes(plotId)
    update(g => {
      const plot = g.plots.find(p => p.id === plotId)
      if (!plot || plot.state !== 'ready' || !plot.seedId) return g
      const seed = SEEDS.find(s => s.id === plot.seedId)
      if (!seed) return g
      let earned = effectiveYield(seed.yield, g.yieldLevel)
      if (hasBug) earned = Math.round(earned * 0.6)
      const plots = g.plots.map(p =>
        p.id === plotId ? { ...p, state: 'empty' as const, seedId: null, startedAt: null, growMs: null } : p
      )
      return { ...g, coins: g.coins + earned, plots }
    })
    if (hasBug) {
      setBugs(prev => prev.filter(id => id !== plotId))
      showToast('Récolte abîmée -40% 😢')
    } else {
      showToast('Récolte parfaite ! 🎉')
    }
    setHarvestAnim(plotId)
    setTimeout(() => setHarvestAnim(null), 600)
    playHarvest()
  }, [update, playHarvest, showToast])

  const killBug = useCallback((plotId: number) => {
    setBugs(prev => prev.filter(id => id !== plotId))
    playKillBug()
    showToast('🐛 Parasite écrasé !')
  }, [playKillBug, showToast])

  const buyFert = useCallback(() => {
    update(g => {
      if (g.fertLevel >= 3) return g
      const cost = FERT_COST[g.fertLevel + 1]
      if (g.coins < cost) return g
      return { ...g, coins: g.coins - cost, fertLevel: g.fertLevel + 1 }
    })
  }, [update])

  const buyYield = useCallback(() => {
    update(g => {
      if (g.yieldLevel >= 3) return g
      const cost = YIELD_COST[g.yieldLevel + 1]
      if (g.coins < cost) return g
      return { ...g, coins: g.coins - cost, yieldLevel: g.yieldLevel + 1 }
    })
  }, [update])

  const unlockPlot = useCallback((plotId: number) => {
    update(g => {
      if (plotId !== g.unlockedPlots) return g
      const cost = UNLOCK_COST[plotId]
      if (g.coins < cost) return g
      return { ...g, coins: g.coins - cost, unlockedPlots: plotId + 1 }
    })
    playUnlock()
    showToast('Nouvelle parcelle débloquée !')
  }, [update, playUnlock, showToast])

  const getProgress = (plot: Plot): number => {
    if (!plot.startedAt || !plot.growMs) return 0
    return Math.min(1, (now - plot.startedAt) / plot.growMs)
  }

  const getTimeLeft = (plot: Plot): string => {
    if (!plot.startedAt || !plot.growMs) return ''
    const left = Math.max(0, (plot.startedAt + plot.growMs) - now)
    return formatTime(left)
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Retour
        </button>
        <div className={styles.coins}>🪙 {garden.coins}</div>
      </div>

      <h1 className={styles.title}>🌱 Potager de Chipie</h1>
      <p className={styles.sub}>Plante, récolte, accumule des pièces !</p>

      {/* Weather badge */}
      <div className={styles.weatherBadge}>
        <span>{weather}</span>
        <span className={styles.weatherLabel}>{weatherLabel(weather)}</span>
      </div>

      {/* Plots */}
      <div className={styles.plots}>
        {garden.plots.map(plot => {
          const isUnlocked = plot.id < garden.unlockedPlots
          const seed = plot.seedId ? SEEDS.find(s => s.id === plot.seedId) : null
          const prog = getProgress(plot)
          const isHarvest = harvestAnim === plot.id
          const hasBug = bugs.includes(plot.id)

          if (!isUnlocked) {
            const cost = UNLOCK_COST[plot.id]
            const canAfford = garden.coins >= cost
            const isNext = plot.id === garden.unlockedPlots
            return (
              <div
                key={plot.id}
                className={`${styles.plot} ${styles.plotLocked} ${isNext && canAfford ? styles.plotLockReady : ''}`}
                onClick={() => isNext && canAfford && unlockPlot(plot.id)}
              >
                <span className={styles.plotIcon}>🔒</span>
                <span className={styles.plotLabel}>Débloquer</span>
                <span className={`${styles.plotUnlockCost} ${!canAfford ? styles.plotUnlockBroke : ''}`}>{cost} 🪙</span>
              </div>
            )
          }

          return (
            <div
              key={plot.id}
              className={`${styles.plot} ${styles[`plot_${plot.state}`]} ${isHarvest ? styles.plotHarvest : ''} ${hasBug && plot.state === 'growing' ? styles.plotBug : ''}`}
              onClick={() => {
                if (plot.state === 'empty') setPickingPlot(plot.id)
                else if (plot.state === 'ready') harvest(plot.id)
              }}
            >
              {plot.state === 'empty' && (
                <>
                  <span className={styles.plotIcon}>🪱</span>
                  <span className={styles.plotLabel}>Planter</span>
                </>
              )}

              {plot.state === 'growing' && seed && (
                <>
                  <span className={styles.plotIcon}>{growthEmoji(seed, prog)}</span>
                  <span className={styles.plotName}>{seed.name}</span>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${prog * 100}%` }} />
                  </div>
                  <span className={styles.plotTimer}>{getTimeLeft(plot)}</span>
                  {hasBug && (
                    <button
                      className={styles.bugBtn}
                      onClick={e => { e.stopPropagation(); killBug(plot.id) }}
                    >
                      🐛 Écraser !
                    </button>
                  )}
                </>
              )}

              {plot.state === 'ready' && seed && (
                <>
                  <span className={`${styles.plotIcon} ${styles.plotReady}`}>{seed.emoji}</span>
                  <span className={styles.plotName}>{seed.name}</span>
                  <span className={styles.plotReadyLabel}>Récolter !</span>
                  <span className={styles.plotYield}>
                    +{hasBug ? Math.round(effectiveYield(seed.yield, garden.yieldLevel) * 0.6) : effectiveYield(seed.yield, garden.yieldLevel)} 🪙
                  </span>
                  {hasBug && <span className={styles.bugWarning}>🐛 Parasite ! -40%</span>}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Upgrades */}
      <div className={styles.upgrades}>
        <div className={styles.upgradeTitle}>Améliorations</div>

        <div className={styles.upgradeRow}>
          <div className={styles.upgradeInfo}>
            <span className={styles.upgradeEmoji}>💧</span>
            <div>
              <div className={styles.upgradeName}>Arrosage automatique</div>
              <div className={styles.upgradeDesc}>-20% temps de pousse par niveau</div>
              <div className={styles.upgradeStars}>{'★'.repeat(garden.fertLevel)}{'☆'.repeat(3 - garden.fertLevel)}</div>
            </div>
          </div>
          {garden.fertLevel < 3 ? (
            <button
              className={`${styles.upgradeBtn} ${garden.coins < FERT_COST[garden.fertLevel + 1] ? styles.upgradeBtnDisabled : ''}`}
              onClick={buyFert}
              disabled={garden.coins < FERT_COST[garden.fertLevel + 1]}
            >
              {FERT_COST[garden.fertLevel + 1]} 🪙
            </button>
          ) : <span className={styles.upgradeMax}>MAX</span>}
        </div>

        <div className={styles.upgradeRow}>
          <div className={styles.upgradeInfo}>
            <span className={styles.upgradeEmoji}>🌾</span>
            <div>
              <div className={styles.upgradeName}>Récolte abondante</div>
              <div className={styles.upgradeDesc}>+40% pièces par récolte</div>
              <div className={styles.upgradeStars}>{'★'.repeat(garden.yieldLevel)}{'☆'.repeat(3 - garden.yieldLevel)}</div>
            </div>
          </div>
          {garden.yieldLevel < 3 ? (
            <button
              className={`${styles.upgradeBtn} ${garden.coins < YIELD_COST[garden.yieldLevel + 1] ? styles.upgradeBtnDisabled : ''}`}
              onClick={buyYield}
              disabled={garden.coins < YIELD_COST[garden.yieldLevel + 1]}
            >
              {YIELD_COST[garden.yieldLevel + 1]} 🪙
            </button>
          ) : <span className={styles.upgradeMax}>MAX</span>}
        </div>
      </div>

      {/* Seed picker modal */}
      {pickingPlot !== null && (
        <div className={styles.modalOverlay} onClick={() => setPickingPlot(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Que planter ?</div>
            <div className={styles.seedList}>
              {SEEDS.map(seed => {
                const growTime = effectiveGrowMs(seed.growMs, garden.fertLevel, weather)
                const harvestYield = effectiveYield(seed.yield, garden.yieldLevel)
                const canAfford = garden.coins >= seed.cost
                return (
                  <button
                    key={seed.id}
                    className={`${styles.seedCard} ${!canAfford ? styles.seedCardDisabled : ''}`}
                    onClick={() => canAfford && plant(pickingPlot, seed)}
                    disabled={!canAfford}
                  >
                    <span className={styles.seedEmoji}>{seed.emoji}</span>
                    <div className={styles.seedInfo}>
                      <span className={styles.seedName}>{seed.name}</span>
                      <span className={styles.seedDetails}>⏱ {formatTime(growTime)} · +{harvestYield} 🪙</span>
                    </div>
                    <span className={`${styles.seedCost} ${!canAfford ? styles.seedCostBroke : ''}`}>{seed.cost} 🪙</span>
                  </button>
                )
              })}
            </div>
            <button className={styles.modalClose} onClick={() => setPickingPlot(null)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}

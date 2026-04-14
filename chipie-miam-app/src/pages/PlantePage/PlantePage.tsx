import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PlantePage.module.css'

const STORAGE_KEY = 'chipie_garden'

interface Seed {
  id: string
  name: string
  emoji: string
  growMs: number   // real milliseconds
  cost: number     // coins to plant
  yield: number    // coins on harvest
}

const SEEDS: Seed[] = [
  { id: 'basilic',  name: 'Basilic',  emoji: '🌿', growMs: 30_000,        cost: 5,  yield: 12 },
  { id: 'menthe',   name: 'Menthe',   emoji: '🍃', growMs: 2 * 60_000,    cost: 10, yield: 28 },
  { id: 'persil',   name: 'Persil',   emoji: '🌱', growMs: 5 * 60_000,    cost: 20, yield: 60 },
  { id: 'carotte',  name: 'Carotte',  emoji: '🥕', growMs: 15 * 60_000,   cost: 45, yield: 160 },
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
  fertLevel: number   // 0–3 : grow speed upgrade (-20% per level)
  yieldLevel: number  // 0–3 : harvest yield upgrade (+40% per level)
  lastSave: number
}

const FERT_COST  = [0, 40, 80, 150]
const YIELD_COST = [0, 50, 100, 180]

function makePlots(n: number): Plot[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, state: 'empty', seedId: null, startedAt: null, growMs: null }))
}

function defaultState(): GardenState {
  return { coins: 30, plots: makePlots(4), fertLevel: 0, yieldLevel: 0, lastSave: Date.now() }
}

function loadState(): GardenState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const s = JSON.parse(raw) as GardenState
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

function effectiveGrowMs(base: number, fertLevel: number): number {
  return Math.round(base * Math.pow(0.8, fertLevel))
}

function effectiveYield(base: number, yieldLevel: number): number {
  return Math.round(base * Math.pow(1.4, yieldLevel))
}

function formatTime(ms: number): string {
  if (ms < 60_000) return `${Math.ceil(ms / 1000)}s`
  if (ms < 3600_000) return `${Math.ceil(ms / 60_000)}min`
  return `${(ms / 3600_000).toFixed(1)}h`
}

export default function PlantePage() {
  const navigate = useNavigate()
  const [garden, setGarden] = useState<GardenState>(loadState)
  const [pickingPlot, setPickingPlot] = useState<number | null>(null)
  const [harvestAnim, setHarvestAnim] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  // Tick every second to refresh progress bars
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
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

  const update = useCallback((fn: (g: GardenState) => GardenState) => {
    setGarden(g => { const next = fn(g); saveState(next); return next })
  }, [])

  const plant = useCallback((plotId: number, seed: Seed) => {
    update(g => {
      if (g.coins < seed.cost) return g
      const grow = effectiveGrowMs(seed.growMs, g.fertLevel)
      const plots = g.plots.map(p =>
        p.id === plotId ? { ...p, state: 'growing' as const, seedId: seed.id, startedAt: Date.now(), growMs: grow } : p
      )
      return { ...g, coins: g.coins - seed.cost, plots }
    })
    setPickingPlot(null)
  }, [update])

  const harvest = useCallback((plotId: number) => {
    update(g => {
      const plot = g.plots.find(p => p.id === plotId)
      if (!plot || plot.state !== 'ready' || !plot.seedId) return g
      const seed = SEEDS.find(s => s.id === plot.seedId)
      if (!seed) return g
      const earned = effectiveYield(seed.yield, g.yieldLevel)
      const plots = g.plots.map(p =>
        p.id === plotId ? { ...p, state: 'empty' as const, seedId: null, startedAt: null, growMs: null } : p
      )
      return { ...g, coins: g.coins + earned, plots }
    })
    setHarvestAnim(plotId)
    setTimeout(() => setHarvestAnim(null), 600)
  }, [update])

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

      {/* Plots */}
      <div className={styles.plots}>
        {garden.plots.map(plot => {
          const seed = plot.seedId ? SEEDS.find(s => s.id === plot.seedId) : null
          const prog = getProgress(plot)
          const isHarvest = harvestAnim === plot.id

          return (
            <div
              key={plot.id}
              className={`${styles.plot} ${styles[`plot_${plot.state}`]} ${isHarvest ? styles.plotHarvest : ''}`}
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
                  <span className={styles.plotIcon}>{seed.emoji}</span>
                  <span className={styles.plotName}>{seed.name}</span>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${prog * 100}%` }} />
                  </div>
                  <span className={styles.plotTimer}>{getTimeLeft(plot)}</span>
                </>
              )}

              {plot.state === 'ready' && seed && (
                <>
                  <span className={`${styles.plotIcon} ${styles.plotReady}`}>{seed.emoji}</span>
                  <span className={styles.plotName}>{seed.name}</span>
                  <span className={styles.plotReadyLabel}>Récolter !</span>
                  <span className={styles.plotYield}>+{effectiveYield(seed.yield, garden.yieldLevel)} 🪙</span>
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
                const growTime = effectiveGrowMs(seed.growMs, garden.fertLevel)
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
    </div>
  )
}

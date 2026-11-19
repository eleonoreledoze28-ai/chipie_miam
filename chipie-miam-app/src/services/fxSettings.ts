import { useSyncExternalStore } from 'react'

/** Réglages des effets de l'app (sons, vibrations, ambiance, décor…). Stockés sur l'appareil. */
export interface FxSettings {
  sounds: boolean     // bruitages (ronronnement, croc-croc…)
  haptics: boolean    // vibrations du téléphone
  ambient: boolean    // météo et saisons à l'écran (pluie, neige, feuilles…)
  weather: boolean    // météo réelle (demande la position approximative)
  sky: boolean        // ciel réaliste en fond (soleil, lune, étoiles)
  sparkles: boolean   // étincelles sous le doigt
  glass: boolean      // cartes translucides (effet verre)
  textSize: TextSize  // taille du texte dans toute l'app
  readable: boolean   // mode lisibilité : police très lisible, texte plus aéré
}

export type TextSize = 'small' | 'normal' | 'large' | 'xlarge'

export const TEXT_SIZES: ReadonlyArray<{ id: TextSize; label: string }> = [
  { id: 'small', label: 'Petit' },
  { id: 'normal', label: 'Normal' },
  { id: 'large', label: 'Grand' },
  { id: 'xlarge', label: 'Très grand' },
]

const KEY = 'chipie_fx_settings'
const DEFAULTS: FxSettings = {
  sounds: true, haptics: true, ambient: true, weather: false, sky: true, sparkles: true, glass: true,
  textSize: 'normal', readable: false,
}

function load(): FxSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<FxSettings>) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

let current: FxSettings = load()
const listeners = new Set<() => void>()

// Téléphones peu puissants : cartes translucides sans flou (le flou est ce qui coûte le plus)
function isLowEnd(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4)
    || (nav.deviceMemory !== undefined && nav.deviceMemory <= 4)
}

/** L'effet verre passe par un attribut sur <html> : « on » (flou), « lite » (sans flou) ou « off ». */
function applyToDocument(fx: FxSettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.glass = !fx.glass ? 'off' : isLowEnd() ? 'lite' : 'on'
  // Taille du texte et lisibilité : lues par index.css (rien à recalculer dans React)
  root.dataset.textSize = TEXT_SIZES.some(s => s.id === fx.textSize) ? fx.textSize : 'normal'
  root.dataset.readable = String(fx.readable)
}

applyToDocument(current)

export function getFx(): FxSettings {
  return current
}

export function setFx(patch: Partial<FxSettings>): void {
  current = { ...current, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* stockage indisponible */ }
  applyToDocument(current)
  listeners.forEach(l => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function useFx(): FxSettings {
  return useSyncExternalStore(subscribe, getFx, getFx)
}

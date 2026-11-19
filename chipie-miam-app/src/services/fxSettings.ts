import { useSyncExternalStore } from 'react'

/** Réglages des effets de l'app (sons, vibrations, ambiance, météo). Stockés sur l'appareil. */
export interface FxSettings {
  sounds: boolean   // bruitages (ronronnement, croc-croc…)
  haptics: boolean  // vibrations du téléphone
  ambient: boolean  // ambiance visuelle (moment de la journée, météo)
  weather: boolean  // météo réelle (demande la position approximative)
}

const KEY = 'chipie_fx_settings'
const DEFAULTS: FxSettings = { sounds: true, haptics: true, ambient: true, weather: false }

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

export function getFx(): FxSettings {
  return current
}

export function setFx(patch: Partial<FxSettings>): void {
  current = { ...current, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* stockage indisponible */ }
  listeners.forEach(l => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function useFx(): FxSettings {
  return useSyncExternalStore(subscribe, getFx, getFx)
}

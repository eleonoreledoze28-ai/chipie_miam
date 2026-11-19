import { useSyncExternalStore } from 'react'
import { getFx, setFx } from './fxSettings'

/**
 * Météo réelle via Open-Meteo (gratuit, sans clé). Activée uniquement par l'utilisateur :
 * la position est arrondie à ~10 km, stockée sur l'appareil, et seule cette position
 * approximative est envoyée à open-meteo.com.
 */

export type WeatherKind = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

export interface Weather {
  tempC: number
  maxC: number
  minC: number
  kind: WeatherKind
  isDay: boolean
  fetchedAt: number
}

interface Loc { lat: number; lon: number }

const CACHE_KEY = 'chipie_weather_cache'
const LOC_KEY = 'chipie_weather_loc'
const FRESH_MS = 30 * 60 * 1000
const TIMEOUT_MS = 8000

// Codes météo WMO utilisés par Open-Meteo
export function kindFromCode(code: number): WeatherKind {
  if (code === 0 || code === 1) return 'clear'
  if (code === 2 || code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloudy'
}

export const KIND_LABEL: Record<WeatherKind, { emoji: string; label: string }> = {
  clear:   { emoji: '☀️', label: 'Dégagé' },
  cloudy:  { emoji: '☁️', label: 'Nuageux' },
  fog:     { emoji: '🌫️', label: 'Brouillard' },
  drizzle: { emoji: '🌦️', label: 'Bruine' },
  rain:    { emoji: '🌧️', label: 'Pluie' },
  snow:    { emoji: '❄️', label: 'Neige' },
  storm:   { emoji: '⛈️', label: 'Orage' },
}

function readCache(): Weather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Weather) : null
  } catch {
    return null
  }
}

function readLoc(): Loc | null {
  try {
    const raw = localStorage.getItem(LOC_KEY)
    return raw ? (JSON.parse(raw) as Loc) : null
  } catch {
    return null
  }
}

let current: Weather | null = readCache()
const listeners = new Set<() => void>()

function publish(next: Weather | null) {
  current = next
  listeners.forEach(l => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function getCachedWeather(): Weather | null {
  return getFx().weather ? current : null
}

export function useWeather(): Weather | null {
  return useSyncExternalStore(subscribe, getCachedWeather, getCachedWeather)
}

interface ForecastResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number }
  daily: { temperature_2m_max: number[]; temperature_2m_min: number[] }
}

/** Récupère la météo (utilise le cache s'il a moins de 30 min, sauf `force`). */
export async function refreshWeather(force = false): Promise<Weather | null> {
  if (!getFx().weather) return null
  const loc = readLoc()
  if (!loc) return null
  if (!force && current && Date.now() - current.fetchedAt < FRESH_MS) return current

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const url = 'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${loc.lat}&longitude=${loc.lon}`
      + '&current=temperature_2m,weather_code,is_day'
      + '&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto'
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as ForecastResponse
    const weather: Weather = {
      tempC: data.current.temperature_2m,
      maxC: data.daily.temperature_2m_max[0],
      minC: data.daily.temperature_2m_min[0],
      kind: kindFromCode(data.current.weather_code),
      isDay: data.current.is_day === 1,
      fetchedAt: Date.now(),
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(weather)) } catch { /* stockage indisponible */ }
    publish(weather)
    return weather
  } catch {
    return current // hors-ligne ou service indisponible : on garde la dernière météo connue
  } finally {
    window.clearTimeout(timer)
  }
}

export type EnableResult = 'ok' | 'denied' | 'unsupported' | 'error'

/** Demande la position (le navigateur affiche sa propre autorisation), puis active la météo. */
export async function enableWeather(): Promise<EnableResult> {
  if (!('geolocation' in navigator)) return 'unsupported'

  const loc = await new Promise<Loc | 'denied' | 'error'>(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: Math.round(pos.coords.latitude * 10) / 10,
        lon: Math.round(pos.coords.longitude * 10) / 10,
      }),
      err => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 3_600_000 },
    )
  })
  if (loc === 'denied' || loc === 'error') return loc

  try { localStorage.setItem(LOC_KEY, JSON.stringify(loc)) } catch { /* stockage indisponible */ }
  setFx({ weather: true })
  const weather = await refreshWeather(true)
  return weather ? 'ok' : 'error'
}

/** Désactive la météo et efface la position et les données gardées. */
export function disableWeather(): void {
  try {
    localStorage.removeItem(LOC_KEY)
    localStorage.removeItem(CACHE_KEY)
  } catch { /* stockage indisponible */ }
  setFx({ weather: false })
  publish(null)
}

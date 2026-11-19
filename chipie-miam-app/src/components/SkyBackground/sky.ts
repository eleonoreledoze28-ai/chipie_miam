import { solarPosition, sunTimes, moonPhase } from '../../utils/sun'
import type { MoonPhase } from '../../utils/sun'

/** Calculs du ciel (couleurs et positions), séparés du composant pour rester testables. */

// France métropolitaine, par défaut : la position réelle n'est connue que si la météo est activée
export const DEFAULT_LOCATION = { lat: 46.8, lon: 2.4 }

export interface Location { lat: number; lon: number }

type Stop = [elevation: number, top: string, bottom: string]

// Ciel sombre, pensé pour rester lisible derrière du texte clair
const DARK_STOPS: Stop[] = [
  [-18, '#060919', '#0b1230'],
  [-12, '#0e1334', '#1a1b45'],
  [-6,  '#1b1a4a', '#4a2f5f'],
  [-1,  '#2b2a63', '#a14f58'],
  [4,   '#27427a', '#c4784f'],
  [12,  '#1a3c6b', '#3f7396'],
  [30,  '#12315c', '#235a82'],
]

// Ciel pastel, très transparent, pour les thèmes clairs
const LIGHT_STOPS: Stop[] = [
  [-18, '#6e78c4', '#8d86c8'],
  [-6,  '#8a8fd0', '#d6a5c8'],
  [-1,  '#b9a5d6', '#f3b9a0'],
  [4,   '#a9c4ec', '#f7cfa5'],
  [12,  '#a3d1f3', '#d4ecfb'],
  [30,  '#9ccaf0', '#cfe8fa'],
]

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${c(r1, r2)}, ${c(g1, g2)}, ${c(b1, b2)})`
}

/** Couleurs du ciel (haut, bas) pour une hauteur de soleil donnée. */
export function skyColors(elevation: number, light: boolean): { top: string; bottom: string } {
  const stops = light ? LIGHT_STOPS : DARK_STOPS
  if (elevation <= stops[0][0]) return { top: stops[0][1], bottom: stops[0][2] }
  const last = stops[stops.length - 1]
  if (elevation >= last[0]) return { top: last[1], bottom: last[2] }
  for (let i = 1; i < stops.length; i++) {
    const [e1, t1, b1] = stops[i - 1]
    const [e2, t2, b2] = stops[i]
    if (elevation <= e2) {
      const f = (elevation - e1) / (e2 - e1)
      return { top: mix(t1, t2, f), bottom: mix(b1, b2, f) }
    }
  }
  return { top: last[1], bottom: last[2] }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export interface SkyState {
  elevation: number
  colors: { top: string; bottom: string }
  /** 0 (plein jour) → 1 (nuit noire) : sert pour les étoiles et les lucioles */
  darkness: number
  sun: { visible: boolean; x: number; y: number; size: number; warm: number } // x, y en % de l'écran
  moon: { visible: boolean; x: number; y: number; opacity: number; phase: MoonPhase }
}

/** Calcule tout ce qu'il faut pour dessiner le ciel à un instant donné. */
export function computeSky(now: Date, loc: Location, light: boolean): SkyState {
  const { elevation, azimuth } = solarPosition(now, loc.lat, loc.lon)
  const colors = skyColors(elevation, light)
  const darkness = clamp((-elevation + 2) / 16, 0, 1)

  // Soleil : de l'est vers l'ouest, de plus en plus haut vers midi
  const sunX = clamp(8 + ((azimuth - 60) / 240) * 84, 4, 96)
  const sunY = 66 - clamp(elevation, -8, 70) * (52 / 70)
  const nearHorizon = clamp(1 - elevation / 14, 0, 1)
  const sun = {
    visible: elevation > -6,
    x: sunX,
    y: sunY,
    size: 110 + nearHorizon * 70,
    warm: nearHorizon,
  }

  // Lune : la phase est exacte ; son trajet dans le ciel est schématique (elle suit la nuit)
  const phase = moonPhase(now)
  const times = sunTimes(now, loc.lat, loc.lon)
  const DAY = 86_400_000
  let progress = 0.5
  if (times.sunrise && times.sunset) {
    const t = now.getTime()
    let start = times.sunset.getTime()
    let end = times.sunrise.getTime() + DAY
    if (t < times.sunrise.getTime()) { start -= DAY; end -= DAY }
    progress = clamp((t - start) / (end - start), 0, 1)
  }
  const moon = {
    visible: elevation < 4,
    x: 12 + progress * 76,
    y: 66 - Math.sin(Math.PI * progress) * 46,
    opacity: clamp((4 - elevation) / 10, 0, 1),
    phase,
  }

  return { elevation, colors, darkness, sun, moon }
}

/**
 * Tracé de la partie éclairée de la lune (disque de rayon r centré en cx, cy).
 * Vu de l'hémisphère nord : croissante = éclairée à droite, décroissante = à gauche.
 */
export function moonLitPath(phase: number, cx: number, cy: number, r: number): string {
  const waxing = phase < 0.5
  const q = waxing ? phase : phase - 0.5          // 0 → 0,5 dans chaque moitié du cycle
  const rx = Math.abs(Math.cos(2 * Math.PI * phase)) * r
  // croissant (fin) ou gibbeuse (presque pleine) ? Dans la moitié décroissante, c'est l'inverse de q
  const isCrescent = waxing ? q < 0.25 : q >= 0.25
  const limbSweep = waxing ? 1 : 0                  // bord extérieur : droite (croissante) ou gauche
  // le terminateur (limite jour/nuit) est incurvé vers le bord éclairé pour un croissant, vers l'autre pour une gibbeuse
  const terminatorSweep = waxing === isCrescent ? 0 : 1
  const top = `${cx} ${cy - r}`
  const bottom = `${cx} ${cy + r}`
  return `M ${top} A ${r} ${r} 0 0 ${limbSweep} ${bottom} A ${rx.toFixed(2)} ${r} 0 0 ${terminatorSweep} ${top} Z`
}

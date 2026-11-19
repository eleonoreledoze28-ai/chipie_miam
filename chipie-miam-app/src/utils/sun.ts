/**
 * Astronomie légère (sans service en ligne) : position du soleil, lever / coucher et phase de la lune.
 * Précision : de l'ordre d'une à deux minutes pour le soleil, largement suffisante pour un décor.
 */

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

const mod = (v: number, m: number) => ((v % m) + m) % m

export interface SolarPosition {
  /** Hauteur au-dessus de l'horizon, en degrés (négative la nuit) */
  elevation: number
  /** Direction, en degrés depuis le nord vers l'est (90 = est, 180 = sud, 270 = ouest) */
  azimuth: number
}

export function solarPosition(date: Date, lat: number, lon: number): SolarPosition {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5
  const n = jd - 2_451_545.0

  const meanLongitude = mod(280.46 + 0.9856474 * n, 360)
  const meanAnomaly = mod(357.528 + 0.9856003 * n, 360) * RAD
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD
  const obliquity = (23.439 - 0.0000004 * n) * RAD

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude))

  const gmstHours = mod(18.697374558 + 24.06570982441908 * n, 24)
  const hourAngle = (gmstHours * 15 + lon) * RAD - rightAscension

  const latR = lat * RAD
  const sinElevation = Math.sin(latR) * Math.sin(declination) + Math.cos(latR) * Math.cos(declination) * Math.cos(hourAngle)
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation))) * DEG

  const azimuth = mod(
    Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(latR) - Math.tan(declination) * Math.cos(latR)) * DEG + 180,
    360,
  )

  return { elevation, azimuth }
}

export interface SunTimes {
  sunrise: Date | null // null : le soleil ne se lève pas (nuit polaire) ou ne se couche pas (jour polaire)
  sunset: Date | null
}

// Hauteur du soleil au lever et au coucher (réfraction et rayon du disque compris)
const HORIZON = -0.833

/** Lever et coucher du soleil le jour local de `date` (recherche par pas de 5 minutes puis interpolation). */
export function sunTimes(date: Date, lat: number, lon: number): SunTimes {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const step = 5 * 60_000
  let sunrise: Date | null = null
  let sunset: Date | null = null

  let prevT = start
  let prevE = solarPosition(new Date(prevT), lat, lon).elevation - HORIZON
  for (let t = start + step; t <= start + 86_400_000; t += step) {
    const e = solarPosition(new Date(t), lat, lon).elevation - HORIZON
    if (prevE < 0 && e >= 0 && !sunrise) sunrise = new Date(prevT + (step * -prevE) / (e - prevE))
    if (prevE >= 0 && e < 0 && !sunset) sunset = new Date(prevT + (step * prevE) / (prevE - e))
    prevT = t
    prevE = e
  }
  return { sunrise, sunset }
}

export interface MoonPhase {
  /** 0 = nouvelle lune, 0,25 = premier quartier, 0,5 = pleine lune, 0,75 = dernier quartier */
  phase: number
  /** Part éclairée du disque, de 0 à 1 */
  illumination: number
  name: string
}

const SYNODIC_MONTH = 29.530588853
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) // nouvelle lune du 6 janvier 2000

export function moonPhase(date: Date): MoonPhase {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000
  const phase = mod(days / SYNODIC_MONTH, 1)
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2

  let name: string
  if (phase < 0.03 || phase >= 0.97) name = 'Nouvelle lune'
  else if (phase < 0.22) name = 'Premier croissant'
  else if (phase < 0.28) name = 'Premier quartier'
  else if (phase < 0.47) name = 'Gibbeuse croissante'
  else if (phase < 0.53) name = 'Pleine lune'
  else if (phase < 0.72) name = 'Gibbeuse décroissante'
  else if (phase < 0.78) name = 'Dernier quartier'
  else name = 'Dernier croissant'

  return { phase, illumination, name }
}

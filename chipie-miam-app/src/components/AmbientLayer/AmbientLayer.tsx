import { useEffect, useState } from 'react'
import { useFx } from '../../services/fxSettings'
import { refreshWeather, useWeather } from '../../services/weather'
import styles from './AmbientLayer.module.css'

type Period = 'night' | 'dawn' | 'day' | 'dusk'

const REFRESH_MS = 30 * 60 * 1000
const HOT_C = 28
const COLD_C = 2

function periodOf(hour: number): Period {
  if (hour >= 21 || hour < 5) return 'night'
  if (hour < 8) return 'dawn'
  if (hour >= 18) return 'dusk'
  return 'day'
}

type Season = 'winter' | 'spring' | 'summer' | 'autumn'

// Saisons de l'hémisphère nord (calendrier), d'après la date du jour
function seasonOf(month: number): Season {
  if (month === 11 || month <= 1) return 'winter'
  if (month <= 4) return 'spring'
  if (month <= 7) return 'summer'
  return 'autumn'
}

const rand = (min: number, span: number) => min + Math.random() * span

// Les positions sont tirées une seule fois : elles ne doivent pas changer à chaque affichage
function makeParticles() {
  return {
    rain: Array.from({ length: 36 }, () => ({
      left: `${rand(0, 100)}%`,
      animationDelay: `-${rand(0, 1.2)}s`,
      animationDuration: `${rand(0.7, 0.5)}s`,
      height: `${rand(14, 12)}px`,
    })),
    snow: Array.from({ length: 26 }, () => ({
      left: `${rand(0, 100)}%`,
      animationDelay: `-${rand(0, 9)}s`,
      animationDuration: `${rand(6, 5)}s`,
      width: `${rand(3, 4)}px`,
      height: `${rand(3, 4)}px`,
    })),
    // pétales (printemps) ou feuilles (automne) : quelques-uns, qui tombent lentement
    drift: Array.from({ length: 9 }, (_, i) => ({
      left: `${rand(0, 96)}%`,
      animationDelay: `-${rand(0, 14)}s`,
      animationDuration: `${rand(11, 7)}s`,
      fontSize: `${rand(13, 8)}px`,
      emoji: i % 3,
    })),
    stars: Array.from({ length: 16 }, () => ({
      left: `${rand(2, 96)}%`,
      top: `${rand(1, 18)}%`,
      animationDelay: `-${rand(0, 4)}s`,
      width: `${rand(1.5, 2)}px`,
      height: `${rand(1.5, 2)}px`,
    })),
  }
}

/**
 * Ambiance visuelle par-dessus l'app (sans bloquer les touches) :
 * teinte selon l'heure, et météo réelle si l'utilisateur l'a activée.
 */
export default function AmbientLayer() {
  const fx = useFx()
  const weather = useWeather()
  const [now, setNow] = useState(() => new Date())
  const [particles] = useState(makeParticles)
  const hour = now.getHours()

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 5 * 60 * 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (!fx.weather) return
    void refreshWeather()
    const t = window.setInterval(() => { void refreshWeather() }, REFRESH_MS)
    return () => window.clearInterval(t)
  }, [fx.weather])

  if (!fx.ambient) return null

  const period = periodOf(hour)
  const kind = weather?.kind ?? null
  const raining = kind === 'rain' || kind === 'drizzle' || kind === 'storm'
  const rainCount = kind === 'drizzle' ? 14 : kind === 'rain' ? 28 : 36
  const hot = weather !== null && weather.maxC >= HOT_C
  const cold = weather !== null && weather.minC <= COLD_C
  const season = seasonOf(now.getMonth())
  const snowing = kind === 'snow'
  // Pétales et feuilles seulement par temps sec : sous la pluie ou la neige, la météo prime
  const fallingLeaves = (season === 'spring' || season === 'autumn') && !raining && !snowing
  const driftEmojis = season === 'spring' ? ['🌸', '🌼', '🌸'] : ['🍂', '🍁', '🍂']

  return (
    <div className={styles.layer} aria-hidden="true">
      <div className={`${styles.tint} ${styles[period]}`} />

      {period === 'night' && particles.stars.map((s, i) => (
        <span key={`s${i}`} className={styles.star} style={s} />
      ))}

      {season === 'summer' && period === 'day' && !raining && !snowing && <div className={styles.sun} />}
      {season === 'winter' && !snowing && <div className={styles.cold} />}
      {fallingLeaves && particles.drift.map((p, i) => (
        <span
          key={`d${i}`}
          className={styles.drift}
          style={{ left: p.left, animationDelay: p.animationDelay, animationDuration: p.animationDuration, fontSize: p.fontSize }}
        >
          {driftEmojis[p.emoji]}
        </span>
      ))}

      {kind === 'clear' && weather?.isDay && <div className={styles.sun} />}
      {kind === 'cloudy' && <div className={styles.clouds} />}
      {kind === 'fog' && <div className={styles.fog} />}
      {hot && <div className={styles.hot} />}
      {cold && !hot && <div className={styles.cold} />}

      {raining && particles.rain.slice(0, rainCount).map((d, i) => (
        <span key={`r${i}`} className={styles.drop} style={d} />
      ))}
      {kind === 'storm' && <div className={styles.flash} />}

      {kind === 'snow' && particles.snow.map((f, i) => (
        <span key={`n${i}`} className={styles.flake} style={f} />
      ))}
    </div>
  )
}

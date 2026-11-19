import { useEffect, useState } from 'react'
import { useFx } from '../../services/fxSettings'
import { refreshWeather, useWeather } from '../../services/weather'
import styles from './AmbientLayer.module.css'

type Season = 'winter' | 'spring' | 'summer' | 'autumn'

const REFRESH_MS = 30 * 60 * 1000
const HOT_C = 28
const COLD_C = 2

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
  }
}

/**
 * Par-dessus l'app (sans bloquer les touches) : pluie, orage, neige, brouillard, pétales et feuilles.
 * Le ciel, le soleil, la lune et les étoiles sont derrière le contenu (voir SkyBackground).
 */
export default function AmbientLayer() {
  const fx = useFx()
  const weather = useWeather()
  const [now, setNow] = useState(() => new Date())
  const [particles] = useState(makeParticles)

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

  const kind = weather?.kind ?? null
  const raining = kind === 'rain' || kind === 'drizzle' || kind === 'storm'
  const snowing = kind === 'snow'
  const rainCount = kind === 'drizzle' ? 14 : kind === 'rain' ? 28 : 36
  const hot = weather !== null && weather.maxC >= HOT_C
  const cold = weather !== null && weather.minC <= COLD_C
  const season = seasonOf(now.getMonth())
  // Pétales et feuilles seulement par temps sec : sous la pluie ou la neige, la météo prime
  const fallingLeaves = (season === 'spring' || season === 'autumn') && !raining && !snowing
  const driftEmojis = season === 'spring' ? ['🌸', '🌼', '🌸'] : ['🍂', '🍁', '🍂']

  return (
    <div className={styles.layer} aria-hidden="true">
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

      {kind === 'fog' && <div className={styles.fog} />}
      {hot && <div className={styles.hot} />}
      {cold && season !== 'winter' && <div className={styles.cold} />}

      {raining && particles.rain.slice(0, rainCount).map((d, i) => (
        <span key={`r${i}`} className={styles.drop} style={d} />
      ))}
      {kind === 'storm' && <div className={styles.flash} />}

      {snowing && particles.snow.map((f, i) => (
        <span key={`n${i}`} className={styles.flake} style={f} />
      ))}
    </div>
  )
}

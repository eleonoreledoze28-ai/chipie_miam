import { useEffect, useMemo, useState } from 'react'
import { useFx } from '../../services/fxSettings'
import { useWeather } from '../../services/weather'
import { useParallax } from '../../hooks/useParallax'
import { isLightTheme, useTheme } from '../../hooks/useTheme'
import { DEFAULT_LOCATION, computeSky, moonLitPath } from './sky'
import type { Location } from './sky'
import styles from './SkyBackground.module.css'

const TICK_MS = 30_000
const RAINY = new Set(['rain', 'drizzle', 'storm'])
const MOON_R = 26

const rand = (min: number, span: number) => min + Math.random() * span

// Positions tirées une seule fois (elles ne doivent pas changer à chaque affichage)
function makeScenery() {
  return {
    stars: Array.from({ length: 46 }, () => ({
      left: `${rand(1, 98)}%`,
      top: `${rand(1, 60)}%`,
      size: rand(1, 2),
      delay: `-${rand(0, 5)}s`,
      duration: `${rand(2.8, 3)}s`,
    })),
    fireflies: Array.from({ length: 10 }, () => ({
      left: `${rand(4, 92)}%`,
      top: `${rand(52, 40)}%`,
      delay: `-${rand(0, 14)}s`,
      duration: `${rand(9, 8)}s`,
      dx: Math.round(rand(-40, 80)),
      dy: Math.round(rand(-50, 70)),
    })),
    clouds: [
      { top: '10%', width: 260, height: 70, duration: 95, delay: -10 },
      { top: '24%', width: 340, height: 90, duration: 130, delay: -60 },
      { top: '42%', width: 220, height: 60, duration: 110, delay: -30 },
    ],
  }
}

function readLocation(): Location {
  try {
    const raw = localStorage.getItem('chipie_weather_loc')
    if (raw) {
      const loc = JSON.parse(raw) as Partial<Location>
      if (typeof loc.lat === 'number' && typeof loc.lon === 'number') return { lat: loc.lat, lon: loc.lon }
    }
  } catch { /* position illisible : on prend celle par défaut */ }
  return DEFAULT_LOCATION
}

/**
 * Ciel réaliste derrière toute l'app : couleurs, soleil, lune (phase exacte), étoiles, lucioles et nuages
 * suivent l'heure réelle et la météo. Il bouge légèrement avec le doigt ou l'inclinaison du téléphone.
 */
export default function SkyBackground() {
  const fx = useFx()
  const weather = useWeather()
  const { theme } = useTheme()
  const light = isLightTheme(theme)
  const [now, setNow] = useState(() => new Date())
  const [scenery] = useState(makeScenery)
  const rootRef = useParallax<HTMLDivElement>(fx.sky)

  // Mise à jour toutes les 30 s, et dès qu'on revient dans l'app
  useEffect(() => {
    if (!fx.sky) return
    const update = () => setNow(new Date())
    const timer = window.setInterval(update, TICK_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') update() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [fx.sky])

  // La position n'est connue que si la météo est activée ; sinon, France par défaut
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fx.weather sert à relire la position quand on active ou coupe la météo
  const loc = useMemo(() => readLocation(), [fx.weather])
  const sky = useMemo(() => computeSky(now, loc, light), [now, loc, light])

  if (!fx.sky) return null

  const kind = weather?.kind ?? null
  const overcast = kind === 'cloudy' || kind === 'fog' || kind === 'snow' || (kind !== null && RAINY.has(kind))
  const cloudOpacity = kind === 'storm' ? 0.7 : kind && RAINY.has(kind) ? 0.6 : overcast ? 0.5 : 0
  const sunDim = overcast ? 0.35 : 1
  const showStars = !light && sky.darkness > 0.15 && !overcast
  const month = now.getMonth()
  const warmSeason = month >= 2 && month <= 9
  const showFireflies = !light && sky.darkness > 0.3 && warmSeason && !(kind && (RAINY.has(kind) || kind === 'snow'))

  return (
    <div
      ref={rootRef}
      className={styles.sky}
      aria-hidden="true"
      style={{
        '--sky-top': sky.colors.top,
        '--sky-bottom': sky.colors.bottom,
        '--sky-alpha': light ? 0.3 : 0.94,
      } as React.CSSProperties}
    >
      <div className={styles.gradient} />

      {showStars && (
        <div className={styles.stars} style={{ opacity: Math.min(1, sky.darkness * 1.2) }}>
          {scenery.stars.map((s, i) => (
            <span
              key={i}
              className={styles.star}
              style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.duration }}
            />
          ))}
          <span className={styles.shooting} />
        </div>
      )}

      {sky.sun.visible && (
        <div
          className={styles.sunLayer}
          style={{ opacity: sunDim }}
        >
          <div
            className={styles.sun}
            style={{
              left: `${sky.sun.x}%`,
              top: `${sky.sun.y}%`,
              width: sky.sun.size,
              height: sky.sun.size,
              background: `radial-gradient(circle, rgba(255, ${Math.round(236 - sky.sun.warm * 70)}, ${Math.round(190 - sky.sun.warm * 90)}, 0.95) 0%, rgba(255, ${Math.round(190 - sky.sun.warm * 40)}, 110, 0.35) 38%, transparent 70%)`,
            }}
          />
        </div>
      )}

      {sky.moon.visible && (
        <div className={styles.moonLayer} style={{ opacity: sky.moon.opacity * (overcast ? 0.45 : 1) }}>
          <svg
            className={styles.moon}
            style={{ left: `${sky.moon.x}%`, top: `${sky.moon.y}%` }}
            viewBox="0 0 56 56"
            width="56"
            height="56"
          >
            <title>{sky.moon.phase.name}</title>
            <defs>
              <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
                <stop offset="55%" stopColor="#dfe8ff" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#dfe8ff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="28" cy="28" r="28" fill="url(#moon-glow)" />
            <circle cx="28" cy="28" r={MOON_R} fill={light ? '#8a90b8' : '#1b2144'} opacity="0.9" />
            <path d={moonLitPath(sky.moon.phase.phase, 28, 28, MOON_R)} fill="#f4f1de" />
          </svg>
        </div>
      )}

      {cloudOpacity > 0 && (
        <div className={styles.clouds} style={{ opacity: cloudOpacity }}>
          {scenery.clouds.map((c, i) => (
            <span
              key={i}
              className={styles.cloud}
              style={{ top: c.top, width: c.width, height: c.height, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
            />
          ))}
        </div>
      )}

      {showFireflies && (
        <div className={styles.fireflies} style={{ opacity: Math.min(1, sky.darkness * 1.3) }}>
          {scenery.fireflies.map((f, i) => (
            <span
              key={i}
              className={styles.firefly}
              style={{
                left: f.left, top: f.top, animationDelay: f.delay, animationDuration: f.duration,
                '--dx': `${f.dx}px`, '--dy': `${f.dy}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useFx } from '../../services/fxSettings'
import { isLightTheme, useTheme } from '../../hooks/useTheme'
import styles from './Sparkles.module.css'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number     // 1 → 0
  decay: number
  size: number
  color: string
}

const MAX_PARTICLES = 140
const TRAIL_DISTANCE = 16   // distance minimale entre deux étincelles pendant un glissement
const WHITE = '#ffffff'

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

/**
 * Étincelles qui suivent le doigt (ou la souris) et jaillissent au toucher, sur un calque transparent
 * qui ne bloque jamais les touches. Sans effet quand l'écran est immobile : rien ne tourne en continu.
 */
export default function Sparkles() {
  const fx = useFx()
  const { theme } = useTheme()
  const { pathname } = useLocation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const light = isLightTheme(theme)

  // Pas d'étincelles dans les jeux : l'écran tactile y sert à jouer
  const enabled = fx.sparkles && !pathname.startsWith('/jeu/')

  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let particles: Particle[] = []
    let raf = 0
    let lastX = -1000
    let lastY = -1000
    let dpr = 1
    let accent = '#F0A53A'

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const readAccent = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--accent-orange').trim()
      if (v) accent = v
    }

    const spawn = (x: number, y: number, count: number, spread: number) => {
      readAccent()
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * spread
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.4,
          life: 1,
          decay: 0.018 + Math.random() * 0.02,
          size: 1.2 + Math.random() * 2.4,
          color: Math.random() < 0.35 && !light ? WHITE : accent,
        })
      }
      if (particles.length > MAX_PARTICLES) particles = particles.slice(-MAX_PARTICLES)
      if (!raf) raf = requestAnimationFrame(frame)
    }

    const frame = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      ctx.globalCompositeOperation = light ? 'source-over' : 'lighter'
      particles = particles.filter(p => p.life > 0)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.03   // légère pesanteur
        p.vx *= 0.985
        p.life -= p.decay
        const a = Math.max(0, p.life)
        ctx.globalAlpha = a * 0.35
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = a * 0.95
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * a + 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = particles.length > 0 ? requestAnimationFrame(frame) : 0
      if (!raf) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }

    const onMove = (e: PointerEvent) => {
      if (!e.isPrimary || isEditable(e.target)) return
      // souris : traînée au survol ; doigt : seulement pendant un glissement
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) < TRAIL_DISTANCE) return
      lastX = e.clientX
      lastY = e.clientY
      spawn(e.clientX, e.clientY, 2, 0.9)
    }
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || isEditable(e.target)) return
      lastX = e.clientX
      lastY = e.clientY
      spawn(e.clientX, e.clientY, 9, 2.4)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      if (raf) cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }
  }, [enabled, light])

  if (!enabled) return null
  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}

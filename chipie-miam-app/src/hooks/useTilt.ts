import { useEffect, useRef } from 'react'

interface TiltOptions {
  /** Inclinaison maximale en degrés */
  max?: number
  /** À passer à false tant que l'élément n'est pas affiché ; l'effet redémarre quand il devient true */
  enabled?: boolean
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Oriente un élément (effet 3D) vers le doigt ou la souris, ou selon l'inclinaison du téléphone.
 * Le lissage et les calculs se font hors React : aucun rendu supplémentaire.
 * Expose aussi --hx / --hy (position du reflet, en %) pour un éclat de lumière en CSS.
 */
export function useTilt<T extends HTMLElement>({ max = 16, enabled = true }: TiltOptions = {}) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let targetX = 0 // -1..1 (gauche → droite)
    let targetY = 0 // -1..1 (haut → bas)
    let curX = 0
    let curY = 0
    let raf = 0

    const render = () => {
      curX += (targetX - curX) * 0.14
      curY += (targetY - curY) * 0.14
      // regarder vers la droite = bord droit vers l'observateur (rotateY négatif)
      el.style.transform = `perspective(380px) rotateX(${(curY * max).toFixed(2)}deg) rotateY(${(-curX * max).toFixed(2)}deg)`
      el.style.setProperty('--hx', `${(50 + curX * 32).toFixed(1)}%`)
      el.style.setProperty('--hy', `${(50 + curY * 32).toFixed(1)}%`)
      const settled = Math.abs(targetX - curX) < 0.002 && Math.abs(targetY - curY) < 0.002
      raf = settled ? 0 : requestAnimationFrame(render)
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(render) }

    const aimAt = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect()
      targetX = clamp((clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1)
      targetY = clamp((clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1)
      kick()
    }

    const onPointer = (e: PointerEvent) => aimAt(e.clientX, e.clientY)
    const onLeave = () => { targetX = 0; targetY = 0; kick() }
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return
      targetX = clamp(e.gamma / 35, -1, 1)
      targetY = clamp((e.beta - 50) / 35, -1, 1) // ~50° = téléphone tenu naturellement
      kick()
    }

    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    // iOS demande une autorisation pour ce capteur : on ne l'utilise que là où il est libre (Android)
    const needsPermission = typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function'
    if (!needsPermission) window.addEventListener('deviceorientation', onTilt, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('deviceorientation', onTilt)
      if (raf) cancelAnimationFrame(raf)
      el.style.transform = ''
    }
  }, [max, enabled])

  return ref
}

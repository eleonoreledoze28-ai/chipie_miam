import { useEffect, useRef } from 'react'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Déplacement de profondeur : renseigne --px et --py (de -1 à 1) sur l'élément selon la position du doigt
 * ou de la souris, ou selon l'inclinaison du téléphone. Les calques enfants s'en servent pour bouger
 * à des vitesses différentes. Calcul hors React : aucun rendu supplémentaire.
 */
export function useParallax<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let targetX = 0
    let targetY = 0
    let curX = 0
    let curY = 0
    let raf = 0

    const render = () => {
      curX += (targetX - curX) * 0.08
      curY += (targetY - curY) * 0.08
      el.style.setProperty('--px', curX.toFixed(3))
      el.style.setProperty('--py', curY.toFixed(3))
      const settled = Math.abs(targetX - curX) < 0.002 && Math.abs(targetY - curY) < 0.002
      raf = settled ? 0 : requestAnimationFrame(render)
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(render) }

    const onPointer = (e: PointerEvent) => {
      targetX = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1)
      targetY = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1)
      kick()
    }
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return
      targetX = clamp(e.gamma / 30, -1, 1)
      targetY = clamp((e.beta - 50) / 30, -1, 1) // ~50° = téléphone tenu naturellement
      kick()
    }
    // iOS demande une autorisation pour ce capteur : on ne l'utilise que là où il est libre (Android)
    const needsPermission = typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function'

    window.addEventListener('pointermove', onPointer, { passive: true })
    if (!needsPermission) window.addEventListener('deviceorientation', onTilt, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('deviceorientation', onTilt)
      if (raf) cancelAnimationFrame(raf)
      el.style.removeProperty('--px')
      el.style.removeProperty('--py')
    }
  }, [enabled])

  return ref
}

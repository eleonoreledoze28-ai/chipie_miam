import { getFx } from './fxSettings'

export type HapticKind = 'soft' | 'tap' | 'success' | 'error' | 'win'

const PATTERNS: Record<HapticKind, number | number[]> = {
  soft: 8,
  tap: 14,
  success: [18, 40, 18],
  error: [60, 40, 60],
  win: [20, 30, 20, 30, 70],
}

/** Fait vibrer le téléphone (si l'appareil le permet et si l'option est activée). */
export function haptic(kind: HapticKind): void {
  if (!getFx().haptics) return
  try { navigator.vibrate?.(PATTERNS[kind]) } catch { /* non supporté */ }
}

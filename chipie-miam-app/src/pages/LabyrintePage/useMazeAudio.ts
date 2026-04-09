import { useRef, useCallback, useMemo } from 'react'

const MUTE_KEY = 'chipie-maze-muted'

/** Tiny Web Audio synth — no external files needed */
export function useMazeAudio() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    // Resume if suspended (autoplay policy)
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])

  const isMuted = useCallback(() => {
    try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
  }, [])

  const vibrate = useCallback((pattern: number | number[]) => {
    try { navigator?.vibrate?.(pattern) } catch { /* noop */ }
  }, [])

  // ---- Sound primitives ----

  const playTone = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.12) => {
    if (isMuted()) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(vol, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch { /* audio not available */ }
  }, [getCtx, isMuted])

  const playNoise = useCallback((duration: number, vol = 0.06) => {
    if (isMuted()) return
    try {
      const ctx = getCtx()
      const bufferSize = ctx.sampleRate * duration
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5
      const src = ctx.createBufferSource()
      src.buffer = buffer
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(800, ctx.currentTime)
      gain.gain.setValueAtTime(vol, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      src.connect(filter).connect(gain).connect(ctx.destination)
      src.start(ctx.currentTime)
      src.stop(ctx.currentTime + duration)
    } catch { /* noop */ }
  }, [getCtx, isMuted])

  // ---- Game sounds ----

  const playMove = useCallback(() => {
    playTone(600, 0.06, 'sine', 0.06)
    vibrate(15)
  }, [playTone, vibrate])

  const playWallBump = useCallback(() => {
    playTone(150, 0.08, 'square', 0.04)
    vibrate(30)
  }, [playTone, vibrate])

  const playCarrot = useCallback(() => {
    playTone(880, 0.1, 'sine', 0.12)
    setTimeout(() => playTone(1100, 0.12, 'sine', 0.10), 80)
    vibrate([30, 20, 40])
  }, [playTone, vibrate])

  const playMud = useCallback(() => {
    playNoise(0.2, 0.08)
    playTone(120, 0.25, 'sawtooth', 0.06)
    vibrate(120)
  }, [playTone, playNoise, vibrate])

  const playThorn = useCallback(() => {
    playTone(200, 0.05, 'square', 0.08)
    setTimeout(() => playTone(180, 0.05, 'square', 0.06), 60)
    setTimeout(() => playTone(160, 0.08, 'square', 0.05), 120)
    vibrate([50, 30, 50, 30, 80])
  }, [playTone, vibrate])

  const playPortal = useCallback(() => {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => playTone(400 + i * 120, 0.08, 'sine', 0.08 - i * 0.01), i * 50)
    }
    vibrate([30, 20, 40, 20, 60, 20, 80])
  }, [playTone, vibrate])

  const playHint = useCallback(() => {
    playTone(660, 0.15, 'sine', 0.08)
    setTimeout(() => playTone(880, 0.2, 'sine', 0.06), 120)
    vibrate([20, 30, 20])
  }, [playTone, vibrate])

  const playWin = useCallback(() => {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, 'sine', 0.12 - i * 0.02), i * 120)
    })
    vibrate([50, 30, 50, 30, 100, 50, 150])
  }, [playTone, vibrate])

  const playLose = useCallback(() => {
    playTone(300, 0.3, 'sawtooth', 0.08)
    setTimeout(() => playTone(220, 0.4, 'sawtooth', 0.06), 200)
    setTimeout(() => playTone(160, 0.5, 'sawtooth', 0.05), 450)
    vibrate([100, 50, 200])
  }, [playTone, vibrate])

  const playTick = useCallback(() => {
    playTone(1000, 0.03, 'square', 0.04)
  }, [playTone])

  const playStart = useCallback(() => {
    playTone(440, 0.1, 'sine', 0.08)
    setTimeout(() => playTone(554, 0.1, 'sine', 0.08), 100)
    setTimeout(() => playTone(659, 0.15, 'sine', 0.10), 200)
    vibrate([30, 20, 30, 20, 50])
  }, [playTone, vibrate])

  // Return a stable object reference to avoid dependency array issues
  return useMemo(() => ({
    playMove, playWallBump, playCarrot, playMud, playThorn, playPortal,
    playHint, playWin, playLose, playTick, playStart, isMuted, vibrate,
    MUTE_KEY,
  }), [playMove, playWallBump, playCarrot, playMud, playThorn, playPortal,
    playHint, playWin, playLose, playTick, playStart, isMuted, vibrate])
}

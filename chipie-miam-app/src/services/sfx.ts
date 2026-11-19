import { getFx } from './fxSettings'

/**
 * Bruitages synthétisés avec WebAudio : aucun fichier audio à télécharger.
 * Tout est silencieux si l'option « Sons » est désactivée.
 */

export type Sfx = 'pop' | 'chime' | 'error' | 'jump' | 'collect' | 'hit' | 'brush' | 'swap'

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function audio(): AudioContext | null {
  if (!getFx().sounds) return null
  try {
    if (!ctx) {
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ac.sampleRate) return noise
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noise = buf
  return buf
}

interface ToneOpts { type?: OscillatorType; vol?: number; delay?: number; to?: number }

function tone(ac: AudioContext, freq: number, dur: number, { type = 'sine', vol = 0.18, delay = 0, to }: ToneOpts = {}) {
  const t0 = ac.currentTime + delay
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

interface BurstOpts { vol?: number; freq?: number; q?: number; delay?: number; type?: BiquadFilterType }

function burst(ac: AudioContext, dur: number, { vol = 0.22, freq = 1800, q = 1, delay = 0, type = 'bandpass' }: BurstOpts = {}) {
  const t0 = ac.currentTime + delay
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac)
  const filter = ac.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  filter.Q.value = q
  const gain = ac.createGain()
  gain.gain.setValueAtTime(vol, t0)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter).connect(gain).connect(ac.destination)
  src.start(t0, Math.random() * 0.5)
  src.stop(t0 + dur + 0.03)
}

const EFFECTS: Record<Sfx, (ac: AudioContext) => void> = {
  pop:     ac => { tone(ac, 520, 0.09, { to: 900, vol: 0.2 }) },
  chime:   ac => { [660, 880, 1320].forEach((f, i) => tone(ac, f, 0.28, { delay: i * 0.09, vol: 0.16 })) },
  error:   ac => { tone(ac, 220, 0.22, { type: 'sawtooth', to: 120, vol: 0.16 }) },
  jump:    ac => { tone(ac, 300, 0.14, { to: 640, vol: 0.16 }) },
  collect: ac => { burst(ac, 0.07, { freq: 2200, q: 1.5 }); burst(ac, 0.07, { freq: 1600, delay: 0.06 }); tone(ac, 880, 0.1, { vol: 0.08, delay: 0.03 }) },
  hit:     ac => { tone(ac, 140, 0.25, { type: 'triangle', to: 60, vol: 0.3 }); burst(ac, 0.12, { freq: 400, vol: 0.2 }) },
  brush:   ac => { burst(ac, 0.09, { freq: 3500, q: 0.7, vol: 0.07, type: 'highpass' }) },
  swap:    ac => { burst(ac, 0.12, { freq: 900, q: 0.8, vol: 0.08 }) },
}

export function playSfx(name: Sfx): void {
  const ac = audio()
  if (ac) EFFECTS[name](ac)
}

/** Ronronnement : bruit grave modulé à ~24 Hz. Renvoie une fonction pour l'arrêter en douceur. */
export function startPurr(maxMs = 2000): () => void {
  const ac = audio()
  if (!ac) return () => { /* silencieux */ }

  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac)
  src.loop = true
  const low = ac.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 380
  const amp = ac.createGain()
  amp.gain.value = 0.2 // base ; le LFO ajoute ±0.18
  const lfo = ac.createOscillator()
  lfo.frequency.value = 24
  const depth = ac.createGain()
  depth.gain.value = 0.18
  const master = ac.createGain()
  master.gain.setValueAtTime(0.0001, ac.currentTime)
  master.gain.exponentialRampToValueAtTime(1, ac.currentTime + 0.25)

  src.connect(low).connect(amp).connect(master).connect(ac.destination)
  lfo.connect(depth).connect(amp.gain)
  src.start()
  lfo.start()

  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    window.clearTimeout(timer)
    const t = ac.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t)
    master.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
    src.stop(t + 0.35)
    lfo.stop(t + 0.35)
  }
  const timer = window.setTimeout(stop, maxMs)
  return stop
}

import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './TourPage.module.css'

const CW = 320
const CH = 400
const INIT_W = 200
const INIT_H = 44
const MIN_H = 30
const MAX_H = 56
const PERFECT_TOL = 6
const MAX_LEAN = 0.07        // max tilt in radians
const GHOST_INTERVAL = 10    // ghost every N blocks
const GHOST_DURATION = 130   // frames ghost lasts
const BOMB_INTERVAL = 10     // bomb every N blocks
const MOVING_Y = 26
const BEST_KEY = 'chipie-tour-best'

const COLORS = ['#F0A53A','#4CD964','#FF9F0A','#5AC8FA','#B07CFF','#F9D64A','#FF6B6B','#48C774']
const EMOJIS = ['🥕','🌿','🍃','🥬','🌸','🍅','🌼','🫘','🫑','🌺']

function getMaxTimer(score: number) {
  if (score < 5)  return 300
  if (score < 12) return 240
  if (score < 22) return 180
  return 120
}

function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 } }
function saveBest(s: number) { const p = loadBest(); if (s > p) { localStorage.setItem(BEST_KEY, String(s)); return true } return false }

interface Block { x: number; w: number; h: number; colorIdx: number; emojiIdx: number; isBomb: boolean; rot: number }
interface Piece { x: number; y: number; w: number; h: number; vy: number; vx: number; rot: number; vrot: number; alpha: number; colorIdx: number }
interface Float { x: number; y: number; text: string; alpha: number; vy: number; color: string }

function useTowerAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    return ctxRef.current
  }, [])
  const beep = useCallback((freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.25) => {
    try {
      const ac = getCtx(); const o = ac.createOscillator(); const g = ac.createGain()
      o.connect(g); g.connect(ac.destination)
      o.type = type; o.frequency.value = freq
      g.gain.setValueAtTime(gain, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
      o.start(); o.stop(ac.currentTime + dur)
    } catch { /**/ }
  }, [getCtx])
  const playPlace   = useCallback((acc: number) => { beep(330 + acc * 200, 0.09); try { navigator.vibrate(15) } catch { /**/ } }, [beep])
  const playPerfect = useCallback(() => { beep(523,0.07); setTimeout(()=>beep(659,0.07),70); setTimeout(()=>beep(784,0.10),140); try { navigator.vibrate([15,10,30]) } catch { /**/ } }, [beep])
  const playFail    = useCallback(() => { beep(160,0.35,'sawtooth',0.2); try { navigator.vibrate([80,30,80]) } catch { /**/ } }, [beep])
  const playBomb    = useCallback(() => { beep(80,0.5,'sawtooth',0.35); beep(120,0.3,'square',0.2); try { navigator.vibrate([40,20,80,20,40]) } catch { /**/ } }, [beep])
  return { playPlace, playPerfect, playFail, playBomb }
}

type Screen = 'menu' | 'play' | 'dying' | 'end'

export default function TourPage() {
  const navigate  = useNavigate()
  const { playPlace, playPerfect, playFail, playBomb } = useTowerAudio()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef(0)

  // game state refs
  const blocksRef      = useRef<Block[]>([])
  const piecesRef      = useRef<Piece[]>([])
  const floatsRef      = useRef<Float[]>([])
  const mxRef          = useRef((CW - INIT_W) / 2)
  const mwRef          = useRef(INIT_W)
  const mhRef          = useRef(INIT_H)
  const mdirRef        = useRef(1)
  const mspeedRef      = useRef(2.5)
  const scoreRef       = useRef(0)
  const gsRef          = useRef<Screen>('menu')
  const leanRef        = useRef(0)           // tower lean angle (radians)
  const ghostFramesRef = useRef(0)           // frames remaining in ghost mode
  const timerRef       = useRef(getMaxTimer(0))
  const wantPlaceRef   = useRef(false)       // tap requested
  const isBombRef      = useRef(false)       // current moving block is bomb
  const mrotRef        = useRef(0)           // moving block tilt angle
  const balanceRef     = useRef(0)           // CoM offset ratio [-1..1]
  const topplingRef    = useRef(false)       // tower is falling over
  const frameRef       = useRef(0)           // frame counter for wobble

  const [screen,    setScreen]    = useState<Screen>('menu')
  const [dispScore, setDispScore] = useState(0)
  const [newRecord, setNewRecord] = useState(false)

  // ── helpers ──────────────────────────────────────────────────────────────
  // Returns balance ratio: 0=perfect, ±1=about to fall, >±1=falling
  function computeBalance(blocks: Block[]): number {
    if (blocks.length <= 1) return 0
    const totalMass = blocks.reduce((s, b) => s + b.w * b.h, 0)
    const com       = blocks.reduce((s, b) => s + (b.x + b.w / 2) * b.w * b.h, 0) / totalMass
    const base      = blocks[0]
    const maxOffset = base.w * 0.48   // falls when CoM exits 48% of base width
    return (com - (base.x + base.w / 2)) / maxOffset
  }

  function nextBlockDims(baseW: number, score: number) {
    const nw = score < 3 ? baseW : Math.max(22, Math.min(CW - 10, Math.round(baseW * (0.82 + Math.random() * 0.36))))
    const nh = score < 3 ? INIT_H : MIN_H + Math.floor(Math.random() * (MAX_H - MIN_H + 1))
    return { nw, nh }
  }

  function spawnExplosion(bx: number, by: number, bw: number, bh: number, ci: number, count = 6) {
    for (let k = 0; k < count; k++) {
      piecesRef.current.push({
        x: bx + Math.random() * bw,
        y: by + Math.random() * bh,
        w: 14 + Math.random() * 18,
        h: 10 + Math.random() * 14,
        vy: -3 - Math.random() * 4,
        vx: (Math.random() - 0.5) * 6,
        rot:  (Math.random() - 0.5) * 0.6,
        vrot: (Math.random() - 0.5) * 0.18,
        alpha: 1,
        colorIdx: ci,
      })
    }
  }

  const startGame = useCallback(() => {
    blocksRef.current      = [{ x: (CW - INIT_W) / 2, w: INIT_W, h: INIT_H, colorIdx: 0, emojiIdx: 0, isBomb: false, rot: 0 }]
    piecesRef.current      = []
    floatsRef.current      = []
    mxRef.current          = (CW - INIT_W) / 2
    mwRef.current          = INIT_W
    mhRef.current          = INIT_H
    mdirRef.current        = 1
    mspeedRef.current      = 2.5
    scoreRef.current       = 0
    gsRef.current          = 'play'
    leanRef.current        = 0
    ghostFramesRef.current = 0
    timerRef.current       = getMaxTimer(0)
    wantPlaceRef.current   = false
    isBombRef.current      = false
    mrotRef.current        = 0
    balanceRef.current     = 0
    topplingRef.current    = false
    frameRef.current       = 0
    setDispScore(0)
    setNewRecord(false)
    setScreen('play')
  }, [])

  const handleTap = useCallback(() => {
    if (gsRef.current !== 'play') return
    wantPlaceRef.current = true
  }, [])

  useEffect(() => {
    if (screen !== 'play' && screen !== 'dying') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function rr(x: number, y: number, w: number, h: number, r: number) {
      const R = Math.min(r, w / 2, h / 2)
      ctx!.beginPath()
      ctx!.moveTo(x + R, y)
      ctx!.lineTo(x + w - R, y); ctx!.arcTo(x + w, y, x + w, y + h, R)
      ctx!.lineTo(x + w, y + h - R); ctx!.arcTo(x + w, y + h, x, y + h, R)
      ctx!.lineTo(x + R, y + h); ctx!.arcTo(x, y + h, x, y, R)
      ctx!.lineTo(x, y + R); ctx!.arcTo(x, y, x + w, y, R)
      ctx!.closePath()
    }

    // Inline placement logic (called from loop)
    function doPlace() {
      if (gsRef.current !== 'play') return
      const blocks = blocksRef.current
      const last   = blocks[blocks.length - 1]
      const mx = mxRef.current, mw = mwRef.current, mh = mhRef.current

      const ol = Math.max(mx, last.x)
      const or_ = Math.min(mx + mw, last.x + last.w)
      const overlap = or_ - ol

      const ci = blocks.length % COLORS.length

      if (overlap <= 0) {
        spawnExplosion(mx, MOVING_Y, mw, mh, ci, 8)
        playFail()
        gsRef.current = 'dying'
        setTimeout(() => {
          const isNew = saveBest(scoreRef.current)
          setNewRecord(isNew); setDispScore(scoreRef.current)
          gsRef.current = 'end'; setScreen('end')
        }, 750)
        return
      }

      const perfect = Math.abs(mx - last.x) < PERFECT_TOL

      // Overhang pieces
      if (!perfect) {
        if (mx < last.x)
          piecesRef.current.push({ x: mx, y: MOVING_Y, w: last.x - mx, h: mh, vy: 2, vx: -1.5, rot: mrotRef.current, vrot: -0.08, alpha: 1, colorIdx: ci })
        if (mx + mw > last.x + last.w)
          piecesRef.current.push({ x: last.x + last.w, y: MOVING_Y, w: (mx + mw) - (last.x + last.w), h: mh, vy: 2, vx: 1.5, rot: mrotRef.current, vrot: 0.08, alpha: 1, colorIdx: ci })
      }

      const nb: Block = {
        x:        perfect ? last.x : ol,
        w:        perfect ? last.w : overlap,
        h:        mh,
        colorIdx: ci,
        emojiIdx: blocks.length % EMOJIS.length,
        isBomb:   isBombRef.current,
        rot:      perfect ? 0 : (Math.random() - 0.5) * 0.10,
      }

      // ── BOMB explosion ──────────────────────────────────────────────────
      if (nb.isBomb && blocks.length > 1) {
        blocksRef.current.push(nb)
        const victim = blocksRef.current[blocksRef.current.length - 2]
        // compute victim screen Y quickly
        let yAcc = MOVING_Y + nb.h
        const victimY = yAcc + nb.h  // rough position for explosion
        spawnExplosion(victim.x, victimY, victim.w, victim.h, victim.colorIdx, 12)
        blocksRef.current.splice(blocksRef.current.length - 2, 1) // remove victim
        playBomb()
        const cx = nb.x + nb.w / 2
        floatsRef.current.push({ x: cx, y: MOVING_Y + 12, text: '💥 BOOM !', alpha: 1, vy: -1.8, color: '#ff4444' })
      } else {
        blocksRef.current.push(nb)
      }

      scoreRef.current++
      setDispScore(scoreRef.current)

      // ── physics balance update ──────────────────────────────────────────
      const ratio = computeBalance(blocksRef.current)
      balanceRef.current = ratio
      leanRef.current    = ratio * MAX_LEAN

      // Topple if CoM exits the base footprint
      if (Math.abs(ratio) >= 1.0) {
        topplingRef.current = true
        gsRef.current = 'dying'
        setTimeout(() => {
          const isNew = saveBest(scoreRef.current)
          setNewRecord(isNew); setDispScore(scoreRef.current)
          gsRef.current = 'end'; setScreen('end')
        }, 1400)
        return
      }

      // ── floats ──────────────────────────────────────────────────────────
      const cx = nb.x + nb.w / 2
      if (perfect) {
        floatsRef.current.push({ x: cx, y: MOVING_Y + 10, text: '⭐ PARFAIT !', alpha: 1, vy: -1.5, color: '#f9d64a' })
        playPerfect()
      } else {
        const acc = overlap / Math.max(mw, last.w)
        playPlace(acc)
        if (scoreRef.current % 5 === 0)
          floatsRef.current.push({ x: cx, y: MOVING_Y + 10, text: `🔥 ${scoreRef.current} !`, alpha: 1, vy: -1.2, color: '#ff9f0a' })
      }

      // ── next block setup ─────────────────────────────────────────────────
      const { nw, nh } = nextBlockDims(nb.w, scoreRef.current)
      mxRef.current    = Math.max(0, Math.min(CW - nw, nb.x + (nb.w - nw) / 2))
      mwRef.current    = nw
      mhRef.current    = nh
      mspeedRef.current = Math.min(10, 2.5 + scoreRef.current * 0.22)
      timerRef.current = getMaxTimer(scoreRef.current)

      // ── ghost trigger ────────────────────────────────────────────────────
      if (scoreRef.current > 0 && scoreRef.current % GHOST_INTERVAL === 0)
        ghostFramesRef.current = GHOST_DURATION

      // ── bomb trigger ─────────────────────────────────────────────────────
      isBombRef.current = (scoreRef.current >= 5 && scoreRef.current % BOMB_INTERVAL === 0)
    }

    function loop() {
      if (gsRef.current !== 'play' && gsRef.current !== 'dying') return

      // ── Handle placement ─────────────────────────────────────────────────
      if (wantPlaceRef.current && gsRef.current === 'play') {
        wantPlaceRef.current = false
        doPlace()
      }

      frameRef.current++
      ctx!.clearRect(0, 0, CW, CH)

      // ── Topple animation ─────────────────────────────────────────────────
      if (topplingRef.current) {
        const sign = leanRef.current >= 0 ? 1 : -1
        leanRef.current += sign * (0.006 + Math.abs(leanRef.current) * 0.08)
      }

      // ── Danger wobble (warning before topple) ────────────────────────────
      const ratio = balanceRef.current
      if (!topplingRef.current && Math.abs(ratio) > 0.65) {
        const wobbleAmt = (Math.abs(ratio) - 0.65) * 0.06
        leanRef.current += Math.sin(frameRef.current * 0.18) * wobbleAmt
      }

      // ── Background ───────────────────────────────────────────────────────
      const bg = ctx!.createLinearGradient(0, 0, 0, CH)
      bg.addColorStop(0, '#0f0c29'); bg.addColorStop(1, '#1a1a3e')
      ctx!.fillStyle = bg; ctx!.fillRect(0, 0, CW, CH)

      // Danger tint when unbalanced
      if (Math.abs(ratio) > 0.55) {
        const danger = Math.min(1, (Math.abs(ratio) - 0.55) / 0.45)
        ctx!.fillStyle = `rgba(255,60,60,${danger * 0.18})`
        ctx!.fillRect(0, 0, CW, CH)
      }

      // Stars
      ctx!.fillStyle = 'rgba(255,255,255,0.45)'
      for (let i = 0; i < 20; i++) {
        ctx!.fillRect(((i * 73.1 + 11.3) % 1) * CW, ((i * 47.7 + 3.1) % 1) * CH, 1.5, 1.5)
      }

      // ── Timer bar ────────────────────────────────────────────────────────
      if (gsRef.current === 'play') {
        const maxT = getMaxTimer(scoreRef.current)
        const pct  = timerRef.current / maxT
        // BG
        ctx!.fillStyle = 'rgba(255,255,255,0.08)'
        ctx!.fillRect(0, 0, CW, 5)
        // Fill
        const tc = pct > 0.5 ? '#4CD964' : pct > 0.25 ? '#FF9F0A' : '#FF6B6B'
        ctx!.fillStyle = tc
        ctx!.fillRect(0, 0, CW * pct, 5)

        // ── Countdown ──────────────────────────────────────────────────────
        timerRef.current = Math.max(0, timerRef.current - 1)
        if (timerRef.current === 0) wantPlaceRef.current = true
      }

      const blocks = blocksRef.current
      const n = blocks.length

      // ── Compute variable-height Y positions ───────────────────────────────
      const blockY: number[] = new Array(n)
      if (n > 0) {
        blockY[n - 1] = MOVING_Y + mhRef.current
        for (let i = n - 2; i >= 0; i--) blockY[i] = blockY[i + 1] + blocks[i + 1].h
      }

      // ── Apply lean transform ──────────────────────────────────────────────
      ctx!.save()
      ctx!.translate(CW / 2, CH)
      ctx!.rotate(leanRef.current)
      ctx!.translate(-CW / 2, -CH)

      // ── Placed blocks ─────────────────────────────────────────────────────
      for (let i = 0; i < n; i++) {
        const b  = blocks[i]
        const sy = blockY[i]
        if (sy > CH + b.h || sy + b.h < -10) continue

        const color = b.isBomb ? '#FF3333' : COLORS[b.colorIdx]
        const cx = b.x + b.w / 2, cy = sy + b.h / 2

        ctx!.save()
        ctx!.translate(cx, cy); ctx!.rotate(b.rot); ctx!.translate(-cx, -cy)

        ctx!.fillStyle = 'rgba(0,0,0,0.28)'
        rr(b.x + 3, sy + 3, b.w, b.h, 8); ctx!.fill()

        ctx!.fillStyle = color
        rr(b.x, sy, b.w, b.h, 8); ctx!.fill()

        ctx!.fillStyle = 'rgba(255,255,255,0.13)'
        rr(b.x + 2, sy + 2, b.w - 4, Math.min(14, b.h * 0.4), 5); ctx!.fill()

        if (b.w >= 26) {
          ctx!.font = `${Math.min(20, b.w * 0.28)}px serif`
          ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
          ctx!.fillText(b.isBomb ? '💣' : EMOJIS[b.emojiIdx], cx, cy)
        }
        ctx!.restore()
      }

      // ── Moving block ──────────────────────────────────────────────────────
      if (gsRef.current === 'play') {
        const mx = mxRef.current, mw = mwRef.current, mh = mhRef.current
        const mc = isBombRef.current ? '#FF3333' : COLORS[n % COLORS.length]

        // Smooth tilt toward movement direction
        const targetRot = mdirRef.current * 0.09
        mrotRef.current += (targetRot - mrotRef.current) * 0.07

        // Ghost flicker
        const ghostAlpha = ghostFramesRef.current > 0
          ? 0.12 + 0.18 * Math.abs(Math.sin(ghostFramesRef.current * 0.25))
          : 1
        if (ghostFramesRef.current > 0) ghostFramesRef.current--

        const mcx = mx + mw / 2, mcy = MOVING_Y + mh / 2
        ctx!.save()
        ctx!.translate(mcx, mcy); ctx!.rotate(mrotRef.current); ctx!.translate(-mcx, -mcy)

        ctx!.globalAlpha = ghostAlpha
        ctx!.shadowColor = mc; ctx!.shadowBlur = 14
        ctx!.fillStyle   = mc
        rr(mx, MOVING_Y, mw, mh, 8); ctx!.fill()
        ctx!.shadowBlur  = 0

        ctx!.fillStyle = 'rgba(255,255,255,0.18)'
        rr(mx + 2, MOVING_Y + 2, mw - 4, Math.min(14, mh * 0.4), 5); ctx!.fill()

        if (mw >= 26) {
          ctx!.font = `${Math.min(20, mw * 0.28)}px serif`
          ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
          ctx!.fillText(isBombRef.current ? '💣' : EMOJIS[n % EMOJIS.length], mcx, mcy)
        }
        ctx!.globalAlpha = 1
        ctx!.restore()

        // Move block
        mxRef.current += mdirRef.current * mspeedRef.current
        if (mxRef.current <= 0)            { mxRef.current = 0;             mdirRef.current =  1 }
        if (mxRef.current + mwRef.current >= CW) { mxRef.current = CW - mwRef.current; mdirRef.current = -1 }
      }

      ctx!.restore() // end lean transform

      // ── Balance meter ────────────────────────────────────────────────────
      if (!topplingRef.current) {
        const meterW = 140, meterH = 8
        const meterX = (CW - meterW) / 2, meterY = CH - 18
        const clampedRatio = Math.max(-1, Math.min(1, ratio))
        const danger = Math.abs(clampedRatio)

        // Track
        ctx!.fillStyle = 'rgba(255,255,255,0.08)'
        ctx!.beginPath(); ctx!.roundRect(meterX, meterY, meterW, meterH, 4); ctx!.fill()

        // Danger zones (left & right red)
        ctx!.fillStyle = 'rgba(255,80,80,0.25)'
        ctx!.beginPath(); ctx!.roundRect(meterX, meterY, meterW * 0.18, meterH, [4,0,0,4]); ctx!.fill()
        ctx!.beginPath(); ctx!.roundRect(meterX + meterW * 0.82, meterY, meterW * 0.18, meterH, [0,4,4,0]); ctx!.fill()

        // Indicator dot
        const dotX = meterX + meterW / 2 + clampedRatio * (meterW / 2 - 6)
        const dotColor = danger < 0.55 ? '#4CD964' : danger < 0.80 ? '#FF9F0A' : '#FF4444'
        ctx!.fillStyle = dotColor
        ctx!.shadowColor = dotColor; ctx!.shadowBlur = danger > 0.6 ? 8 : 0
        ctx!.beginPath(); ctx!.arc(dotX, meterY + meterH / 2, 6, 0, Math.PI * 2); ctx!.fill()
        ctx!.shadowBlur = 0

        // Label
        if (danger > 0.55) {
          ctx!.globalAlpha = 0.7 + 0.3 * Math.abs(Math.sin(frameRef.current * 0.15))
          ctx!.fillStyle   = dotColor
          ctx!.font        = 'bold 10px sans-serif'
          ctx!.textAlign   = 'center'; ctx!.textBaseline = 'bottom'
          ctx!.fillText(danger > 0.80 ? '⚠️ DANGER !' : '⚠️ Instable', CW / 2, meterY - 2)
          ctx!.globalAlpha = 1
        }
      }

      // ── Falling pieces (outside lean) ──────────────────────────────────
      piecesRef.current = piecesRef.current.filter(p => p.alpha > 0 && p.y < CH + 80)
      for (const p of piecesRef.current) {
        const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2
        ctx!.save()
        ctx!.translate(pcx, pcy); ctx!.rotate(p.rot); ctx!.translate(-pcx, -pcy)
        ctx!.globalAlpha = p.alpha
        ctx!.fillStyle   = COLORS[p.colorIdx]
        rr(p.x, p.y, p.w, p.h, 5); ctx!.fill()
        ctx!.restore()
        ctx!.globalAlpha = 1
        p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.rot += p.vrot; p.alpha -= 0.026
      }

      // ── Float texts ───────────────────────────────────────────────────
      floatsRef.current = floatsRef.current.filter(f => f.alpha > 0)
      for (const f of floatsRef.current) {
        ctx!.globalAlpha = f.alpha
        ctx!.fillStyle   = f.color
        ctx!.font        = 'bold 14px sans-serif'
        ctx!.textAlign   = 'center'; ctx!.textBaseline = 'top'
        ctx!.fillText(f.text, f.x, f.y)
        ctx!.globalAlpha = 1
        f.y += f.vy; f.alpha -= 0.022
      }

      // ── Ghost warning ─────────────────────────────────────────────────
      if (ghostFramesRef.current > 0 && ghostFramesRef.current > GHOST_DURATION - 40) {
        ctx!.globalAlpha = (GHOST_DURATION - ghostFramesRef.current) / 40
        ctx!.fillStyle   = '#B07CFF'
        ctx!.font        = 'bold 12px sans-serif'
        ctx!.textAlign   = 'center'; ctx!.textBaseline = 'top'
        ctx!.fillText('👻 Bloc fantôme !', CW / 2, 10)
        ctx!.globalAlpha = 1
      }

      // ── Bomb warning ─────────────────────────────────────────────────
      if (isBombRef.current) {
        ctx!.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() * 0.008))
        ctx!.fillStyle   = '#FF3333'
        ctx!.font        = 'bold 11px sans-serif'
        ctx!.textAlign   = 'center'; ctx!.textBaseline = 'top'
        ctx!.fillText('💣 BOMBE !', CW / 2, 10)
        ctx!.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [screen, playPlace, playPerfect, playFail, playBomb])

  const best = loadBest()

  if (screen === 'menu') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
        Retour
      </button>
      <div className={styles.menuScreen}>
        <span className={styles.menuEmoji}>🏗️</span>
        <h1 className={styles.menuTitle}>Tour de légumes</h1>
        <p className={styles.menuSub}>Empile le plus haut possible !</p>
        <div className={styles.rules}>
          <div className={styles.rule}><span>👆</span>Tape pour poser le bloc</div>
          <div className={styles.rule}><span>⏱️</span>Pose avant que le chrono expire</div>
          <div className={styles.rule}><span>👻</span>Tous les 10 blocs : bloc fantôme !</div>
          <div className={styles.rule}><span>💣</span>Bombe tous les 10 blocs — détruit un bloc !</div>
          <div className={styles.rule}><span>⭐</span>Placement parfait = taille conservée</div>
        </div>
        {best > 0 && <div className={styles.menuBest}>Record : {best} blocs</div>}
        <button className={styles.playBtn} onClick={startGame}>Jouer</button>
      </div>
    </div>
  )

  if (screen === 'end') return (
    <div className={styles.page}>
      <div className={styles.endScreen}>
        <span className={styles.endEmoji}>{dispScore >= 20 ? '🏆' : dispScore >= 10 ? '🎉' : '💪'}</span>
        <h2 className={styles.endTitle}>La tour s'effondre !</h2>
        {newRecord && <div className={styles.newRecord}>Nouveau record !</div>}
        <div className={styles.endStats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{dispScore}</span>
            <span className={styles.statLabel}>blocs empilés</span>
          </div>
        </div>
        {best > 0 && !newRecord && <div className={styles.endRecord}>Record : {best} blocs</div>}
        <div className={styles.endActions}>
          <button className={styles.playBtn} onClick={startGame}>Rejouer</button>
          <button className={styles.menuBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.hud}>
        <span className={styles.hudScore}>{dispScore} bloc{dispScore !== 1 ? 's' : ''}</span>
        {isBombRef.current && <span className={styles.hudBomb}>💣 BOMBE</span>}
        {ghostFramesRef.current > 0 && <span className={styles.hudGhost}>👻 FANTÔME</span>}
      </div>
      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className={styles.canvas}
          onClick={handleTap}
          onTouchEnd={e => { e.preventDefault(); handleTap() }}
        />
      </div>
      <p className={styles.hint}>Tape pour poser le bloc !</p>
    </div>
  )
}

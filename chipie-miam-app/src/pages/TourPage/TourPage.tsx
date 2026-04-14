import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './TourPage.module.css'

const CW = 320
const CH = 400
const BLOCK_H = 44
const INIT_W = 200
const MOVING_Y = 28
const PERFECT_TOL = 6
const BEST_KEY = 'chipie-tour-best'

const COLORS = ['#F0A53A', '#4CD964', '#FF9F0A', '#5AC8FA', '#B07CFF', '#F9D64A', '#FF6B6B', '#48C774']
const EMOJIS = ['🥕', '🌿', '🍃', '🥬', '🌸', '🍅', '🌼', '🫘', '🫑', '🌺']

function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 } }
function saveBest(s: number) { const p = loadBest(); if (s > p) { localStorage.setItem(BEST_KEY, String(s)); return true } return false }

interface Block { x: number; w: number; colorIdx: number; emojiIdx: number }
interface Piece { x: number; y: number; w: number; vy: number; alpha: number; colorIdx: number }
interface Float { x: number; y: number; text: string; alpha: number; vy: number; color: string }

function useTowerAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    return ctxRef.current
  }, [])
  const beep = useCallback((freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.25) => {
    try {
      const ac = getCtx(); const osc = ac.createOscillator(); const g = ac.createGain()
      osc.connect(g); g.connect(ac.destination)
      osc.type = type; osc.frequency.value = freq
      g.gain.setValueAtTime(gain, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
      osc.start(); osc.stop(ac.currentTime + dur)
    } catch { /* */ }
  }, [getCtx])
  const playPlace = useCallback((accuracy: number) => {
    beep(330 + accuracy * 200, 0.09)
    try { navigator.vibrate(15) } catch { /* */ }
  }, [beep])
  const playPerfect = useCallback(() => {
    beep(523, 0.07); setTimeout(() => beep(659, 0.07), 70); setTimeout(() => beep(784, 0.10), 140)
    try { navigator.vibrate([15, 10, 30]) } catch { /* */ }
  }, [beep])
  const playFail = useCallback(() => {
    beep(160, 0.35, 'sawtooth', 0.2)
    try { navigator.vibrate([80, 30, 80]) } catch { /* */ }
  }, [beep])
  return { playPlace, playPerfect, playFail }
}

type Screen = 'menu' | 'play' | 'dying' | 'end'

export default function TourPage() {
  const navigate = useNavigate()
  const { playPlace, playPerfect, playFail } = useTowerAudio()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  const blocksRef = useRef<Block[]>([])
  const piecesRef = useRef<Piece[]>([])
  const floatsRef = useRef<Float[]>([])
  const mxRef = useRef((CW - INIT_W) / 2)
  const mwRef = useRef(INIT_W)
  const mdirRef = useRef(1)
  const mspeedRef = useRef(2.5)
  const scoreRef = useRef(0)
  const gsRef = useRef<Screen>('menu')

  const [screen, setScreen] = useState<Screen>('menu')
  const [dispScore, setDispScore] = useState(0)
  const [newRecord, setNewRecord] = useState(false)

  const startGame = useCallback(() => {
    blocksRef.current = [{ x: (CW - INIT_W) / 2, w: INIT_W, colorIdx: 0, emojiIdx: 0 }]
    piecesRef.current = []
    floatsRef.current = []
    mxRef.current = (CW - INIT_W) / 2
    mwRef.current = INIT_W
    mdirRef.current = 1
    mspeedRef.current = 2.5
    scoreRef.current = 0
    gsRef.current = 'play'
    setDispScore(0)
    setNewRecord(false)
    setScreen('play')
  }, [])

  const handleTap = useCallback(() => {
    if (gsRef.current !== 'play') return

    const blocks = blocksRef.current
    const last = blocks[blocks.length - 1]
    const mx = mxRef.current
    const mw = mwRef.current

    const ol = Math.max(mx, last.x)
    const or_ = Math.min(mx + mw, last.x + last.w)
    const overlap = or_ - ol

    if (overlap <= 0) {
      piecesRef.current.push({ x: mx, y: MOVING_Y, w: mw, vy: 2, alpha: 1, colorIdx: blocks.length % COLORS.length })
      playFail()
      gsRef.current = 'dying'
      setTimeout(() => {
        const isNew = saveBest(scoreRef.current)
        setNewRecord(isNew)
        setDispScore(scoreRef.current)
        gsRef.current = 'end'
        setScreen('end')
      }, 750)
      return
    }

    const perfect = Math.abs(mx - last.x) < PERFECT_TOL

    // Spawn falling overhang pieces
    const ci = blocks.length % COLORS.length
    if (!perfect) {
      if (mx < last.x) piecesRef.current.push({ x: mx, y: MOVING_Y, w: last.x - mx, vy: 2, alpha: 1, colorIdx: ci })
      if (mx + mw > last.x + last.w) piecesRef.current.push({ x: last.x + last.w, y: MOVING_Y, w: (mx + mw) - (last.x + last.w), vy: 2, alpha: 1, colorIdx: ci })
    }

    const nb: Block = {
      x: perfect ? last.x : ol,
      w: perfect ? last.w : overlap,
      colorIdx: ci,
      emojiIdx: blocks.length % EMOJIS.length,
    }
    blocksRef.current.push(nb)
    scoreRef.current++

    const cx = nb.x + nb.w / 2
    if (perfect) {
      floatsRef.current.push({ x: cx, y: MOVING_Y + 12, text: '⭐ PARFAIT !', alpha: 1, vy: -1.5, color: '#f9d64a' })
      playPerfect()
    } else {
      const acc = overlap / Math.max(mw, last.w)
      playPlace(acc)
      if (scoreRef.current % 5 === 0)
        floatsRef.current.push({ x: cx, y: MOVING_Y + 12, text: `🔥 ${scoreRef.current} !`, alpha: 1, vy: -1.2, color: '#ff9f0a' })
    }

    mxRef.current = nb.x
    mwRef.current = nb.w
    mspeedRef.current = Math.min(9, 2.5 + scoreRef.current * 0.2)
    setDispScore(scoreRef.current)
  }, [playPlace, playPerfect, playFail])

  useEffect(() => {
    if (screen !== 'play' && screen !== 'dying') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx!.beginPath()
      ctx!.moveTo(x + r, y)
      ctx!.lineTo(x + w - r, y); ctx!.arcTo(x + w, y, x + w, y + h, r)
      ctx!.lineTo(x + w, y + h - r); ctx!.arcTo(x + w, y + h, x, y + h, r)
      ctx!.lineTo(x + r, y + h); ctx!.arcTo(x, y + h, x, y, r)
      ctx!.lineTo(x, y + r); ctx!.arcTo(x, y, x + w, y, r)
      ctx!.closePath()
    }

    function loop() {
      if (gsRef.current !== 'play' && gsRef.current !== 'dying') return
      ctx!.clearRect(0, 0, CW, CH)

      // Background
      const bg = ctx!.createLinearGradient(0, 0, 0, CH)
      bg.addColorStop(0, '#0f0c29')
      bg.addColorStop(1, '#1a1a3e')
      ctx!.fillStyle = bg
      ctx!.fillRect(0, 0, CW, CH)

      // Stars
      ctx!.fillStyle = 'rgba(255,255,255,0.5)'
      for (let i = 0; i < 18; i++) {
        const sx = ((i * 73.1 + 11.3) % 1) * CW
        const sy = ((i * 47.7 + 3.1) % 1) * CH
        ctx!.fillRect(sx, sy, 1.5, 1.5)
      }

      const blocks = blocksRef.current
      const n = blocks.length

      // Placed blocks
      for (let i = 0; i < n; i++) {
        const b = blocks[i]
        const sy = MOVING_Y + BLOCK_H * (n - i)
        if (sy > CH + BLOCK_H || sy < -BLOCK_H) continue

        ctx!.fillStyle = 'rgba(0,0,0,0.3)'
        rr(b.x + 3, sy + 3, b.w, BLOCK_H, 8); ctx!.fill()

        ctx!.fillStyle = COLORS[b.colorIdx]
        rr(b.x, sy, b.w, BLOCK_H, 8); ctx!.fill()

        ctx!.fillStyle = 'rgba(255,255,255,0.13)'
        rr(b.x + 2, sy + 2, b.w - 4, 14, 5); ctx!.fill()

        if (b.w >= 28) {
          ctx!.font = `${Math.min(20, b.w * 0.28)}px serif`
          ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
          ctx!.fillText(EMOJIS[b.emojiIdx], b.x + b.w / 2, sy + BLOCK_H / 2)
        }
      }

      // Moving block (only during 'play')
      if (gsRef.current === 'play') {
        const mx = mxRef.current
        const mw = mwRef.current
        const mc = COLORS[n % COLORS.length]

        ctx!.shadowColor = mc; ctx!.shadowBlur = 14
        ctx!.fillStyle = mc
        rr(mx, MOVING_Y, mw, BLOCK_H, 8); ctx!.fill()
        ctx!.shadowBlur = 0

        ctx!.fillStyle = 'rgba(255,255,255,0.18)'
        rr(mx + 2, MOVING_Y + 2, mw - 4, 14, 5); ctx!.fill()

        if (mw >= 28) {
          ctx!.font = `${Math.min(20, mw * 0.28)}px serif`
          ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
          ctx!.fillText(EMOJIS[n % EMOJIS.length], mx + mw / 2, MOVING_Y + BLOCK_H / 2)
        }

        // Move block
        mxRef.current += mdirRef.current * mspeedRef.current
        if (mxRef.current <= 0) { mxRef.current = 0; mdirRef.current = 1 }
        if (mxRef.current + mwRef.current >= CW) { mxRef.current = CW - mwRef.current; mdirRef.current = -1 }
      }

      // Falling pieces
      piecesRef.current = piecesRef.current.filter(p => p.alpha > 0 && p.y < CH + 60)
      for (const p of piecesRef.current) {
        ctx!.globalAlpha = p.alpha
        ctx!.fillStyle = COLORS[p.colorIdx]
        rr(p.x, p.y, p.w, BLOCK_H - 4, 6); ctx!.fill()
        ctx!.globalAlpha = 1
        p.y += p.vy; p.vy += 0.45; p.alpha -= 0.028
      }

      // Float texts
      floatsRef.current = floatsRef.current.filter(f => f.alpha > 0)
      for (const f of floatsRef.current) {
        ctx!.globalAlpha = f.alpha
        ctx!.fillStyle = f.color
        ctx!.font = 'bold 13px sans-serif'
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'top'
        ctx!.fillText(f.text, f.x, f.y)
        ctx!.globalAlpha = 1
        f.y += f.vy; f.alpha -= 0.022
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [screen])

  const best = loadBest()

  if (screen === 'menu') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Retour
      </button>
      <div className={styles.menuScreen}>
        <span className={styles.menuEmoji}>🏗️</span>
        <h1 className={styles.menuTitle}>Tour de légumes</h1>
        <p className={styles.menuSub}>Empile le plus haut possible !</p>
        <div className={styles.rules}>
          <div className={styles.rule}><span>👆</span> Tape pour poser le bloc</div>
          <div className={styles.rule}><span>✂️</span> L'excédent tombe — le bloc rétrécit</div>
          <div className={styles.rule}><span>⭐</span> Placement parfait = taille conservée</div>
          <div className={styles.rule}><span>💀</span> Rate complètement → c'est fini !</div>
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

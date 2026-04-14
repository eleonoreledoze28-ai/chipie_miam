import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import styles from './CoursePage.module.css'

// Canvas dimensions
const CW = 360
const CH = 210
const GROUND_Y = 168
const CHIPIE_X = 55
const CHIPIE_W = 32
const CHIPIE_H = 32
const JUMP_FORCE   = 12
const JUMP_FORCE_2 = 9   // double jump
const GRAVITY = 0.6
const OBS_R = 16
const GOOD_HEIGHT = 64
const BEST_KEY = 'chipie-course-best'

function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 } }

// Static stars in the sky
const STARS = [
  {x:18,y:12,r:1.2},{x:52,y:7,r:1},{x:88,y:22,r:0.8},{x:128,y:11,r:1.2},
  {x:172,y:5,r:0.9},{x:208,y:26,r:1},{x:248,y:9,r:1.3},{x:288,y:19,r:0.8},
  {x:320,y:4,r:1},{x:344,y:17,r:1.2},{x:68,y:38,r:0.7},{x:194,y:34,r:0.8},
  {x:310,y:42,r:0.9},{x:140,y:45,r:0.7},{x:76,y:18,r:0.9},{x:238,y:44,r:0.6},
]

interface Cloud    { x:number; y:number; w:number; h:number; sf:number }
interface Obs      { id:number; x:number; kind:'bad'|'good'; emoji:string; collected:boolean }
interface Particle { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; color:string; r:number }
interface FloatTxt { x:number; y:number; text:string; life:number; maxLife:number }

type Screen = 'menu'|'play'|'end'

const CAT_EMOJI: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c.emoji])
)

// ===== Audio =====
function useRunnerAudio() {
  const ctxRef = useRef<AudioContext|null>(null)
  const getCtx = useCallback(() => {
    if (!ctxRef.current)
      ctxRef.current = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)()
    return ctxRef.current
  }, [])
  const beep = useCallback((freq:number, dur:number, type:OscillatorType='sine', vol=0.22) => {
    try {
      const ac = getCtx()
      const osc = ac.createOscillator(), gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = type; osc.frequency.value = freq
      gain.gain.setValueAtTime(vol, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
      osc.start(); osc.stop(ac.currentTime + dur)
    } catch { /* ignore */ }
  }, [getCtx])
  const playJump    = useCallback(() => { beep(440,0.07); setTimeout(()=>beep(560,0.06),55) }, [beep])
  const playJump2   = useCallback(() => { beep(560,0.07); setTimeout(()=>beep(720,0.06),55) }, [beep])
  const playCollect = useCallback(() => {
    beep(660,0.06); setTimeout(()=>beep(880,0.1),60)
    try { navigator.vibrate(30) } catch { /* ignore */ }
  }, [beep])
  const playCombo   = useCallback(() => {
    beep(523,0.06); setTimeout(()=>beep(659,0.06),65); setTimeout(()=>beep(784,0.12),130)
    try { navigator.vibrate([25,15,25]) } catch { /* ignore */ }
  }, [beep])
  const playHit     = useCallback(() => {
    beep(160,0.22,'sawtooth',0.3)
    try { navigator.vibrate([80,30,80]) } catch { /* ignore */ }
  }, [beep])
  return { playJump, playJump2, playCollect, playCombo, playHit }
}

export default function CoursePage() {
  const navigate  = useNavigate()
  const audio     = useRunnerAudio()
  const audioRef  = useRef(audio)
  useEffect(() => { audioRef.current = audio }, [audio])

  const goodPool = useMemo(() =>
    VEGETAUX.filter(v => v.restriction === 'aucune').map(v => CAT_EMOJI[v.categorie] ?? '🌱'), [])
  const badPool  = useMemo(() =>
    VEGETAUX.filter(v => v.restriction === 'a_eviter').map(v => CAT_EMOJI[v.categorie] ?? '☠️'), [])

  const [screen,    setScreen]    = useState<Screen>('menu')
  const [dispScore, setDispScore] = useState(0)
  const [dispLives, setDispLives] = useState(3)
  const [dispCombo, setDispCombo] = useState(0)
  const [newRecord, setNewRecord] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // All game state in refs (avoid per-frame re-renders)
  const chipieY   = useRef(0)
  const chipieVY  = useRef(0)
  const onGround  = useRef(true)
  const jumpsUsed = useRef(0)
  const hitBlink  = useRef(0)
  const obs       = useRef<Obs[]>([])
  const particles = useRef<Particle[]>([])
  const floatTxts = useRef<FloatTxt[]>([])
  const score     = useRef(0)
  const lives     = useRef(3)
  const combo     = useRef(0)
  const speed     = useRef(3)
  const frame     = useRef(0)
  const nextObs   = useRef(90)
  const obsId     = useRef(0)
  const active    = useRef(false)
  const raf       = useRef<number|null>(null)
  const flash     = useRef<{kind:'good'|'bad'; f:number}|null>(null)
  const groundOff = useRef(0)

  // Clouds persist between games (purely decorative)
  const cloudsRef = useRef<Cloud[]>([
    {x:50,  y:22, w:42, h:14, sf:0.2},
    {x:155, y:36, w:28, h:10, sf:0.25},
    {x:262, y:17, w:52, h:17, sf:0.18},
    {x:340, y:44, w:24, h:9,  sf:0.30},
    {x:430, y:26, w:36, h:12, sf:0.22},
  ])

  const endGame = useCallback(() => {
    active.current = false
    if (raf.current) cancelAnimationFrame(raf.current)
    const prev = loadBest()
    const isRecord = score.current > prev
    if (isRecord) localStorage.setItem(BEST_KEY, String(score.current))
    setNewRecord(isRecord)
    setScreen('end')
  }, [])

  const jump = useCallback(() => {
    if (jumpsUsed.current >= 2) return
    const second = jumpsUsed.current === 1
    chipieVY.current = second ? JUMP_FORCE_2 : JUMP_FORCE
    onGround.current = false
    jumpsUsed.current++
    if (second) {
      audioRef.current.playJump2()
      // Dust puff
      for (let i = 0; i < 6; i++) {
        particles.current.push({
          x: CHIPIE_X + CHIPIE_W / 2 + (Math.random() - 0.5) * 22,
          y: GROUND_Y - chipieY.current - CHIPIE_H / 2,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * -1.2 - 0.2,
          life: 14 + Math.floor(Math.random() * 8), maxLife: 22,
          color: 'rgba(200,210,230,0.85)', r: 2.5 + Math.random() * 2.5,
        })
      }
    } else {
      audioRef.current.playJump()
    }
  }, [])

  const spawnObs = useCallback(() => {
    const isBad = Math.random() < 0.55
    const pool = isBad ? badPool : goodPool
    obs.current.push({
      id: obsId.current++,
      x: CW + OBS_R,
      kind: isBad ? 'bad' : 'good',
      emoji: pool[Math.floor(Math.random() * pool.length)],
      collected: false,
    })
  }, [badPool, goodPool])

  const startGame = useCallback(() => {
    chipieY.current = 0; chipieVY.current = 0; onGround.current = true
    jumpsUsed.current = 0; hitBlink.current = 0
    obs.current = []; particles.current = []; floatTxts.current = []
    score.current = 0; lives.current = 3; combo.current = 0
    speed.current = 3; frame.current = 0; nextObs.current = 90
    active.current = true; flash.current = null; groundOff.current = 0
    setDispScore(0); setDispLives(3); setDispCombo(0); setNewRecord(false)
    setScreen('play')
  }, [])

  // ===== Game loop =====
  useEffect(() => {
    if (screen !== 'play') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function spawnParticles(x:number, y:number, good:boolean) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const s = 1.5 + Math.random() * 2.5
        particles.current.push({
          x, y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2,
          life: 20 + Math.floor(Math.random() * 12), maxLife: 32,
          color: good ? (i % 2 === 0 ? '#4cd964' : '#f9d64a') : 'rgba(255,100,80,0.75)',
          r: 2 + Math.random() * 2.5,
        })
      }
    }

    function spawnFloat(x:number, y:number, text:string) {
      floatTxts.current.push({x, y, text, life: 44, maxLife: 44})
    }

    function drawCloud(c:Cloud, alpha:number) {
      const c2 = ctx!
      c2.save()
      c2.globalAlpha = alpha
      c2.fillStyle = 'rgba(255,255,255,0.9)'
      c2.beginPath(); c2.ellipse(c.x, c.y, c.w*0.5, c.h*0.5, 0, 0, Math.PI*2); c2.fill()
      c2.beginPath(); c2.ellipse(c.x - c.w*0.28, c.y + c.h*0.08, c.w*0.32, c.h*0.42, 0, 0, Math.PI*2); c2.fill()
      c2.beginPath(); c2.ellipse(c.x + c.w*0.30, c.y + c.h*0.12, c.w*0.28, c.h*0.36, 0, 0, Math.PI*2); c2.fill()
      c2.restore()
    }

    function update() {
      frame.current++
      groundOff.current = (groundOff.current + speed.current) % 28

      // Clouds scroll
      for (const c of cloudsRef.current) {
        c.x -= speed.current * c.sf
        if (c.x < -90) c.x = CW + 90
      }

      // Chipie physics
      chipieVY.current -= GRAVITY
      chipieY.current  += chipieVY.current
      if (chipieY.current <= 0) {
        chipieY.current = 0; chipieVY.current = 0
        onGround.current = true; jumpsUsed.current = 0
      }

      // Spawn obstacles
      if (frame.current >= nextObs.current) {
        spawnObs()
        const gap = Math.max(50, 90 - Math.floor(speed.current) * 5) + Math.floor(Math.random() * 25)
        nextObs.current = frame.current + gap
      }

      // Move obstacles
      for (const o of obs.current) o.x -= speed.current

      // Collision (slightly forgiving hitbox)
      const cLeft  = CHIPIE_X + 5
      const cRight = CHIPIE_X + CHIPIE_W - 5
      const cBot   = GROUND_Y - chipieY.current
      const cTop   = cBot - CHIPIE_H + 5

      for (const o of obs.current) {
        if (o.collected) continue
        const oCY = o.kind === 'bad' ? GROUND_Y - OBS_R : GROUND_Y - GOOD_HEIGHT
        const xOvlp = cRight > o.x - OBS_R + 5 && cLeft < o.x + OBS_R - 5
        const yOvlp = cBot   > oCY  - OBS_R + 5 && cTop  < oCY  + OBS_R - 5
        if (!xOvlp || !yOvlp) continue

        o.collected = true
        if (o.kind === 'bad') {
          lives.current--
          combo.current = 0
          setDispLives(lives.current)
          setDispCombo(0)
          flash.current   = {kind: 'bad', f: 22}
          hitBlink.current = 34
          audioRef.current.playHit()
          spawnParticles(o.x, oCY, false)
          if (lives.current <= 0) { endGame(); return }
        } else {
          const nc   = combo.current + 1
          combo.current = nc
          const mult = nc >= 5 ? 3 : nc >= 3 ? 2 : 1
          const pts  = 15 * mult
          score.current += pts
          setDispScore(score.current)
          setDispCombo(nc)
          flash.current = {kind: 'good', f: 12}
          spawnParticles(o.x, oCY, true)
          spawnFloat(o.x, oCY - OBS_R - 4, nc >= 3 ? `+${pts} ×${mult}` : `+${pts}`)
          if (nc === 3 || nc === 5) audioRef.current.playCombo()
          else audioRef.current.playCollect()
        }
      }

      obs.current = obs.current.filter(o => o.x > -50)

      // Speed ramp
      speed.current = Math.min(8, 3 + frame.current / 500)

      // Passive score
      if (frame.current % 15 === 0) { score.current++; setDispScore(score.current) }

      // Particles
      for (const p of particles.current) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.14; p.life--
      }
      particles.current = particles.current.filter(p => p.life > 0)

      // Float texts
      for (const t of floatTxts.current) { t.y -= 1.2; t.life-- }
      floatTxts.current = floatTxts.current.filter(t => t.life > 0)

      if (flash.current) { flash.current.f--; if (flash.current.f <= 0) flash.current = null }
      if (hitBlink.current > 0) hitBlink.current--
    }

    function render() {
      if (!ctx) return

      // Sky gradient
      const skyG = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
      skyG.addColorStop(0, '#090918')
      skyG.addColorStop(1, '#1a1540')
      ctx.fillStyle = skyG
      ctx.fillRect(0, 0, CW, GROUND_Y)

      // Twinkling stars
      for (const s of STARS) {
        const twinkle = 0.55 + Math.sin(frame.current * 0.04 + s.x) * 0.45
        ctx.globalAlpha = twinkle
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1

      // Far clouds (faint)
      for (const c of cloudsRef.current) {
        drawCloud(c, c.sf <= 0.2 ? 0.15 : 0.32)
      }

      // Screen flash (hit / collect)
      if (flash.current) {
        const a = flash.current.f / 22
        ctx.fillStyle = flash.current.kind === 'bad'
          ? `rgba(255,59,48,${a * 0.38})` : `rgba(76,217,100,${a * 0.2})`
        ctx.fillRect(0, 0, CW, CH)
      }

      // Ground fill
      const groundG = ctx.createLinearGradient(0, GROUND_Y, 0, CH)
      groundG.addColorStop(0, '#1e2a0a')
      groundG.addColorStop(1, '#12180 6')
      ctx.fillStyle = '#1a2a08'
      ctx.fillRect(0, GROUND_Y, CW, CH - GROUND_Y)

      // Scrolling grass tufts
      const gs = 28
      ctx.lineWidth = 1.5
      for (let gx = -(groundOff.current % gs); gx < CW + gs; gx += gs) {
        ctx.strokeStyle = '#48920e'
        ctx.beginPath(); ctx.moveTo(gx,   GROUND_Y); ctx.lineTo(gx - 3, GROUND_Y - 7); ctx.stroke()
        ctx.strokeStyle = '#5ab820'
        ctx.beginPath(); ctx.moveTo(gx+2, GROUND_Y); ctx.lineTo(gx + 2, GROUND_Y - 9); ctx.stroke()
        ctx.strokeStyle = '#48920e'
        ctx.beginPath(); ctx.moveTo(gx+5, GROUND_Y); ctx.lineTo(gx + 8, GROUND_Y - 6); ctx.stroke()
      }

      // Ground edge highlight
      ctx.strokeStyle = '#6ac820'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CW, GROUND_Y); ctx.stroke()

      // ===== Obstacles =====
      for (const o of obs.current) {
        if (o.collected) continue
        const floatY  = o.kind === 'good' ? Math.sin(frame.current * 0.08 + o.id * 1.2) * 3 : 0
        const oCY     = o.kind === 'bad'  ? GROUND_Y - OBS_R : GROUND_Y - GOOD_HEIGHT + floatY
        const isBad   = o.kind === 'bad'
        const pulse   = isBad ? 1 + Math.sin(frame.current * 0.15) * 0.08 : 1
        const r       = OBS_R * pulse

        // Radial glow
        const gg = ctx.createRadialGradient(o.x, oCY, r * 0.5, o.x, oCY, r + 8)
        gg.addColorStop(0, isBad ? 'rgba(255,59,48,0.25)' : 'rgba(76,217,100,0.25)')
        gg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gg
        ctx.beginPath(); ctx.arc(o.x, oCY, r + 8, 0, Math.PI * 2); ctx.fill()

        // Circle
        ctx.beginPath(); ctx.arc(o.x, oCY, r, 0, Math.PI * 2)
        ctx.fillStyle = isBad ? 'rgba(255,59,48,0.15)' : 'rgba(76,217,100,0.15)'
        ctx.fill()
        ctx.strokeStyle = isBad ? '#ff3b30' : '#4cd964'
        ctx.lineWidth = isBad ? 2 : 1.5
        ctx.stroke()

        // Emoji
        ctx.font = '18px serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(o.emoji, o.x, oCY)

        // Good item: dashed line + orbiting sparkles
        if (!isBad) {
          ctx.setLineDash([3, 5])
          ctx.strokeStyle = 'rgba(76,217,100,0.25)'
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(o.x, oCY + r); ctx.lineTo(o.x, GROUND_Y); ctx.stroke()
          ctx.setLineDash([])

          const sa = frame.current * 0.1 + o.id
          for (let si = 0; si < 3; si++) {
            const ang = sa + si * (Math.PI * 2 / 3)
            ctx.globalAlpha = 0.55 + Math.sin(sa + si) * 0.45
            ctx.fillStyle = '#f9d64a'
            ctx.beginPath()
            ctx.arc(o.x + Math.cos(ang) * (r + 5), oCY + Math.sin(ang) * (r + 5), 1.5, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalAlpha = 1
        }
      }

      // ===== Particles =====
      for (const p of particles.current) {
        ctx.globalAlpha = p.life / p.maxLife
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1

      // ===== Floating score texts =====
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = 'bold 13px sans-serif'
      for (const t of floatTxts.current) {
        ctx.globalAlpha = t.life / t.maxLife
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'
        ctx.lineWidth = 3
        ctx.strokeText(t.text, t.x, t.y)
        ctx.fillStyle = '#f9d64a'
        ctx.fillText(t.text, t.x, t.y)
      }
      ctx.globalAlpha = 1

      // ===== Chipie =====
      const shadowS = Math.max(0.2, 1 - chipieY.current / 90)
      ctx.beginPath()
      ctx.ellipse(CHIPIE_X + CHIPIE_W / 2, GROUND_Y + 4, (CHIPIE_W / 2) * shadowS, 3 * shadowS, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fill()

      const showChipie = hitBlink.current <= 0 || Math.floor(hitBlink.current / 4) % 2 === 0
      if (showChipie) {
        const bounce = onGround.current ? Math.sin(frame.current * 0.22) * 2 : 0
        const drawY  = GROUND_Y - chipieY.current - CHIPIE_H + bounce
        if (hitBlink.current > 0) ctx.globalAlpha = 0.55
        ctx.font = `${CHIPIE_H}px serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText('🐰', CHIPIE_X + CHIPIE_W / 2, drawY)
        ctx.globalAlpha = 1
      }
    }

    function loop() {
      if (!active.current) return
      update(); render()
      raf.current = requestAnimationFrame(loop)
    }

    raf.current = requestAnimationFrame(loop)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [screen, spawnObs, endGame])

  const handleJump = useCallback(() => jump(), [jump])
  const best = loadBest()
  const multDisp = dispCombo >= 5 ? 3 : 2

  // ===== MENU =====
  if (screen === 'menu') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Retour
      </button>
      <div className={styles.menuScreen}>
        <span className={styles.menuEmoji}>🐰</span>
        <h1 className={styles.menuTitle}>Course d'obstacles</h1>
        <p className={styles.menuSub}>Chipie court, à toi de la guider !</p>
        <div className={styles.rules}>
          <div className={styles.rule}><span>🟢</span> Attrape les bons aliments pour marquer des pts</div>
          <div className={styles.rule}><span>🔴</span> Évite les toxiques ou perds une vie</div>
          <div className={styles.rule}><span>🦘</span> Double saut disponible en l'air !</div>
          <div className={styles.rule}><span>🔥</span> Combo x2 (3 collectes) et x3 (5 collectes)</div>
          <div className={styles.rule}><span>❤️</span> 3 vies — bonne chance !</div>
        </div>
        {best > 0 && <div className={styles.menuBest}>Record : {best} pts</div>}
        <button className={styles.playBtn} onClick={startGame}>Jouer</button>
      </div>
    </div>
  )

  // ===== END =====
  if (screen === 'end') return (
    <div className={styles.page}>
      <div className={styles.endScreen}>
        <span className={styles.endEmoji}>{dispScore >= 200 ? '👑' : dispScore >= 100 ? '🏆' : dispScore >= 50 ? '🎉' : '💥'}</span>
        <h2 className={styles.endTitle}>Game Over !</h2>
        {newRecord && <div className={styles.newRecord}>Nouveau record !</div>}
        <div className={styles.endStats}>
          <div className={styles.stat}><span className={styles.statNum}>{dispScore}</span><span className={styles.statLabel}>score</span></div>
        </div>
        {best > 0 && !newRecord && <div className={styles.endRecord}>Record : {best} pts</div>}
        <div className={styles.endActions}>
          <button className={styles.playBtn} onClick={startGame}>Rejouer</button>
          <button className={styles.menuBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
        </div>
      </div>
    </div>
  )

  // ===== PLAY =====
  return (
    <div className={styles.page}>
      <div className={styles.hud}>
        <span className={styles.hudScore}>{dispScore} pts</span>
        {dispCombo >= 3 && (
          <span className={styles.hudCombo}>×{multDisp} 🔥</span>
        )}
        <span className={styles.hudLives}>{'❤️'.repeat(Math.max(0, dispLives))}</span>
      </div>

      <div
        className={styles.canvasWrap}
        onClick={handleJump}
        onTouchStart={e => { e.preventDefault(); handleJump() }}
      >
        <canvas ref={canvasRef} width={CW} height={CH} className={styles.canvas} />
      </div>

      <button className={styles.jumpBtn} onPointerDown={handleJump}>
        ⬆ Sauter
      </button>
      <p className={styles.hint}>Appuie deux fois pour double saut !</p>
    </div>
  )
}

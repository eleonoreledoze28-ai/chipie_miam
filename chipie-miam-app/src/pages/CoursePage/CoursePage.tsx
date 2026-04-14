import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import styles from './CoursePage.module.css'

const CW = 360
const CH = 210
const GROUND_Y = 168
const CHIPIE_X = 55
const CHIPIE_W = 32
const CHIPIE_H = 32
const JUMP_FORCE   = 12
const JUMP_FORCE_2 = 9
const GRAVITY = 0.6
const OBS_R = 16
const GOOD_HEIGHT = 64
const BEST_KEY = 'chipie-course-best'

function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 } }

const STARS = [
  {x:18,y:12,r:1.2},{x:52,y:7,r:1},{x:88,y:22,r:0.8},{x:128,y:11,r:1.2},
  {x:172,y:5,r:0.9},{x:208,y:26,r:1},{x:248,y:9,r:1.3},{x:288,y:19,r:0.8},
  {x:320,y:4,r:1},{x:344,y:17,r:1.2},{x:68,y:38,r:0.7},{x:194,y:34,r:0.8},
  {x:310,y:42,r:0.9},{x:140,y:45,r:0.7},{x:76,y:18,r:0.9},{x:238,y:44,r:0.6},
]

interface Cloud       { x:number; y:number; w:number; h:number; sf:number }
interface Obs         { id:number; x:number; kind:'bad'|'good'; emoji:string; collected:boolean }
interface Particle    { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; color:string; r:number }
interface FloatTxt    { x:number; y:number; text:string; life:number; maxLife:number }
interface ShootStar   { x:number; y:number; life:number; maxLife:number }
interface WindLine    { x:number; y:number; len:number; life:number }

type Screen = 'menu'|'play'|'end'
type MissionType = 'collect'|'combo'|'survive'|'jump'|'score'
interface Mission { type:MissionType; target:number; label:string }

const MISSIONS: Mission[] = [
  { type:'collect', target:5,   label:'Attrape 5 bons aliments' },
  { type:'collect', target:8,   label:'Attrape 8 bons aliments' },
  { type:'combo',   target:5,   label:'Réalise un combo ×3 (5 suites)' },
  { type:'survive', target:25,  label:'Survie 25 secondes' },
  { type:'survive', target:40,  label:'Survie 40 secondes' },
  { type:'jump',    target:12,  label:'Saute 12 fois' },
  { type:'score',   target:100, label:'Atteins 100 pts' },
  { type:'score',   target:200, label:'Atteins 200 pts' },
]

const CAT_EMOJI: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.id, c.emoji]))

// ===== Audio =====
function useRunnerAudio() {
  const ctxRef = useRef<AudioContext|null>(null)
  const getCtx = useCallback(() => {
    if (!ctxRef.current)
      ctxRef.current = new (window.AudioContext || (window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext)()
    return ctxRef.current
  }, [])
  const beep = useCallback((freq:number, dur:number, type:OscillatorType='sine', vol=0.22) => {
    try {
      const ac = getCtx(); const osc = ac.createOscillator(), g = ac.createGain()
      osc.connect(g); g.connect(ac.destination)
      osc.type = type; osc.frequency.value = freq
      g.gain.setValueAtTime(vol, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
      osc.start(); osc.stop(ac.currentTime + dur)
    } catch { /* ignore */ }
  }, [getCtx])
  const playJump    = useCallback(() => { beep(440,0.07); setTimeout(()=>beep(560,0.06),55) }, [beep])
  const playJump2   = useCallback(() => { beep(560,0.07); setTimeout(()=>beep(720,0.06),55) }, [beep])
  const playCollect = useCallback(() => { beep(660,0.06); setTimeout(()=>beep(880,0.1),60); try{navigator.vibrate(30)}catch{} }, [beep])
  const playCombo   = useCallback(() => { beep(523,0.06); setTimeout(()=>beep(659,0.06),65); setTimeout(()=>beep(784,0.12),130); try{navigator.vibrate([25,15,25])}catch{} }, [beep])
  const playHit     = useCallback(() => { beep(160,0.22,'sawtooth',0.3); try{navigator.vibrate([80,30,80])}catch{} }, [beep])
  const playWind    = useCallback(() => { beep(90,0.6,'sawtooth',0.06); setTimeout(()=>beep(70,0.8,'sawtooth',0.04),300) }, [beep])
  const playMission = useCallback(() => { beep(784,0.08); setTimeout(()=>beep(1046,0.15),80); try{navigator.vibrate([20,10,40])}catch{} }, [beep])
  return { playJump, playJump2, playCollect, playCombo, playHit, playWind, playMission }
}

export default function CoursePage() {
  const navigate  = useNavigate()
  const audio     = useRunnerAudio()
  const audioRef  = useRef(audio)
  useEffect(() => { audioRef.current = audio }, [audio])

  const goodPool = useMemo(() => VEGETAUX.filter(v=>v.restriction==='aucune').map(v=>CAT_EMOJI[v.categorie]??'🌱'), [])
  const badPool  = useMemo(() => VEGETAUX.filter(v=>v.restriction==='a_eviter').map(v=>CAT_EMOJI[v.categorie]??'☠️'), [])

  const [screen,       setScreen]       = useState<Screen>('menu')
  const [dispScore,    setDispScore]     = useState(0)
  const [dispLives,    setDispLives]     = useState(3)
  const [dispCombo,    setDispCombo]     = useState(0)
  const [dispSpeedPct, setDispSpeedPct]  = useState(0)
  const [isNight,      setIsNight]       = useState(false)
  const [windWarning,  setWindWarning]   = useState(false)
  const [newRecord,    setNewRecord]     = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Core game state
  const chipieY    = useRef(0); const chipieVY  = useRef(0)
  const onGround   = useRef(true); const jumpsUsed = useRef(0)
  const hitBlink   = useRef(0)
  const obs        = useRef<Obs[]>([])
  const particles  = useRef<Particle[]>([])
  const floatTxts  = useRef<FloatTxt[]>([])
  const score      = useRef(0); const lives = useRef(3); const combo = useRef(0)
  const speed      = useRef(3); const frame = useRef(0)
  const nextObs    = useRef(90); const obsId = useRef(0)
  const active     = useRef(false); const raf = useRef<number|null>(null)
  const flash      = useRef<{kind:'good'|'bad';f:number}|null>(null)
  const groundOff  = useRef(0)

  // New features refs
  const windTimer   = useRef(350)        // frames until next gust
  const windActive  = useRef(0)          // remaining wind frames
  const windLines   = useRef<WindLine[]>([])
  const shootStars  = useRef<ShootStar[]>([])
  const starTimer   = useRef(250)
  const jumpCount   = useRef(0)
  const collectCount = useRef(0)
  const comboMax    = useRef(0)
  const activeMission = useRef<Mission|null>(null)
  const missionComp = useRef(false)

  const cloudsRef = useRef<Cloud[]>([
    {x:50,y:22,w:42,h:14,sf:0.2},{x:155,y:36,w:28,h:10,sf:0.25},
    {x:262,y:17,w:52,h:17,sf:0.18},{x:340,y:44,w:24,h:9,sf:0.30},{x:430,y:26,w:36,h:12,sf:0.22},
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
    jumpCount.current++
    if (second) {
      audioRef.current.playJump2()
      for (let i=0; i<6; i++) particles.current.push({
        x: CHIPIE_X+CHIPIE_W/2+(Math.random()-0.5)*22, y: GROUND_Y-chipieY.current-CHIPIE_H/2,
        vx:(Math.random()-0.5)*2, vy:Math.random()*-1.2-0.2,
        life:14+Math.floor(Math.random()*8), maxLife:22, color:'rgba(200,210,230,0.85)', r:2.5+Math.random()*2.5,
      })
    } else { audioRef.current.playJump() }
  }, [])

  // Modified spawnObs: 15% chance of double bad obstacle
  const spawnObs = useCallback(() => {
    const isBad = Math.random() < 0.55
    const pool  = isBad ? badPool : goodPool
    obs.current.push({ id:obsId.current++, x:CW+OBS_R, kind:isBad?'bad':'good', emoji:pool[Math.floor(Math.random()*pool.length)], collected:false })
    // Double obstacle: two bad items 50-65px apart
    if (isBad && Math.random() < 0.18) {
      obs.current.push({ id:obsId.current++, x:CW+OBS_R+52+Math.floor(Math.random()*14), kind:'bad', emoji:badPool[Math.floor(Math.random()*badPool.length)], collected:false })
    }
  }, [badPool, goodPool])

  const startGame = useCallback(() => {
    chipieY.current=0; chipieVY.current=0; onGround.current=true
    jumpsUsed.current=0; hitBlink.current=0
    obs.current=[]; particles.current=[]; floatTxts.current=[]
    windLines.current=[]; shootStars.current=[]
    score.current=0; lives.current=3; combo.current=0
    speed.current=3; frame.current=0; nextObs.current=90
    active.current=true; flash.current=null; groundOff.current=0
    windTimer.current=350; windActive.current=0; starTimer.current=250
    jumpCount.current=0; collectCount.current=0; comboMax.current=0
    missionComp.current=false
    // Pick a random mission
    activeMission.current = MISSIONS[Math.floor(Math.random()*MISSIONS.length)]
    setDispScore(0); setDispLives(3); setDispCombo(0); setDispSpeedPct(0)
    setIsNight(false); setWindWarning(false); setNewRecord(false)
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
      for (let i=0; i<8; i++) {
        const a=(i/8)*Math.PI*2, s=1.5+Math.random()*2.5
        particles.current.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-1.2, life:20+Math.floor(Math.random()*12), maxLife:32, color:good?(i%2===0?'#4cd964':'#f9d64a'):'rgba(255,100,80,0.75)', r:2+Math.random()*2.5 })
      }
    }
    function spawnFloat(x:number, y:number, text:string) {
      floatTxts.current.push({x, y, text, life:44, maxLife:44})
    }
    function drawCloud(c:Cloud, alpha:number) {
      const c2=ctx!; c2.save(); c2.globalAlpha=alpha; c2.fillStyle='rgba(255,255,255,0.9)'
      c2.beginPath(); c2.ellipse(c.x,c.y,c.w*0.5,c.h*0.5,0,0,Math.PI*2); c2.fill()
      c2.beginPath(); c2.ellipse(c.x-c.w*0.28,c.y+c.h*0.08,c.w*0.32,c.h*0.42,0,0,Math.PI*2); c2.fill()
      c2.beginPath(); c2.ellipse(c.x+c.w*0.30,c.y+c.h*0.12,c.w*0.28,c.h*0.36,0,0,Math.PI*2); c2.fill()
      c2.restore()
    }
    function getMissionProgress(): number {
      const m = activeMission.current; if (!m) return 0
      switch(m.type) {
        case 'collect': return collectCount.current
        case 'combo':   return comboMax.current
        case 'survive': return Math.floor(frame.current/60)
        case 'jump':    return jumpCount.current
        case 'score':   return score.current
      }
    }

    function update() {
      frame.current++
      groundOff.current = (groundOff.current + speed.current) % 28

      // Night mode: kicks in after 20 seconds
      const nightLevel = Math.min(1, Math.max(0, (frame.current - 1200) / 600))
      if (frame.current === 1200) setIsNight(true)

      // Clouds
      for (const c of cloudsRef.current) { c.x -= speed.current*c.sf; if(c.x<-90) c.x=CW+90 }

      // Shooting star timer
      starTimer.current--
      if (starTimer.current <= 0) {
        shootStars.current.push({ x:CW+10, y:8+Math.random()*55, life:30+Math.floor(Math.random()*18), maxLife:48 })
        starTimer.current = 280 + Math.floor(Math.random()*380)
      }
      for (const ss of shootStars.current) { ss.x -= 7; ss.y += 2.5; ss.life-- }
      shootStars.current = shootStars.current.filter(ss=>ss.life>0)

      // Wind gust timer
      windTimer.current--
      if (windTimer.current <= 0) {
        windActive.current = 90
        windTimer.current = 420 + Math.floor(Math.random()*280)
        setWindWarning(true)
        setTimeout(() => setWindWarning(false), 1500)
        audioRef.current.playWind()
        for (let i=0; i<8; i++) windLines.current.push({
          x: CW + Math.random()*30, y: 15+Math.random()*(GROUND_Y-30),
          len: 18+Math.random()*28, life: 22+Math.floor(Math.random()*18),
        })
      }
      if (windActive.current > 0) { windActive.current--; for (const o of obs.current) o.x -= speed.current*0.35 }
      for (const wl of windLines.current) { wl.x -= speed.current*2.2+3; wl.life-- }
      windLines.current = windLines.current.filter(wl=>wl.life>0 && wl.x > -50)

      // Night: obstacles also shift slightly
      if (nightLevel > 0) { /* visual only, handled in render */ }

      // Physics
      chipieVY.current -= GRAVITY; chipieY.current += chipieVY.current
      if (chipieY.current <= 0) { chipieY.current=0; chipieVY.current=0; onGround.current=true; jumpsUsed.current=0 }

      // Spawn
      if (frame.current >= nextObs.current) {
        spawnObs()
        const gap = Math.max(50, 90-Math.floor(speed.current)*5) + Math.floor(Math.random()*25)
        nextObs.current = frame.current + gap
      }

      // Move obstacles
      for (const o of obs.current) o.x -= speed.current

      // Collision
      const cLeft=CHIPIE_X+5, cRight=CHIPIE_X+CHIPIE_W-5, cBot=GROUND_Y-chipieY.current, cTop=cBot-CHIPIE_H+5
      for (const o of obs.current) {
        if (o.collected) continue
        const oCY = o.kind==='bad' ? GROUND_Y-OBS_R : GROUND_Y-GOOD_HEIGHT
        if (!(cRight>o.x-OBS_R+5 && cLeft<o.x+OBS_R-5 && cBot>oCY-OBS_R+5 && cTop<oCY+OBS_R-5)) continue
        o.collected = true
        if (o.kind==='bad') {
          lives.current--; combo.current=0
          setDispLives(lives.current); setDispCombo(0)
          flash.current={kind:'bad',f:22}; hitBlink.current=34
          audioRef.current.playHit(); spawnParticles(o.x,oCY,false)
          if (lives.current<=0) { endGame(); return }
        } else {
          const nc=combo.current+1; combo.current=nc
          if (nc>comboMax.current) comboMax.current=nc
          collectCount.current++
          const mult=nc>=5?3:nc>=3?2:1, pts=15*mult
          score.current+=pts; setDispScore(score.current); setDispCombo(nc)
          flash.current={kind:'good',f:12}
          spawnParticles(o.x,oCY,true)
          spawnFloat(o.x,oCY-OBS_R-4, nc>=3?`+${pts} ×${mult}`:`+${pts}`)
          if (nc===3||nc===5) audioRef.current.playCombo(); else audioRef.current.playCollect()
        }
      }

      obs.current = obs.current.filter(o=>o.x>-50)
      speed.current = Math.min(8, 3+frame.current/500)

      // Speed bar update (every 30 frames)
      if (frame.current % 30 === 0) setDispSpeedPct(Math.round(((speed.current-3)/5)*100))

      if (frame.current%15===0) { score.current++; setDispScore(score.current) }

      // Mission check
      const m = activeMission.current
      if (m && !missionComp.current) {
        if (getMissionProgress() >= m.target) {
          missionComp.current = true
          score.current += 50; setDispScore(score.current)
          spawnFloat(CW/2, CH/2-30, '🎯 Mission ! +50')
          audioRef.current.playMission()
        }
      }

      // Particles + float texts
      for (const p of particles.current) { p.x+=p.vx; p.y+=p.vy; p.vy+=0.14; p.life-- }
      particles.current = particles.current.filter(p=>p.life>0)
      for (const t of floatTxts.current) { t.y-=1.2; t.life-- }
      floatTxts.current = floatTxts.current.filter(t=>t.life>0)
      if (flash.current) { flash.current.f--; if(flash.current.f<=0) flash.current=null }
      if (hitBlink.current>0) hitBlink.current--
    }

    function render() {
      if (!ctx) return
      const nightLevel = Math.min(1, Math.max(0, (frame.current-1200)/600))

      // Sky
      const skyG = ctx.createLinearGradient(0,0,0,GROUND_Y)
      skyG.addColorStop(0, '#090918'); skyG.addColorStop(1, '#1a1540')
      ctx.fillStyle = skyG; ctx.fillRect(0,0,CW,GROUND_Y)

      // Progressive night darkening
      if (nightLevel > 0) {
        ctx.fillStyle = `rgba(0,0,8,${nightLevel*0.55})`
        ctx.fillRect(0,0,CW,GROUND_Y)
      }

      // Stars (brighter at night)
      const starBoost = 0.25 * nightLevel
      for (const s of STARS) {
        const twinkle = Math.min(1, (0.55+starBoost) + Math.sin(frame.current*0.04+s.x)*(0.45-starBoost*0.2))
        ctx.globalAlpha = twinkle; ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r*(1+starBoost*0.5),0,Math.PI*2); ctx.fill()
      }
      ctx.globalAlpha = 1

      // Shooting stars
      for (const ss of shootStars.current) {
        const a = ss.life/ss.maxLife
        ctx.globalAlpha = a
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(ss.x,ss.y); ctx.lineTo(ss.x+45,ss.y-16); ctx.stroke()
        ctx.globalAlpha = a*0.3; ctx.strokeStyle='rgba(180,200,255,0.9)'; ctx.lineWidth=4
        ctx.beginPath(); ctx.moveTo(ss.x,ss.y); ctx.lineTo(ss.x+28,ss.y-10); ctx.stroke()
      }
      ctx.globalAlpha = 1

      // Clouds (slightly faded at deep night)
      const cloudAlpha = 1 - nightLevel * 0.4
      for (const c of cloudsRef.current) drawCloud(c, (c.sf<=0.2?0.15:0.32)*cloudAlpha)

      // Screen flash
      if (flash.current) {
        const a = flash.current.f/22
        ctx.fillStyle = flash.current.kind==='bad' ? `rgba(255,59,48,${a*0.38})` : `rgba(76,217,100,${a*0.2})`
        ctx.fillRect(0,0,CW,CH)
      }

      // Wind lines
      for (const wl of windLines.current) {
        ctx.globalAlpha = (wl.life/40)*0.55
        ctx.strokeStyle = 'rgba(180,210,255,0.9)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(wl.x,wl.y); ctx.lineTo(wl.x+wl.len,wl.y); ctx.stroke()
      }
      ctx.globalAlpha = 1

      // Ground
      ctx.fillStyle = nightLevel>0.5 ? '#101808' : '#1a2a08'
      ctx.fillRect(0,GROUND_Y,CW,CH-GROUND_Y)

      // Grass tufts
      const gs=28; ctx.lineWidth=1.5
      for (let gx=-(groundOff.current%gs); gx<CW+gs; gx+=gs) {
        ctx.strokeStyle='#48920e'; ctx.beginPath(); ctx.moveTo(gx,GROUND_Y); ctx.lineTo(gx-3,GROUND_Y-7); ctx.stroke()
        ctx.strokeStyle='#5ab820'; ctx.beginPath(); ctx.moveTo(gx+2,GROUND_Y); ctx.lineTo(gx+2,GROUND_Y-9); ctx.stroke()
        ctx.strokeStyle='#48920e'; ctx.beginPath(); ctx.moveTo(gx+5,GROUND_Y); ctx.lineTo(gx+8,GROUND_Y-6); ctx.stroke()
      }
      ctx.strokeStyle='#6ac820'; ctx.lineWidth=1; ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(0,GROUND_Y); ctx.lineTo(CW,GROUND_Y); ctx.stroke()

      // Obstacles (slightly less visible at night)
      const obsAlpha = 1 - nightLevel * 0.3
      for (const o of obs.current) {
        if (o.collected) continue
        const floatY = o.kind==='good' ? Math.sin(frame.current*0.08+o.id*1.2)*3 : 0
        const oCY  = o.kind==='bad' ? GROUND_Y-OBS_R : GROUND_Y-GOOD_HEIGHT+floatY
        const isBad = o.kind==='bad'
        const pulse = isBad ? 1+Math.sin(frame.current*0.15)*0.08 : 1
        const r = OBS_R*pulse

        const gg = ctx.createRadialGradient(o.x,oCY,r*0.5,o.x,oCY,r+8)
        gg.addColorStop(0, isBad?'rgba(255,59,48,0.25)':'rgba(76,217,100,0.25)')
        gg.addColorStop(1,'rgba(0,0,0,0)')
        ctx.globalAlpha = obsAlpha
        ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(o.x,oCY,r+8,0,Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(o.x,oCY,r,0,Math.PI*2)
        ctx.fillStyle=isBad?'rgba(255,59,48,0.15)':'rgba(76,217,100,0.15)'; ctx.fill()
        ctx.strokeStyle=isBad?'#ff3b30':'#4cd964'; ctx.lineWidth=isBad?2:1.5; ctx.stroke()
        ctx.globalAlpha = 1
        ctx.font='18px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'
        ctx.fillText(o.emoji,o.x,oCY)

        if (!isBad) {
          ctx.setLineDash([3,5]); ctx.strokeStyle='rgba(76,217,100,0.25)'; ctx.lineWidth=1
          ctx.beginPath(); ctx.moveTo(o.x,oCY+r); ctx.lineTo(o.x,GROUND_Y); ctx.stroke()
          ctx.setLineDash([])
          const sa=frame.current*0.1+o.id
          for (let si=0; si<3; si++) {
            const ang=sa+si*(Math.PI*2/3)
            ctx.globalAlpha=0.55+Math.sin(sa+si)*0.45
            ctx.fillStyle='#f9d64a'
            ctx.beginPath(); ctx.arc(o.x+Math.cos(ang)*(r+5),oCY+Math.sin(ang)*(r+5),1.5,0,Math.PI*2); ctx.fill()
          }
          ctx.globalAlpha=1
        }
      }

      // Particles
      for (const p of particles.current) { ctx.globalAlpha=p.life/p.maxLife; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill() }
      ctx.globalAlpha=1

      // Float texts
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold 13px sans-serif'
      for (const t of floatTxts.current) {
        ctx.globalAlpha=t.life/t.maxLife
        ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=3; ctx.strokeText(t.text,t.x,t.y)
        ctx.fillStyle='#f9d64a'; ctx.fillText(t.text,t.x,t.y)
      }
      ctx.globalAlpha=1

      // Mission overlay (bottom strip)
      const m = activeMission.current
      if (m) {
        const prog = Math.min(m.target, getMissionProgress())
        const pct = prog/m.target
        const done = missionComp.current
        ctx.globalAlpha=0.75
        ctx.fillStyle=done?'rgba(76,217,100,0.18)':'rgba(0,0,0,0.35)'
        ctx.fillRect(0,CH-20,CW,20)
        ctx.globalAlpha=1
        ctx.font='10px sans-serif'; ctx.textAlign='left'; ctx.textBaseline='middle'
        ctx.fillStyle=done?'#4cd964':'#ccc'
        ctx.fillText(`${done?'✅':'🎯'} ${m.label}: ${prog}/${m.target}`, 8, CH-10)
        ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(CW-58,CH-16,48,10)
        ctx.fillStyle=done?'#4cd964':'#f9d64a'; ctx.fillRect(CW-58,CH-16,48*pct,10)
      }

      // Chipie shadow
      const shadowS=Math.max(0.2,1-chipieY.current/90)
      ctx.beginPath(); ctx.ellipse(CHIPIE_X+CHIPIE_W/2,GROUND_Y+4,(CHIPIE_W/2)*shadowS,3*shadowS,0,0,Math.PI*2)
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fill()

      // Chipie
      const showChipie = hitBlink.current<=0 || Math.floor(hitBlink.current/4)%2===0
      if (showChipie) {
        const bounce = onGround.current ? Math.sin(frame.current*0.22)*2 : 0
        const drawY  = GROUND_Y-chipieY.current-CHIPIE_H+bounce
        if (hitBlink.current>0) ctx.globalAlpha=0.55
        ctx.font=`${CHIPIE_H}px serif`; ctx.textAlign='center'; ctx.textBaseline='top'
        ctx.fillText('🐰',CHIPIE_X+CHIPIE_W/2,drawY)
        ctx.globalAlpha=1
      }
    }

    function loop() { if (!active.current) return; update(); render(); raf.current=requestAnimationFrame(loop) }
    raf.current = requestAnimationFrame(loop)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [screen, spawnObs, endGame])

  const handleJump = useCallback(() => jump(), [jump])
  const best = loadBest()
  const multDisp = dispCombo>=5 ? 3 : 2

  // Medals
  const medal = dispScore>=300 ? {e:'🥇',l:'Or'} : dispScore>=150 ? {e:'🥈',l:'Argent'} : dispScore>=50 ? {e:'🥉',l:'Bronze'} : null

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
          <div className={styles.rule}><span>🔴</span> Évite les toxiques (parfois en double !)</div>
          <div className={styles.rule}><span>🦘</span> Double saut disponible en l'air !</div>
          <div className={styles.rule}><span>💨</span> Rafales de vent — les obstacles accélèrent !</div>
          <div className={styles.rule}><span>🌑</span> La nuit tombe après 20 secondes…</div>
          <div className={styles.rule}><span>🎯</span> Une mission secrète par partie — +50 pts !</div>
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
        <span className={styles.endEmoji}>{medal ? medal.e : '💥'}</span>
        <h2 className={styles.endTitle}>Game Over !</h2>
        {medal && <div className={`${styles.newRecord} ${medal.e==='🥇'?styles.medalGold:medal.e==='🥈'?styles.medalSilver:styles.medalBronze}`}>Médaille {medal.l} !</div>}
        {newRecord && <div className={styles.newRecord}>🏆 Nouveau record !</div>}
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
        {dispCombo >= 3 && <span className={styles.hudCombo}>×{multDisp} 🔥</span>}
        <span className={styles.hudLives}>{'❤️'.repeat(Math.max(0, dispLives))}</span>
      </div>

      {/* Speed bar + night/wind indicators */}
      <div className={styles.statusRow}>
        <span className={styles.speedIcon}>⚡</span>
        <div className={styles.speedTrack}>
          <div className={styles.speedFill} style={{ width: `${dispSpeedPct}%` }} />
        </div>
        {isNight    && <span className={styles.nightBadge}>🌑</span>}
        {windWarning && <span className={styles.windBadge}>💨</span>}
      </div>

      <div className={styles.canvasWrap} onClick={handleJump} onTouchStart={e=>{e.preventDefault();handleJump()}}>
        <canvas ref={canvasRef} width={CW} height={CH} className={styles.canvas} />
      </div>

      <button className={styles.jumpBtn} onPointerDown={handleJump}>⬆ Sauter</button>
      <p className={styles.hint}>Appuie deux fois pour double saut !</p>
    </div>
  )
}

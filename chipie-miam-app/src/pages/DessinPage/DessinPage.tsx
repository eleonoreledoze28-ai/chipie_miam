import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './DessinPage.module.css'

const STEPS = [
  { id: 1, label: 'La tête',           desc: 'Trace un grand cercle au centre',              emoji: '⭕', highlights: ['head'] },
  { id: 2, label: 'Les oreilles',      desc: 'Deux longs ovales vers le haut de la tête',    emoji: '👂', highlights: ['ears'] },
  { id: 3, label: 'Le corps',          desc: 'Un grand ovale arrondi en bas',                emoji: '🥚', highlights: ['body'] },
  { id: 4, label: 'Les yeux',          desc: 'Deux petits cercles sur la tête',              emoji: '👁️', highlights: ['eyes'] },
  { id: 5, label: 'Le nez & bouche',   desc: 'Un petit ovale rose et deux courbes souriantes', emoji: '🐽', highlights: ['nose', 'mouth'] },
  { id: 6, label: 'Les moustaches',    desc: 'Quatre lignes fines de chaque côté du nez',    emoji: '〰️', highlights: ['whiskers'] },
  { id: 7, label: 'La queue',          desc: 'Un petit cercle duveteux sur le côté du corps', emoji: '🌸', highlights: ['tail'] },
]

const PALETTE = [
  { id: 'black',   hex: '#2a1a10' },
  { id: 'cream',   hex: '#f5f0e8' },
  { id: 'pink',    hex: '#ffb3c8' },
  { id: 'dpink',   hex: '#f06080' },
  { id: 'brown',   hex: '#c89060' },
  { id: 'orange',  hex: '#f0a050' },
  { id: 'lav',     hex: '#b8a8f8' },
  { id: 'mint',    hex: '#80e8b8' },
  { id: 'yellow',  hex: '#f8e060' },
  { id: 'sky',     hex: '#80c8f8' },
  { id: 'red',     hex: '#ff6b6b' },
  { id: 'green',   hex: '#4cd964' },
]

type Tool   = 'draw' | 'erase'
type Screen = 'menu' | 'draw' | 'end'

// ── Guide SVG ──────────────────────────────────────────────────────────────
function GuideSvg({ step, showGuide }: { step: number; showGuide: boolean }) {
  const doneHl   = STEPS.slice(0, step).flatMap(s => s.highlights)
  const activeHl = STEPS[step]?.highlights ?? []

  const op = (part: string) => {
    if (!showGuide) return 0.04
    if (activeHl.includes(part)) return 0.75
    if (doneHl.includes(part))   return 0.28
    return 0.09
  }
  const st = (part: string) =>
    activeHl.includes(part) ? '#e8963a' : doneHl.includes(part) ? '#4cd964' : '#888'
  const sw = (part: string) => (activeHl.includes(part) ? 3 : 1.5)
  const cls = (part: string) => (activeHl.includes(part) ? styles.guidePulse : undefined)

  return (
    <svg viewBox="0 0 200 270" className={styles.guideSvg} aria-hidden="true">
      {/* Ears */}
      <ellipse cx="68"  cy="52" rx="24" ry="48" fill="none" stroke={st('ears')} strokeWidth={sw('ears')} opacity={op('ears')} className={cls('ears')} />
      <ellipse cx="132" cy="52" rx="24" ry="48" fill="none" stroke={st('ears')} strokeWidth={sw('ears')} opacity={op('ears')} className={cls('ears')} />
      {/* Body */}
      <ellipse cx="100" cy="212" rx="58" ry="54" fill="none" stroke={st('body')} strokeWidth={sw('body')} opacity={op('body')} className={cls('body')} />
      {/* Head */}
      <circle  cx="100" cy="128" r="58" fill="none" stroke={st('head')} strokeWidth={sw('head')} opacity={op('head')} className={cls('head')} />
      {/* Tail */}
      <circle  cx="153" cy="197" r="20" fill="none" stroke={st('tail')} strokeWidth={sw('tail')} opacity={op('tail')} className={cls('tail')} />
      {/* Eyes */}
      <circle  cx="80"  cy="118" r="13" fill="none" stroke={st('eyes')} strokeWidth={sw('eyes')} opacity={op('eyes')} className={cls('eyes')} />
      <circle  cx="120" cy="118" r="13" fill="none" stroke={st('eyes')} strokeWidth={sw('eyes')} opacity={op('eyes')} className={cls('eyes')} />
      {/* Nose */}
      <ellipse cx="100" cy="146" rx="8" ry="5.5" fill="none" stroke={st('nose')} strokeWidth={sw('nose')} opacity={op('nose')} className={cls('nose')} />
      {/* Mouth */}
      <path d="M100,152 Q92,160 88,164"  fill="none" stroke={st('mouth')} strokeWidth={sw('mouth')} opacity={op('mouth')} strokeLinecap="round" className={cls('mouth')} />
      <path d="M100,152 Q108,160 112,164" fill="none" stroke={st('mouth')} strokeWidth={sw('mouth')} opacity={op('mouth')} strokeLinecap="round" className={cls('mouth')} />
      {/* Whiskers */}
      {(['w1','w2','w3','w4'] as const).map((_w, i) => {
        const pairs: [number,number,number,number][] = [
          [48,144,86,147],[48,151,86,150],[152,144,114,147],[152,151,114,150],
        ]
        const [x1,y1,x2,y2] = pairs[i]
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={st('whiskers')} strokeWidth={sw('whiskers') * 0.7} opacity={op('whiskers')} className={cls('whiskers')} />
      })}
    </svg>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function DessinPage() {
  const navigate    = useNavigate()
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const lastPos     = useRef<{ x: number; y: number } | null>(null)
  const savedImg    = useRef<string | null>(null)

  const [screen,    setScreen]    = useState<Screen>('menu')
  const [step,      setStep]      = useState(0)
  const [color,     setColor]     = useState('#2a1a10')
  const [tool,      setTool]      = useState<Tool>('draw')
  const [showGuide, setShowGuide] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)

  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDrawing(true)
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const pos    = getPos(e)
    lastPos.current = pos
    if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = color; ctx.fill()
    }
  }, [getPos, tool, color])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos.current) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const pos    = getPos(e)
    if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = color; ctx.lineWidth = 6
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.stroke()
    }
    lastPos.current = pos
  }, [isDrawing, getPos, tool, color])

  const onPointerUp = useCallback(() => {
    setIsDrawing(false)
    lastPos.current = null
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const nextStep = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
      setTool('draw')
    } else {
      savedImg.current = canvasRef.current?.toDataURL() ?? null
      try { localStorage.setItem('chipie-dessin-done', '1') } catch { /* */ }
      setScreen('end')
    }
  }, [step])

  const startGame = useCallback(() => {
    setStep(0); setColor('#2a1a10'); setTool('draw'); setShowGuide(true)
    setScreen('draw')
  }, [])

  // ── Menu ──
  if (screen === 'menu') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>
      <div className={styles.menuScreen}>
        <span className={styles.menuEmoji}>✏️</span>
        <h1 className={styles.menuTitle}>Dessin guidé</h1>
        <p className={styles.menuSubtitle}>Apprends à dessiner Chipie étape par étape !</p>
        <div className={styles.menuSteps}>
          {STEPS.map(s => (
            <div key={s.id} className={styles.menuStep}>
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        <button className={styles.playBtn} onClick={startGame}>C'est parti ! 🐰</button>
      </div>
    </div>
  )

  // ── End ──
  if (screen === 'end') return (
    <div className={styles.page}>
      <div className={styles.endScreen}>
        <span className={styles.endEmoji}>🌟</span>
        <h2 className={styles.endTitle}>Bravo ! Tu as dessiné Chipie !</h2>
        {savedImg.current && (
          <div className={styles.finalWrap}>
            <img src={savedImg.current} alt="Mon dessin de Chipie" className={styles.finalImg} />
          </div>
        )}
        <p className={styles.endDesc}>Super travail d'artiste ! 🎨</p>
        <div className={styles.endActions}>
          <button className={styles.playBtn}  onClick={startGame}>Recommencer</button>
          <button className={styles.menuBtn}  onClick={() => navigate('/jeu')}>Retour aux jeux</button>
        </div>
      </div>
    </div>
  )

  // ── Draw ──
  const cur      = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>
        <span className={styles.stepCount}>Étape {step + 1} / {STEPS.length}</span>
      </div>

      <div className={styles.progressWrap}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      {/* Drawing area: SVG guide + canvas on top */}
      <div className={styles.drawingArea}>
        <GuideSvg step={step} showGuide={showGuide} />
        <canvas
          ref={canvasRef}
          width={300}
          height={405}
          className={styles.drawCanvas}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      {/* Step info */}
      <div className={styles.stepInfo}>
        <span className={styles.stepEmoji}>{cur.emoji}</span>
        <div>
          <div className={styles.stepLabel}>{cur.label}</div>
          <div className={styles.stepDesc}>{cur.desc}</div>
        </div>
      </div>

      {/* Tools */}
      <div className={styles.toolRow}>
        <button className={`${styles.toolBtn} ${tool === 'draw'  ? styles.toolActive : ''}`} onClick={() => setTool('draw')}>✏️</button>
        <button className={`${styles.toolBtn} ${tool === 'erase' ? styles.toolActive : ''}`} onClick={() => setTool('erase')}>🧹</button>
        <button className={styles.toolBtn} onClick={clearCanvas}>🗑️</button>
        <button className={`${styles.toolBtn} ${showGuide ? styles.toolActive : ''}`} onClick={() => setShowGuide(g => !g)}>👁️</button>
      </div>

      {/* Palette */}
      <div className={styles.palette}>
        {PALETTE.map(p => (
          <button
            key={p.id}
            className={`${styles.swatch} ${color === p.hex && tool === 'draw' ? styles.swatchActive : ''}`}
            style={{ background: p.hex }}
            onClick={() => { setColor(p.hex); setTool('draw') }}
          />
        ))}
      </div>

      <button className={styles.nextBtn} onClick={nextStep}>
        {step < STEPS.length - 1 ? 'Étape suivante →' : '✅ Terminer !'}
      </button>
    </div>
  )
}

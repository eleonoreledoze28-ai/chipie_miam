import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ColoriePage.module.css'

const PALETTE = [
  { id: 'cream',    hex: '#f5f0e8' },
  { id: 'grey',     hex: '#c0b8b0' },
  { id: 'pink',     hex: '#ffb3c8' },
  { id: 'deeppink', hex: '#f06080' },
  { id: 'brown',    hex: '#c89060' },
  { id: 'lavender', hex: '#b8a8f8' },
  { id: 'mint',     hex: '#80e8b8' },
  { id: 'yellow',   hex: '#f8e060' },
  { id: 'orange',   hex: '#f0a050' },
  { id: 'sky',      hex: '#80c8f8' },
  { id: 'lilac',    hex: '#e0b0f8' },
  { id: 'peach',    hex: '#f8c8a0' },
]

const DEFAULTS: Record<string, string> = {
  leftEar:    '#f5f0e8',
  rightEar:   '#f5f0e8',
  leftEarIn:  '#ffb3c8',
  rightEarIn: '#ffb3c8',
  head:       '#f5f0e8',
  body:       '#f5f0e8',
  belly:      '#ede8e0',
  tail:       '#f5f0e8',
  nose:       '#f06080',
  leftCheek:  '#ffb3c8',
  rightCheek: '#ffb3c8',
}

const cl = styles.region

export default function ColoriePage() {
  const navigate = useNavigate()
  const [c, setC] = useState<Record<string, string>>({ ...DEFAULTS })
  const [sel, setSel] = useState('#ffb3c8')
  const [done, setDone] = useState(false)

  const fill = (id: string) => {
    setC(prev => {
      const next = { ...prev, [id]: sel }
      if (Object.keys(DEFAULTS).every(k => next[k] !== DEFAULTS[k])) setDone(true)
      return next
    })
  }

  const reset = () => { setC({ ...DEFAULTS }); setDone(false) }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>

      <div className={styles.header}>
        <h1 className={styles.title}>Colorie Chipie 🎨</h1>
        <p className={styles.subtitle}>Choisis une couleur, puis tape une zone</p>
      </div>

      {done && <div className={styles.badge}>✨ Chef-d'œuvre terminé !</div>}

      <div className={styles.canvasWrap}>
        <svg viewBox="0 0 200 270" className={styles.svg}>
          {/* Ears outer */}
          <ellipse cx="68"  cy="52" rx="24" ry="48" fill={c.leftEar}  stroke="#2a1a10" strokeWidth="2" className={cl} onClick={() => fill('leftEar')} />
          <ellipse cx="132" cy="52" rx="24" ry="48" fill={c.rightEar} stroke="#2a1a10" strokeWidth="2" className={cl} onClick={() => fill('rightEar')} />
          {/* Ear inners */}
          <ellipse cx="68"  cy="55" rx="13" ry="33" fill={c.leftEarIn}  className={cl} onClick={() => fill('leftEarIn')} />
          <ellipse cx="132" cy="55" rx="13" ry="33" fill={c.rightEarIn} className={cl} onClick={() => fill('rightEarIn')} />
          {/* Body */}
          <ellipse cx="100" cy="212" rx="58" ry="54" fill={c.body} stroke="#2a1a10" strokeWidth="2" className={cl} onClick={() => fill('body')} />
          {/* Belly */}
          <ellipse cx="100" cy="218" rx="34" ry="38" fill={c.belly} className={cl} onClick={() => fill('belly')} />
          {/* Tail */}
          <circle  cx="153" cy="197" r="20" fill={c.tail} stroke="#2a1a10" strokeWidth="1.5" className={cl} onClick={() => fill('tail')} />
          {/* Head */}
          <circle  cx="100" cy="128" r="58" fill={c.head} stroke="#2a1a10" strokeWidth="2" className={cl} onClick={() => fill('head')} />
          {/* Cheeks */}
          <ellipse cx="70"  cy="140" rx="15" ry="10" fill={c.leftCheek}  opacity={0.65} className={cl} onClick={() => fill('leftCheek')} />
          <ellipse cx="130" cy="140" rx="15" ry="10" fill={c.rightCheek} opacity={0.65} className={cl} onClick={() => fill('rightCheek')} />
          {/* Eyes (not colorable) */}
          <circle cx="80"  cy="118" r="13" fill="#fff" stroke="#2a1a10" strokeWidth="1.5" />
          <circle cx="120" cy="118" r="13" fill="#fff" stroke="#2a1a10" strokeWidth="1.5" />
          <circle cx="82"  cy="119" r="6"  fill="#1a0808" />
          <circle cx="122" cy="119" r="6"  fill="#1a0808" />
          <circle cx="84"  cy="116" r="2"  fill="#fff" />
          <circle cx="124" cy="116" r="2"  fill="#fff" />
          {/* Nose */}
          <ellipse cx="100" cy="146" rx="8" ry="5.5" fill={c.nose} className={cl} onClick={() => fill('nose')} />
          {/* Mouth */}
          <path d="M100,152 Q92,160 88,164"  fill="none" stroke="#2a1a10" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M100,152 Q108,160 112,164" fill="none" stroke="#2a1a10" strokeWidth="1.5" strokeLinecap="round" />
          {/* Whiskers */}
          <line x1="48"  y1="144" x2="86"  y2="147" stroke="#8a7060" strokeWidth="1" opacity={0.5} />
          <line x1="48"  y1="151" x2="86"  y2="150" stroke="#8a7060" strokeWidth="1" opacity={0.5} />
          <line x1="152" y1="144" x2="114" y2="147" stroke="#8a7060" strokeWidth="1" opacity={0.5} />
          <line x1="152" y1="151" x2="114" y2="150" stroke="#8a7060" strokeWidth="1" opacity={0.5} />
        </svg>
      </div>

      {/* Palette */}
      <div className={styles.palette}>
        {PALETTE.map(p => (
          <button
            key={p.id}
            className={`${styles.swatch} ${sel === p.hex ? styles.swatchActive : ''}`}
            style={{ background: p.hex }}
            onClick={() => setSel(p.hex)}
          />
        ))}
      </div>

      <div className={styles.actions}>
        <button className={styles.resetBtn} onClick={reset}>🔄 Recommencer</button>
      </div>
    </div>
  )
}

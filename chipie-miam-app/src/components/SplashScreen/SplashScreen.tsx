import { useState, useEffect } from 'react'
import styles from './SplashScreen.module.css'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1600)
    const t2 = setTimeout(onDone, 2100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div className={`${styles.splash} ${fading ? styles.fading : ''}`}>
      <div className={styles.rabbit}>
        <svg viewBox="0 0 120 160" width="110" height="147">
          {/* Ears */}
          <ellipse cx="38" cy="40" rx="16" ry="34" fill="#f5f0e8" stroke="#2a1a10" strokeWidth="2"/>
          <ellipse cx="82" cy="40" rx="16" ry="34" fill="#f5f0e8" stroke="#2a1a10" strokeWidth="2"/>
          <ellipse cx="38" cy="42" rx="8" ry="22" fill="#ffb3c8"/>
          <ellipse cx="82" cy="42" rx="8" ry="22" fill="#ffb3c8"/>
          {/* Head */}
          <circle cx="60" cy="100" r="42" fill="#f5f0e8" stroke="#2a1a10" strokeWidth="2"/>
          {/* Cheeks */}
          <ellipse cx="38" cy="110" rx="12" ry="8" fill="#ffb3c8" opacity="0.65"/>
          <ellipse cx="82" cy="110" rx="12" ry="8" fill="#ffb3c8" opacity="0.65"/>
          {/* Eyes */}
          <circle cx="46" cy="92" r="9" fill="#fff" stroke="#2a1a10" strokeWidth="1.5"/>
          <circle cx="74" cy="92" r="9" fill="#fff" stroke="#2a1a10" strokeWidth="1.5"/>
          <circle cx="48" cy="93" r="4.5" fill="#1a0808"/>
          <circle cx="76" cy="93" r="4.5" fill="#1a0808"/>
          <circle cx="50" cy="90" r="1.8" fill="#fff"/>
          <circle cx="78" cy="90" r="1.8" fill="#fff"/>
          {/* Nose */}
          <ellipse cx="60" cy="108" rx="5" ry="3.5" fill="#f06080"/>
          {/* Mouth */}
          <path d="M60,112 Q54,118 50,121" fill="none" stroke="#2a1a10" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M60,112 Q66,118 70,121" fill="none" stroke="#2a1a10" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Whiskers */}
          <line x1="20" y1="107" x2="48" y2="110" stroke="#8a7060" strokeWidth="1" opacity="0.4"/>
          <line x1="20" y1="114" x2="48" y2="113" stroke="#8a7060" strokeWidth="1" opacity="0.4"/>
          <line x1="100" y1="107" x2="72" y2="110" stroke="#8a7060" strokeWidth="1" opacity="0.4"/>
          <line x1="100" y1="114" x2="72" y2="113" stroke="#8a7060" strokeWidth="1" opacity="0.4"/>
        </svg>
      </div>
      <h1 className={styles.title}>CHIPIE MIAM</h1>
      <p className={styles.sub}>Le guide de ton lapin 🥕</p>
      <div className={styles.dots}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  )
}

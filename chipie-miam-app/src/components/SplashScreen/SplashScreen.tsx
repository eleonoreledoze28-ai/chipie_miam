import { useState, useEffect } from 'react'
import ChipieCharacter from '../ChipieCharacter/ChipieCharacter'
import type { ChipieMood } from '../ChipieCharacter/ChipieCharacter'
import styles from './SplashScreen.module.css'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false)
  // Chipie dort, puis se réveille et grignote sa carotte pendant le chargement
  const [mood, setMood] = useState<ChipieMood>('sleep')

  useEffect(() => {
    const t0 = setTimeout(() => setMood('surprised'), 500)
    const t1 = setTimeout(() => setMood('eat'), 900)
    const t2 = setTimeout(() => setFading(true), 1700)
    const t3 = setTimeout(onDone, 2200)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div className={`${styles.splash} ${fading ? styles.fading : ''}`}>
      <div className={styles.rabbit}>
        <ChipieCharacter mood={mood} size={180} />
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

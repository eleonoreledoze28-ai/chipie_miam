import { useState, useRef } from 'react'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './Tutorial.module.css'

interface Props { onDone: () => void }

function saveNom(nom: string) {
  const key = `chipie_profil_${getActiveProfileId()}`
  try {
    const raw = localStorage.getItem(key)
    const current = raw ? JSON.parse(raw) : {}
    localStorage.setItem(key, JSON.stringify({ ...current, nom: nom.trim() || 'Chipie' }))
    // notify external store
    window.dispatchEvent(new StorageEvent('storage', { key }))
  } catch { /* ignore */ }
}

const FEATURES = [
  { emoji: '📚', label: 'Guide alimentaire' },
  { emoji: '📔', label: 'Journal repas' },
  { emoji: '🎮', label: '16 mini-jeux' },
  { emoji: '🩺', label: 'Carnet santé' },
  { emoji: '📺', label: 'Breaking News' },
  { emoji: '⚖️', label: 'Le procès' },
  { emoji: '💌', label: 'Chipie t\'écrit' },
  { emoji: '🎭', label: 'Déguisements' },
]

export default function Tutorial({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const [nom, setNom] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const TOTAL = 5

  function goNext() {
    if (step === 1 && nom.trim()) saveNom(nom)
    if (step === TOTAL - 1) { onDone(); return }
    setStep(s => s + 1)
  }

  function goPrev() {
    if (step === 0) return
    setStep(s => s - 1)
  }

  const displayName = nom.trim() || 'ton lapin'

  return (
    <div className={styles.overlay}>
      <div className={styles.sheet}>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className={`${styles.step} ${styles.stepIn}`} key="s0">
            <div className={styles.heroBg} style={{ background: 'linear-gradient(160deg, #1a0a00 0%, #3d1f00 50%, #1a0a00 100%)' }}>
              <div className={styles.heroRabbit}>
                <span className={styles.heroEmoji}>🐰</span>
                <div className={styles.heroBubble}>
                  <span className={styles.bubbleText}>Psst… c'est moi !</span>
                </div>
              </div>
              <div className={styles.sparkles}>
                <span style={{ '--d': '0s', '--x': '15%', '--y': '20%' } as React.CSSProperties}>✦</span>
                <span style={{ '--d': '0.3s', '--x': '80%', '--y': '15%' } as React.CSSProperties}>✦</span>
                <span style={{ '--d': '0.6s', '--x': '70%', '--y': '75%' } as React.CSSProperties}>✦</span>
                <span style={{ '--d': '0.9s', '--x': '20%', '--y': '80%' } as React.CSSProperties}>✦</span>
              </div>
            </div>
            <div className={styles.stepBody}>
              <h1 className={styles.bigTitle}>Bienvenue dans<br /><span className={styles.appName}>Chipie Miam</span></h1>
              <p className={styles.bigDesc}>L'application faite pour les lapins (et leurs humains dévoués).</p>
            </div>
          </div>
        )}

        {/* Step 1 — Name setup */}
        {step === 1 && (
          <div className={`${styles.step} ${styles.stepIn}`} key="s1">
            <div className={styles.heroBg} style={{ background: 'linear-gradient(160deg, #0d1a0a 0%, #1a3a10 50%, #0d1a0a 100%)' }}>
              <div className={styles.heroCenter}>
                <span className={styles.heroEmojiLg}>🐇</span>
              </div>
            </div>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Comment s'appelle<br />ton lapin ?</h2>
              <p className={styles.stepDesc}>Je personnaliserai toute l'app avec son prénom.</p>
              <div className={styles.nameInputWrap}>
                <input
                  ref={inputRef}
                  className={styles.nameInput}
                  placeholder="Ex : Chipie, Noisette…"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && goNext()}
                  maxLength={20}
                  autoFocus
                />
                <span className={styles.nameInputEmoji}>✏️</span>
              </div>
              {nom.trim() && (
                <p className={styles.namePreview}>Super, bonjour <strong>{nom.trim()}</strong> 🐰</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Daily use */}
        {step === 2 && (
          <div className={`${styles.step} ${styles.stepIn}`} key="s2">
            <div className={styles.heroBg} style={{ background: 'linear-gradient(160deg, #0a0d1a 0%, #101c3a 50%, #0a0d1a 100%)' }}>
              <div className={styles.dualCards}>
                <div className={styles.miniCard}>
                  <span className={styles.miniCardEmoji}>📚</span>
                  <span className={styles.miniCardTitle}>Guide</span>
                  <span className={styles.miniCardSub}>Ce que mange {displayName}</span>
                </div>
                <div className={styles.miniCard}>
                  <span className={styles.miniCardEmoji}>📔</span>
                  <span className={styles.miniCardTitle}>Journal</span>
                  <span className={styles.miniCardSub}>Ses repas du jour</span>
                </div>
              </div>
            </div>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Le quotidien de {displayName}</h2>
              <p className={styles.stepDesc}>Consulte le guide pour savoir ce qu'il·elle peut manger, puis note ses repas dans le journal pour suivre son alimentation.</p>
            </div>
          </div>
        )}

        {/* Step 3 — Features grid */}
        {step === 3 && (
          <div className={`${styles.step} ${styles.stepIn}`} key="s3">
            <div className={styles.heroBg} style={{ background: 'linear-gradient(160deg, #1a0a18 0%, #3a1038 50%, #1a0a18 100%)' }}>
              <div className={styles.featuresGrid}>
                {FEATURES.map((f, i) => (
                  <div key={i} className={styles.featureChip} style={{ animationDelay: `${i * 60}ms` }}>
                    <span className={styles.featureEmoji}>{f.emoji}</span>
                    <span className={styles.featureLabel}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Et plein de surprises</h2>
              <p className={styles.stepDesc}>Journal de santé, jeux, faits secrets, procès de {displayName}, breaking news… tout ça depuis la page Profil.</p>
            </div>
          </div>
        )}

        {/* Step 4 — Let's go */}
        {step === 4 && (
          <div className={`${styles.step} ${styles.stepIn}`} key="s4">
            <div className={styles.heroBg} style={{ background: 'linear-gradient(160deg, #1a1000 0%, #3d2a00 50%, #1a1000 100%)' }}>
              <div className={styles.launchCenter}>
                <span className={styles.launchEmoji}>🎉</span>
                <div className={styles.launchConfetti}>
                  {['🥕','🌿','🌸','✨','🐰','🍃'].map((e, i) => (
                    <span key={i} className={styles.confettiPiece} style={{ '--ci': i } as React.CSSProperties}>{e}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>C'est parti{nom.trim() ? ` avec ${nom.trim()}` : ''} !</h2>
              <p className={styles.stepDesc}>L'aventure commence maintenant. Explore, joue, et prends soin de {displayName} comme un·e pro.</p>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className={styles.dots}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === step ? styles.dotActive : i < step ? styles.dotDone : ''}`}
              onClick={() => { setStep(i) }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {step > 0 && (
            <button className={styles.prevBtn} onClick={goPrev}>←</button>
          )}
          <button className={styles.nextBtn} onClick={goNext} style={{ flex: step === 0 ? '1' : undefined }}>
            {step === TOTAL - 1 ? `🐰 Allons-y !` : 'Suivant →'}
          </button>
          {step === 0 && (
            <button className={styles.skipBtn} onClick={onDone}>Passer</button>
          )}
        </div>

      </div>
    </div>
  )
}

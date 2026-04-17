import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { useProfil } from '../../hooks/useProfil'
import styles from './TinderLegumesPage.module.css'

interface Prefs { likes: string[]; dislikes: string[] }

function storageKey() { return `chipie-tinder-${getActiveProfileId()}` }
function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(storageKey())
    return raw ? JSON.parse(raw) : { likes: [], dislikes: [] }
  } catch { return { likes: [], dislikes: [] } }
}
function savePrefs(p: Prefs) { localStorage.setItem(storageKey(), JSON.stringify(p)) }

const SWIPEABLE = VEGETAUX.filter(v => v.restriction !== 'a_eviter')
const catEmojiMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c.emoji]))

export default function TinderLegumesPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [index, setIndex] = useState(() => {
    const saved = loadPrefs()
    const rated = new Set([...saved.likes, ...saved.dislikes])
    return SWIPEABLE.findIndex(v => !rated.has(v.id))
  })
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null)
  const touchStartX = useRef<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const ratedCount = prefs.likes.length + prefs.dislikes.length
  const remaining = SWIPEABLE.length - ratedCount
  const isFinished = remaining === 0 || index >= SWIPEABLE.length

  const currentVeg = SWIPEABLE[index] ?? null

  const rate = useCallback((liked: boolean) => {
    if (!currentVeg) return
    const dir = liked ? 'right' : 'left'
    setSwipeDir(dir)
    setTimeout(() => {
      const next: Prefs = {
        likes: liked ? [...prefs.likes, currentVeg.id] : prefs.likes,
        dislikes: !liked ? [...prefs.dislikes, currentVeg.id] : prefs.dislikes,
      }
      savePrefs(next)
      setPrefs(next)
      setIndex(i => i + 1)
      setSwipeDir(null)
    }, 280)
  }, [currentVeg, prefs])

  const reset = useCallback(() => {
    const empty = { likes: [], dislikes: [] }
    savePrefs(empty)
    setPrefs(empty)
    setIndex(0)
    setSwipeDir(null)
  }, [])

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 60) return
    rate(delta > 0)
  }

  // Top liked vegetables
  const topLiked = useMemo(() =>
    SWIPEABLE.filter(v => prefs.likes.includes(v.id)).slice(0, 6),
    [prefs.likes]
  )

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
        {ratedCount > 0 && (
          <button className={styles.resetBtn} onClick={reset}>Recommencer</button>
        )}
      </div>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>👈👉</span>
        <div>
          <h1 className={styles.title}>Tinder des légumes</h1>
          <p className={styles.subtitle}>{profil.nom} aime ou aime pas ?</p>
        </div>
      </div>

      {/* Progress */}
      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(ratedCount / SWIPEABLE.length) * 100}%` }} />
        </div>
        <span className={styles.progressLabel}>{ratedCount} / {SWIPEABLE.length}</span>
      </div>

      {!isFinished && currentVeg ? (
        <>
          {/* Swipe hints */}
          <div className={styles.hints}>
            <span className={styles.hintLeft}>👈 Non merci</span>
            <span className={styles.hintRight}>Délicieux ! 👉</span>
          </div>

          {/* Card */}
          <div
            ref={cardRef}
            className={`${styles.card} ${swipeDir === 'left' ? styles.cardLeft : swipeDir === 'right' ? styles.cardRight : ''}`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {swipeDir === 'left'  && <div className={styles.nope}>NON 💔</div>}
            {swipeDir === 'right' && <div className={styles.like}>OUI 💚</div>}

            <span className={styles.vegEmoji}>{catEmojiMap[currentVeg.categorie] ?? '🥗'}</span>
            <h2 className={styles.vegName}>{currentVeg.nom}</h2>
            <p className={styles.vegLatin}>{currentVeg.nomLatin}</p>
            <span className={`${styles.badge} ${currentVeg.restriction === 'petite_quantite' ? styles.badgeModere : styles.badgeOk}`}>
              {currentVeg.restriction === 'petite_quantite' ? '⚠️ Petite quantité' : '✅ Recommandé'}
            </span>
          </div>

          {/* Buttons */}
          <div className={styles.btns}>
            <button className={styles.btnNope} onClick={() => rate(false)}>💔 Non</button>
            <button className={styles.btnLike} onClick={() => rate(true)}>💚 Oui !</button>
          </div>
        </>
      ) : (
        /* Summary */
        <div className={styles.summary}>
          <span className={styles.summaryEmoji}>🎉</span>
          <h2 className={styles.summaryTitle}>{profil.nom} a tout goûté !</h2>

          <div className={styles.scores}>
            <div className={styles.scoreBox}>
              <span className={styles.scoreNum}>{prefs.likes.length}</span>
              <span className={styles.scoreLbl}>💚 Adorés</span>
            </div>
            <div className={styles.scoreDivider} />
            <div className={styles.scoreBox}>
              <span className={styles.scoreNum}>{prefs.dislikes.length}</span>
              <span className={styles.scoreLbl}>💔 Boudés</span>
            </div>
          </div>

          {topLiked.length > 0 && (
            <div className={styles.topLiked}>
              <p className={styles.topLikedTitle}>💚 Les chouchous de {profil.nom}</p>
              <div className={styles.topLikedGrid}>
                {topLiked.map(v => (
                  <div key={v.id} className={styles.topLikedItem}>
                    <span className={styles.topEmoji}>{catEmojiMap[v.categorie] ?? '🥗'}</span>
                    <span className={styles.topName}>{v.nom}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className={styles.resetBtn2} onClick={reset}>🔄 Recommencer</button>
        </div>
      )}
    </div>
  )
}

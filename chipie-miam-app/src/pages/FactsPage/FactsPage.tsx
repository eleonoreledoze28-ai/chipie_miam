import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FACTS, CATEGORIE_LABELS } from '../../data/facts'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './FactsPage.module.css'

function storageKey() { return `chipie-facts-${getActiveProfileId()}` }
function lastRevealKey() { return `chipie-facts-last-${getActiveProfileId()}` }

function loadRevealed(): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey())
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function saveRevealed(set: Set<string>) {
  localStorage.setItem(storageKey(), JSON.stringify([...set]))
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function FactsPage() {
  const navigate = useNavigate()
  const [revealed, setRevealed] = useState<Set<string>>(loadRevealed)
  const [lastRevealed, setLastRevealed] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string | null>(null)

  const canRevealToday = useMemo(() => {
    const last = localStorage.getItem(lastRevealKey())
    return last !== todayStr()
  }, [])

  const nextUnrevealed = useMemo(() =>
    FACTS.find(f => !revealed.has(f.id)) ?? null,
    [revealed]
  )

  const handleReveal = useCallback(() => {
    if (!canRevealToday || !nextUnrevealed) return
    const next = new Set(revealed)
    next.add(nextUnrevealed.id)
    saveRevealed(next)
    localStorage.setItem(lastRevealKey(), todayStr())
    setRevealed(next)
    setLastRevealed(nextUnrevealed.id)
  }, [canRevealToday, nextUnrevealed, revealed])

  const allDone = revealed.size >= FACTS.length

  const cats = useMemo(() => [...new Set(FACTS.map(f => f.categorie))], [])

  const displayed = useMemo(() =>
    FACTS.filter(f => !filterCat || f.categorie === filterCat),
    [filterCat]
  )

  const newFact = lastRevealed ? FACTS.find(f => f.id === lastRevealed) : null

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
      </div>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>🔮</span>
        <div>
          <h1 className={styles.title}>Chipie Facts</h1>
          <p className={styles.subtitle}>Secrets sur la vie des lapins</p>
        </div>
      </div>

      {/* Progress */}
      <div className={styles.progressCard}>
        <div className={styles.progressTop}>
          <span className={styles.progressLabel}>Collection débloquée</span>
          <span className={styles.progressCount}>{revealed.size} / {FACTS.length}</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(revealed.size / FACTS.length) * 100}%` }} />
        </div>
        {allDone && <p className={styles.allDoneMsg}>🏆 Collection complète ! Tu sais tout sur les lapins.</p>}
      </div>

      {/* Newly revealed fact */}
      {newFact && (
        <div className={styles.newCard}>
          <div className={styles.newBadge}>✨ Nouveau fait débloqué !</div>
          <span className={styles.newEmoji}>{newFact.emoji}</span>
          <p className={styles.newText}>{newFact.texte}</p>
          <span className={styles.newCat}>{CATEGORIE_LABELS[newFact.categorie]}</span>
        </div>
      )}

      {/* Reveal button */}
      {!allDone && (
        <button
          className={`${styles.revealBtn} ${!canRevealToday ? styles.revealBtnDisabled : ''}`}
          onClick={handleReveal}
          disabled={!canRevealToday}
        >
          {canRevealToday
            ? '🔮 Révéler le fait du jour'
            : `✓ Fait révélé aujourd'hui — reviens demain`}
        </button>
      )}

      {/* Category filters */}
      <div className={styles.filters}>
        <button
          className={`${styles.filter} ${!filterCat ? styles.filterActive : ''}`}
          onClick={() => setFilterCat(null)}
        >Tous</button>
        {cats.map(c => (
          <button
            key={c}
            className={`${styles.filter} ${filterCat === c ? styles.filterActive : ''}`}
            onClick={() => setFilterCat(c)}
          >
            {CATEGORIE_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Facts grid */}
      <div className={styles.grid}>
        {displayed.map(fact => {
          const isRevealed = revealed.has(fact.id)
          const isNew = fact.id === lastRevealed
          return (
            <div
              key={fact.id}
              className={`${styles.factCard} ${isRevealed ? styles.factRevealed : styles.factLocked} ${isNew ? styles.factNew : ''}`}
            >
              <span className={styles.factEmoji}>{isRevealed ? fact.emoji : '🔒'}</span>
              {isRevealed ? (
                <>
                  <p className={styles.factText}>{fact.texte}</p>
                  <span className={styles.factCat}>{CATEGORIE_LABELS[fact.categorie]}</span>
                </>
              ) : (
                <p className={styles.factLockText}>Mystère…</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES, type Vegetal } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './AssiettePage.module.css'

// ===== Audio hook (lightweight, inline) =====
function useAssetteAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const MUTE_KEY = 'chipie-assiette-muted'

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])

  const isMuted = useCallback(() => { try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false } }, [MUTE_KEY])
  const vibrate = useCallback((p: number | number[]) => { try { navigator?.vibrate?.(p) } catch { /* */ } }, [])

  const tone = useCallback((freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.1) => {
    if (isMuted()) return
    try {
      const ctx = getCtx(); const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime)
      g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime); o.stop(ctx.currentTime + dur)
    } catch { /* */ }
  }, [getCtx, isMuted])

  const playGood = useCallback(() => { tone(880, 0.1, 'sine', 0.1); setTimeout(() => tone(1100, 0.12, 'sine', 0.08), 70); vibrate(20) }, [tone, vibrate])
  const playModerate = useCallback(() => { tone(660, 0.12, 'triangle', 0.08); vibrate(15) }, [tone, vibrate])
  const playBad = useCallback(() => { tone(200, 0.15, 'sawtooth', 0.1); setTimeout(() => tone(150, 0.2, 'sawtooth', 0.08), 100); vibrate(120) }, [tone, vibrate])
  const playRound = useCallback(() => { tone(523, 0.08, 'sine', 0.06); setTimeout(() => tone(659, 0.1, 'sine', 0.06), 80) }, [tone])
  const playWin = useCallback(() => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sine', 0.1), i * 100)); vibrate([40, 30, 40, 30, 80, 40, 120]) }, [tone, vibrate])
  const playLose = useCallback(() => { tone(300, 0.3, 'sawtooth', 0.07); setTimeout(() => tone(200, 0.4, 'sawtooth', 0.05), 200); vibrate([80, 40, 150]) }, [tone, vibrate])
  const playCombo = useCallback((n: number) => { tone(600 + n * 80, 0.08, 'sine', 0.08); vibrate(10) }, [tone, vibrate])
  const playTick = useCallback(() => { tone(1000, 0.025, 'square', 0.03) }, [tone])

  return useMemo(() => ({ playGood, playModerate, playBad, playRound, playWin, playLose, playCombo, playTick, isMuted, vibrate, MUTE_KEY }),
    [playGood, playModerate, playBad, playRound, playWin, playLose, playCombo, playTick, isMuted, vibrate, MUTE_KEY])
}

// ===== Types =====
interface Level {
  id: string; label: string; emoji: string; desc: string
  cols: number; rows: number; timeLimit: number; rounds: number; dangerCount: number; moderateCount: number
}

const LEVELS: Level[] = [
  { id: 'facile', label: 'Facile', emoji: '🌱', desc: '6 aliments, 15s, 5 rounds', cols: 3, rows: 2, timeLimit: 15, rounds: 5, dangerCount: 1, moderateCount: 1 },
  { id: 'normal', label: 'Normal', emoji: '🌿', desc: '8 aliments, 12s, 7 rounds', cols: 4, rows: 2, timeLimit: 12, rounds: 7, dangerCount: 2, moderateCount: 2 },
  { id: 'difficile', label: 'Difficile', emoji: '🔥', desc: '10 aliments, 8s, 10 rounds', cols: 5, rows: 2, timeLimit: 8, rounds: 10, dangerCount: 3, moderateCount: 2 },
]

const BEST_KEY = 'chipie-assiette-best'

// ===== Helpers =====
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

function getPool() {
  const all = VEGETAUX.filter(v => v.image && !v.image.includes('placeholder'))
  return {
    safe: all.filter(v => v.restriction === 'aucune'),
    moderate: all.filter(v => v.restriction === 'petite_quantite'),
    danger: all.filter(v => v.restriction === 'a_eviter'),
  }
}

function pickRound(level: Level): Vegetal[] {
  const { safe, moderate, danger } = getPool()
  const total = level.cols * level.rows
  const safeCount = total - level.dangerCount - level.moderateCount
  const picked: Vegetal[] = [
    ...shuffle(safe).slice(0, safeCount),
    ...shuffle(moderate).slice(0, level.moderateCount),
    ...shuffle(danger).slice(0, level.dangerCount),
  ]
  return shuffle(picked).slice(0, total)
}

function loadBest(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}') } catch { return {} }
}

function saveBest(levelId: string, score: number): boolean {
  const bests = loadBest()
  if (!bests[levelId] || score > bests[levelId]) {
    bests[levelId] = score
    localStorage.setItem(BEST_KEY, JSON.stringify(bests))
    return true
  }
  return false
}

type Screen = 'select' | 'play' | 'end'
interface FloatingText { id: string; text: string; type: 'good' | 'moderate' | 'bad'; x: number; y: number }

// ===== Component =====
export default function AssiettePage() {
  const navigate = useNavigate()
  const audio = useAssetteAudio()
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem(audio.MUTE_KEY) === '1' } catch { return false } })

  const [screen, setScreen] = useState<Screen>('select')
  const [level, setLevel] = useState<Level>(LEVELS[0])
  const [round, setRound] = useState(1)
  const [roundItems, setRoundItems] = useState<Vegetal[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [plate, setPlate] = useState<Vegetal[]>([])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [moderateThisRound, setModerateThisRound] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [categoriesUsed, setCategoriesUsed] = useState<Set<string>>(new Set())
  const [floats, setFloats] = useState<FloatingText[]>([])
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [shakeItem, setShakeItem] = useState<string | null>(null)
  const [roundAnim, setRoundAnim] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const toggleMute = useCallback(() => {
    setMuted(prev => { const n = !prev; try { localStorage.setItem(audio.MUTE_KEY, n ? '1' : '0') } catch { /* */ } return n })
  }, [audio.MUTE_KEY])

  // Start a new round
  const startRound = useCallback((lvl: Level, roundNum: number) => {
    setRoundItems(pickRound(lvl))
    setSelected(new Set())
    setModerateThisRound(0)
    setTimeLeft(lvl.timeLimit)
    setRound(roundNum)
    setFloats([])
    setShakeItem(null)
    setRoundAnim(true)
    setTimeout(() => setRoundAnim(false), 400)
    audio.playRound()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startGame = useCallback((lvl: Level) => {
    setLevel(lvl)
    setScore(0)
    setCombo(0)
    setBestCombo(0)
    setPlate([])
    setCategoriesUsed(new Set())
    setIsNewRecord(false)
    setScreen('play')
    startRound(lvl, 1)
  }, [startRound])

  // Timer
  useEffect(() => {
    if (screen !== 'play') { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Next round or end
          if (round >= level.rounds) {
            setScreen('end')
            return 0
          }
          startRound(level, round + 1)
          return level.timeLimit
        }
        if (prev <= 4) audio.playTick()
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, round, level])

  // End game effects
  useEffect(() => {
    if (screen === 'end') {
      const finalScore = score + categoriesUsed.size * 5
      if (finalScore > 0) {
        audio.playWin()
        setIsNewRecord(saveBest(level.id, finalScore))
      } else {
        audio.playLose()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  // Select an item
  const selectItem = useCallback((item: Vegetal, idx: number) => {
    if (selected.has(item.id) || screen !== 'play') return

    setSelected(prev => new Set(prev).add(item.id))

    const rect = document.getElementById(`food-${idx}`)?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : 160
    const y = rect ? rect.top : 300

    if (item.restriction === 'a_eviter') {
      // Bad!
      audio.playBad()
      setScore(s => s - 15)
      setCombo(0)
      setShakeItem(item.id)
      setTimeout(() => setShakeItem(null), 400)
      setFloats(prev => [...prev, { id: `${item.id}-${Date.now()}`, text: '-15', type: 'bad', x, y }])
    } else if (item.restriction === 'petite_quantite') {
      const newModCount = moderateThisRound + 1
      setModerateThisRound(newModCount)
      if (newModCount <= 2) {
        audio.playModerate()
        setScore(s => s + 5)
        setCombo(c => { const n = c + 1; if (n > bestCombo) setBestCombo(n); audio.playCombo(n); return n })
        setFloats(prev => [...prev, { id: `${item.id}-${Date.now()}`, text: '+5', type: 'moderate', x, y }])
      } else {
        audio.playBad()
        setScore(s => s - 5)
        setCombo(0)
        setFloats(prev => [...prev, { id: `${item.id}-${Date.now()}`, text: '-5 (exces)', type: 'bad', x, y }])
      }
      setPlate(p => [...p, item])
      setCategoriesUsed(prev => new Set(prev).add(item.categorie))
    } else {
      // Good!
      audio.playGood()
      setScore(s => s + 10)
      setCombo(c => { const n = c + 1; if (n > bestCombo) setBestCombo(n); audio.playCombo(n); return n })
      setFloats(prev => [...prev, { id: `${item.id}-${Date.now()}`, text: '+10', type: 'good', x, y }])
      setPlate(p => [...p, item])
      setCategoriesUsed(prev => new Set(prev).add(item.categorie))
    }

    // Clear old floats
    setTimeout(() => setFloats(prev => prev.slice(-6)), 1000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, screen, moderateThisRound, bestCombo])

  // Skip to next round
  const nextRound = useCallback(() => {
    if (round >= level.rounds) {
      setScreen('end')
    } else {
      startRound(level, round + 1)
    }
  }, [round, level, startRound])

  // Scoring
  const finalScore = score + categoriesUsed.size * 5
  const getStars = () => {
    const maxPossible = level.rounds * (level.cols * level.rows - level.dangerCount) * 10
    const ratio = finalScore / maxPossible
    if (ratio >= 0.7) return 3
    if (ratio >= 0.4) return 2
    if (finalScore > 0) return 1
    return 0
  }

  const cat = (id: string) => CATEGORIES.find(c => c.id === id)
  const allBest = loadBest()

  // ===== RENDER =====

  if (screen === 'select') {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.back} onClick={() => navigate('/jeu')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            <span>Retour</span>
          </button>
          <button className={styles.muteBtn} onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
        </div>

        <div className={styles.levelScreen}>
          <span className={styles.levelEmoji}>🍽️</span>
          <h1 className={styles.levelTitle}>Assiette de Chipie</h1>
          <p className={styles.levelSubtitle}>Composez le repas ideal pour Chipie !</p>

          <div className={styles.levelCards}>
            {LEVELS.map(lvl => {
              const best = allBest[lvl.id]
              return (
                <button key={lvl.id} className={styles.levelCard} onClick={() => startGame(lvl)}>
                  <span className={styles.cardEmoji}>{lvl.emoji}</span>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardLabel}>{lvl.label}</span>
                    <span className={styles.cardDesc}>{lvl.desc}</span>
                    {best != null && <span className={styles.cardBest}>Record : {best} pts</span>}
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              )
            })}
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>✅ Bon = +10</span>
            <span className={styles.legendItem}>⚠️ Modere = +5</span>
            <span className={styles.legendItem}>❌ Toxique = -15</span>
            <span className={styles.legendItem}>🌈 Diversite bonus</span>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'end') {
    const stars = getStars()
    return (
      <div className={styles.page}>
        <div className={styles.endScreen}>
          {finalScore > 0 && <div className={styles.confetti} aria-hidden>{'🎊🥕🌿⭐✨🍽️'.split('').map((e, i) => (
            <span key={i} className={styles.confettiItem} style={{ animationDelay: `${i * 0.12}s`, left: `${10 + i * 14}%` }}>{e}</span>
          ))}</div>}

          <span className={styles.endEmoji}>{finalScore > 0 ? '🎉' : '😢'}</span>
          <h2 className={styles.endTitle}>{finalScore > 0 ? 'Bravo !' : 'Oups...'}</h2>
          <span className={styles.endBadge}>{level.emoji} {level.label}</span>

          {isNewRecord && <div className={styles.newRecord}>Nouveau record !</div>}

          {stars > 0 && (
            <div className={styles.endStars}>
              {[1, 2, 3].map(i => (
                <span key={i} className={`${styles.star} ${i <= stars ? styles.starFilled : ''}`}>⭐</span>
              ))}
            </div>
          )}

          <div className={styles.endStats}>
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{finalScore}</span>
              <span className={styles.endStatLabel}>score</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{plate.length}</span>
              <span className={styles.endStatLabel}>aliments</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>{categoriesUsed.size}</span>
              <span className={styles.endStatLabel}>categories</span>
            </div>
            <div className={styles.endDivider} />
            <div className={styles.endStat}>
              <span className={styles.endStatNum}>x{bestCombo}</span>
              <span className={styles.endStatLabel}>combo</span>
            </div>
          </div>

          {categoriesUsed.size > 0 && (
            <div className={styles.endDiversity}>
              {[...categoriesUsed].map(c => <span key={c}>{cat(c)?.emoji} {cat(c)?.nom}</span>)}
            </div>
          )}

          <p className={styles.endMsg}>
            {stars >= 3 ? 'Chipie est ravie ! Un repas parfaitement equilibre !' :
             stars >= 2 ? 'Bien joue ! Chipie a bien mange !' :
             finalScore > 0 ? 'Pas mal, mais Chipie merite mieux !' :
             'Chipie a mal au ventre... Attention aux aliments toxiques !'}
          </p>

          <div className={styles.endActions}>
            <button className={styles.restartBtn} onClick={() => startGame(level)}>Rejouer ({level.label})</button>
            <button className={styles.changeLvlBtn} onClick={() => setScreen('select')}>Changer de niveau</button>
          </div>
          <button className={styles.backBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
        </div>
      </div>
    )
  }

  // Timer progress (0 to 1)
  const timerProgress = level.timeLimit > 0 ? timeLeft / level.timeLimit : 1
  const timerStroke = Math.PI * 2 * 18 // circumference for r=18
  const timerOffset = timerStroke * (1 - timerProgress)

  // ===== Play screen =====
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          <span>Retour</span>
        </button>
        <button className={styles.muteBtn} onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
      </div>

      <h1 className={styles.title}>🍽️ Assiette <span className={styles.diffBadge}>{level.emoji} {level.label}</span></h1>

      {/* Floating score texts */}
      {floats.map(f => (
        <div key={f.id} className={`${styles.floatingText} ${styles[`float_${f.type}`]}`}
          style={{ left: f.x, top: f.y }}>{f.text}</div>
      ))}

      {/* Stats bar with circular timer */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{score}</span>
          <span className={styles.statLabel}>Score</span>
        </div>
        <div className={styles.statDivider} />

        {/* Circular timer */}
        <div className={styles.timerCircle}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
            <circle cx="22" cy="22" r="18" fill="none"
              stroke={timeLeft <= 3 ? 'var(--accent-red, #ff3b30)' : 'var(--accent-orange)'}
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={timerStroke} strokeDashoffset={timerOffset}
              transform="rotate(-90 22 22)"
              className={timeLeft <= 3 ? styles.timerUrgent : ''}
            />
          </svg>
          <span className={`${styles.timerText} ${timeLeft <= 3 ? styles.timerTextDanger : ''}`}>{timeLeft}</span>
        </div>

        <div className={styles.statDivider} />
        <div className={`${styles.stat} ${combo >= 3 ? styles.statComboGlow : ''}`}>
          <span className={styles.statNum}>x{combo}</span>
          <span className={styles.statLabel}>Combo</span>
        </div>
      </div>

      {/* Round dots */}
      <div className={styles.roundDots}>
        {Array.from({ length: level.rounds }, (_, i) => (
          <span key={i} className={`${styles.dot} ${i + 1 < round ? styles.dotDone : ''} ${i + 1 === round ? styles.dotCurrent : ''}`} />
        ))}
      </div>

      {/* Plate preview (circular plate shape) */}
      <div className={styles.plateArea}>
        <div className={`${styles.plate} ${plate.length > 0 ? styles.plateFilled : ''}`}>
          <div className={styles.plateInner}>
            {plate.slice(-10).map((p, i) => (
              <img key={`${p.id}-${i}`} src={assetUrl(p.image)} alt="" className={styles.plateItem}
                style={{ animationDelay: `${i * 0.05}s` }} />
            ))}
            {plate.length === 0 && <span className={styles.plateEmpty}>Tapez les bons aliments !</span>}
          </div>
          {/* Category badges around plate */}
          {categoriesUsed.size > 0 && (
            <div className={styles.plateCats}>
              {[...categoriesUsed].slice(-5).map(c => (
                <span key={c} className={styles.plateCat}>{cat(c)?.emoji}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Food grid with stagger animation */}
      <div className={`${styles.foodGrid} ${roundAnim ? styles.foodGridEnter : ''}`} style={{ gridTemplateColumns: `repeat(${level.cols}, 1fr)` }}>
        {roundItems.map((item, idx) => {
          const isSelected = selected.has(item.id)
          const isShaking = shakeItem === item.id
          const itemCat = cat(item.categorie)

          const cardClasses = [
            styles.foodCard,
            isSelected ? styles.foodSelected : '',
            isShaking ? styles.foodShake : '',
            isSelected && item.restriction === 'a_eviter' ? styles.foodBad : '',
            isSelected && item.restriction === 'aucune' ? styles.foodGood : '',
            isSelected && item.restriction === 'petite_quantite' ? styles.foodModerate : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={`${item.id}-${round}`}
              id={`food-${idx}`}
              className={cardClasses}
              style={{ animationDelay: `${idx * 0.05}s` }}
              onClick={() => selectItem(item, idx)}
              disabled={isSelected}
            >
              <div className={styles.foodImgWrap}>
                <img src={assetUrl(item.image)} alt="" className={styles.foodImg} />
                <span className={styles.foodCatBadge}>{itemCat?.emoji}</span>
              </div>
              <span className={styles.foodName}>{item.nom}</span>
              {isSelected && item.restriction === 'a_eviter' && <span className={styles.foodBadge}>❌</span>}
              {isSelected && item.restriction === 'aucune' && <span className={styles.foodBadge}>✅</span>}
              {isSelected && item.restriction === 'petite_quantite' && <span className={styles.foodBadge}>⚠️</span>}
            </button>
          )
        })}
      </div>

      {/* Skip round button */}
      <button className={styles.skipBtn} onClick={nextRound}>
        {round >= level.rounds ? 'Terminer' : `Round suivant (${round}/${level.rounds})`}
      </button>
    </div>
  )
}

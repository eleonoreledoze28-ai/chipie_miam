import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './CheminSaisonsPage.module.css'

// ── Board definition ────────────────────────────────────────────────────────
type SquareType = 'normal' | 'question' | 'bonus' | 'malus' | 'vet' | 'food' | 'end'
type Season     = 'spring' | 'summer' | 'autumn' | 'winter'

const SEASON_OF: Record<number, Season> = {
  1:'spring',2:'spring',3:'spring',4:'spring',5:'spring',6:'spring',
  7:'summer',8:'summer',9:'summer',10:'summer',11:'summer',12:'summer',
  13:'autumn',14:'autumn',15:'autumn',16:'autumn',17:'autumn',18:'autumn',
  19:'winter',20:'winter',21:'winter',22:'winter',23:'winter',24:'winter',
}

const SQUARE_TYPE: Record<number, SquareType> = {
  1:'normal', 2:'question', 3:'food',     4:'bonus',    5:'question', 6:'normal',
  7:'question',8:'malus',   9:'normal',  10:'question', 11:'vet',    12:'bonus',
  13:'question',14:'normal',15:'food',   16:'malus',   17:'question',18:'normal',
  19:'question',20:'bonus', 21:'vet',    22:'malus',   23:'question',24:'end',
}

// Snake display rows: [visual left→right] for positions in path order
const DISPLAY_ROWS: number[][] = [
  [1,  2,  3,  4,  5,  6],
  [12, 11, 10, 9,  8,  7],
  [13, 14, 15, 16, 17, 18],
  [24, 23, 22, 21, 20, 19],
]

const SEASON_LABEL: Record<Season, string> = {
  spring: 'Printemps 🌸',
  summer: 'Été ☀️',
  autumn: 'Automne 🍂',
  winter: 'Hiver ❄️',
}

const SQUARE_ICON: Record<SquareType, string> = {
  normal:   '',
  question: '❓',
  bonus:    '⭐',
  malus:    '⬇️',
  vet:      '🩺',
  food:     '🥕',
  end:      '🏁',
}

const SEASONAL_FOODS: Record<Season, string[]> = {
  spring: ['Chipie croque du pissenlit frais 🌼', 'Chipie mange des feuilles de fraisier 🌿'],
  summer: ['Chipie a droit à une petite fraise 🍓', 'Chipie grignote de la courgette fraîche 🥒'],
  autumn: ['Chipie mange un quartier de pomme 🍎', 'Chipie croque une tranche de carotte 🥕'],
  winter: ['Chipie a du foin bien chaud 🌾', 'Chipie mange une belle feuille de chou frisé 🥬'],
}

// ── Questions ───────────────────────────────────────────────────────────────
interface Question { q: string; answer: boolean; explication: string }

const QUESTIONS: Question[] = [
  { q: 'Le foin doit représenter plus de 80% de l\'alimentation d\'un lapin.', answer: true,  explication: 'Le foin est essentiel pour la digestion et l\'usure des dents !' },
  { q: 'Les carottes peuvent être données sans limite à un lapin.',             answer: false, explication: 'Les carottes sont sucrées, elles se donnent avec modération.' },
  { q: 'L\'avocat est toxique pour les lapins.',                                answer: true,  explication: 'L\'avocat contient de la persin, très dangereuse pour les lapins.' },
  { q: 'Le pissenlit est un des aliments préférés des lapins.',                 answer: true,  explication: 'Le pissenlit est nutritif et adoré des lapins !' },
  { q: 'Le chocolat peut être donné en toute petite quantité à un lapin.',     answer: false, explication: 'Le chocolat est toujours toxique pour les lapins, même en petite dose.' },
  { q: 'Les lapins produisent leur propre vitamine C.',                         answer: true,  explication: 'Contrairement aux cobayes, les lapins synthétisent leur vitamine C.' },
  { q: 'La rhubarbe est dangereuse pour les lapins.',                           answer: true,  explication: 'La rhubarbe contient de l\'acide oxalique, toxique pour eux.' },
  { q: 'Un lapin doit toujours avoir de l\'eau fraîche à disposition.',        answer: true,  explication: 'L\'eau est vitale, un lapin peut boire jusqu\'à 500ml par jour !' },
  { q: 'Les épinards peuvent être donnés tous les jours en grande quantité.',  answer: false, explication: 'Les épinards sont riches en oxalates, à donner seulement 1-2×/semaine.' },
  { q: 'Un lapin en bonne santé produit deux types de crottes.',               answer: true,  explication: 'Il mange les cæcotrophes (molles) directement pour se nourrir !' },
  { q: 'Le basilic est une herbe sûre pour les lapins.',                       answer: true,  explication: 'Le basilic frais est une herbe aromatique saine pour les lapins.' },
  { q: 'L\'oignon est toxique pour les lapins.',                               answer: true,  explication: 'L\'oignon peut provoquer une anémie hémolytique chez les lapins.' },
  { q: 'La luzerne est recommandée en grande quantité pour les lapins adultes.',answer: false, explication: 'La luzerne est riche en calcium, plutôt réservée aux lapereaux.' },
  { q: 'Les lapins peuvent manger des feuilles de fraisier.',                  answer: true,  explication: 'Les feuilles de fraisier sont parfaitement saines pour les lapins.' },
  { q: 'La pomme de terre cuite est sans danger pour les lapins.',             answer: false, explication: 'La pomme de terre, crue ou cuite, est déconseillée aux lapins.' },
  { q: 'L\'herbe fraîche est excellente pour les lapins.',                     answer: true,  explication: 'L\'herbe est naturelle et très nutritive pour eux !' },
  { q: 'Les graines de tournesol sont un bon complément régulier.',            answer: false, explication: 'Trop grasses, elles peuvent causer de l\'obésité à long terme.' },
  { q: 'La betterave rouge peut être donnée en petite quantité.',              answer: true,  explication: 'OK avec modération — attention à la coloration des urines !' },
  { q: 'Le céleri (feuilles et tiges) est bon pour les lapins.',              answer: true,  explication: 'Le céleri est nutritif et très apprécié des lapins.' },
  { q: 'Les glands (fruits du chêne) sont inoffensifs pour les lapins.',      answer: false, explication: 'Les glands contiennent des tannins qui perturbent leur digestion.' },
  { q: 'La coriandre fraîche est saine pour les lapins.',                      answer: true,  explication: 'La coriandre fraîche est une herbe aromatique sûre pour les lapins.' },
  { q: 'Le maïs frais en grains convient bien aux lapins.',                   answer: false, explication: 'Le maïs est trop riche en amidon et cause des troubles digestifs.' },
  { q: 'Le romarin peut être donné en petite quantité aux lapins.',           answer: true,  explication: 'Le romarin en très petite quantité est toléré, mais à ne pas abuser.' },
  { q: 'Les lapins sont des animaux qui ont besoin de ronger pour s\'user les dents.', answer: true, explication: 'Les dents des lapins poussent toute leur vie, le foin et les branchages les usent naturellement.' },
]

function pickQuestion(used: Set<number>): { idx: number; q: Question } {
  const available = QUESTIONS.map((_, i) => i).filter(i => !used.has(i))
  const pool = available.length > 0 ? available : QUESTIONS.map((_, i) => i)
  const idx  = pool[Math.floor(Math.random() * pool.length)]
  return { idx, q: QUESTIONS[idx] }
}

// ── Types ────────────────────────────────────────────────────────────────────
type GameScreen  = 'menu' | 'playing' | 'win'
type EventScreen = 'none' | 'question' | 'bonus' | 'malus' | 'vet' | 'food'

interface GameState {
  position:    number
  score:       number
  correct:     number
  wrong:       number
  skipTurn:    boolean
  usedQIdx:    Set<number>
  diceResult:  number | null
  rolling:     boolean
}

function initGame(): GameState {
  return { position: 0, score: 0, correct: 0, wrong: 0, skipTurn: false, usedQIdx: new Set(), diceResult: null, rolling: false }
}

function getStars(_correct: number, wrong: number): number {
  if (wrong === 0)  return 3
  if (wrong <= 2)   return 2
  return 1
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CheminSaisonsPage() {
  const navigate = useNavigate()

  const [gameScreen,   setGameScreen]   = useState<GameScreen>('menu')
  const [game,         setGame]         = useState<GameState>(initGame)
  const [eventScreen,  setEventScreen]  = useState<EventScreen>('none')
  const [currentQ,     setCurrentQ]     = useState<Question | null>(null)
  const [qAnswered,    setQAnswered]    = useState<boolean | null>(null) // null = unanswered
  const [eventMsg,     setEventMsg]     = useState('')

  const startGame = useCallback(() => {
    setGame(initGame())
    setEventScreen('none')
    setCurrentQ(null)
    setQAnswered(null)
    setGameScreen('playing')
  }, [])

  const rollDice = useCallback(() => {
    if (game.rolling || eventScreen !== 'none') return

    if (game.skipTurn) {
      setGame(g => ({ ...g, skipTurn: false, diceResult: null }))
      setEventMsg('Tour passé chez le vétérinaire… 🩺')
      setEventScreen('vet')
      return
    }

    setGame(g => ({ ...g, rolling: true, diceResult: null }))
    // Short rolling animation then settle
    let count = 0
    const interval = setInterval(() => {
      setGame(g => ({ ...g, diceResult: Math.ceil(Math.random() * 6) }))
      count++
      if (count >= 8) {
        clearInterval(interval)
        const finalRoll = Math.ceil(Math.random() * 6)
        setGame(g => {
          const newPos = Math.min(g.position + finalRoll, 24)
          return { ...g, rolling: false, diceResult: finalRoll, position: newPos }
        })
        // Trigger square event after animation
        setTimeout(() => {
          setGame(g => {
            const pos  = g.position
            const type = SQUARE_TYPE[pos]
            if (!type || type === 'normal') return g
            if (type === 'end') { setGameScreen('win'); return g }

            if (type === 'question') {
              const { idx, q } = pickQuestion(g.usedQIdx)
              const newUsed = new Set(g.usedQIdx); newUsed.add(idx)
              setCurrentQ(q)
              setQAnswered(null)
              setEventScreen('question')
              return { ...g, usedQIdx: newUsed }
            }
            if (type === 'bonus') {
              const bonusPos = Math.min(pos + 2, 24)
              setEventMsg('⭐ Bravo ! Tu avances de 2 cases !')
              setEventScreen('bonus')
              return { ...g, position: bonusPos, score: g.score + 10 }
            }
            if (type === 'malus') {
              const malusPos = Math.max(pos - 2, 1)
              setEventMsg('⬇️ Oups ! Tu recules de 2 cases…')
              setEventScreen('malus')
              return { ...g, position: malusPos }
            }
            if (type === 'vet') {
              setEventMsg('🩺 Visite chez le vétérinaire ! Tu passes un tour.')
              setEventScreen('vet')
              return { ...g, skipTurn: true }
            }
            if (type === 'food') {
              const season = SEASON_OF[pos] ?? 'spring'
              const foods  = SEASONAL_FOODS[season]
              const msg    = foods[Math.floor(Math.random() * foods.length)]
              setEventMsg(msg)
              setEventScreen('food')
              return { ...g, score: g.score + 5 }
            }
            return g
          })
        }, 200)
      }
    }, 80)
  }, [game, eventScreen])

  const answerQuestion = useCallback((answer: boolean) => {
    if (qAnswered !== null || !currentQ) return
    const correct = answer === currentQ.answer
    setQAnswered(answer)
    setGame(g => ({
      ...g,
      score:   g.score + (correct ? 15 : 0),
      correct: g.correct + (correct ? 1 : 0),
      wrong:   g.wrong   + (correct ? 0 : 1),
    }))
  }, [qAnswered, currentQ])

  const closeEvent = useCallback(() => {
    setEventScreen('none')
    setCurrentQ(null)
    setQAnswered(null)
    // Check if we landed on 24 after a bonus
    setGame(g => {
      if (g.position >= 24) { setGameScreen('win'); return g }
      return g
    })
  }, [])

  // ── Render helpers ──────────────────────────────────────────────────────────
  const seasonRowIndex = (rowIdx: number): Season =>
    (['spring','summer','autumn','winter'] as Season[])[rowIdx]

  // ── Menu ──
  if (gameScreen === 'menu') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>
      <div className={styles.menuScreen}>
        <span className={styles.menuEmoji}>🌍</span>
        <h1 className={styles.menuTitle}>Chemin des saisons</h1>
        <p className={styles.menuSubtitle}>Parcours les 4 saisons avec Chipie en répondant aux questions !</p>
        <div className={styles.menuRules}>
          <div className={styles.ruleItem}><span>🎲</span> Lance le dé pour avancer</div>
          <div className={styles.ruleItem}><span>❓</span> Questions → bonne rép. = +15 pts</div>
          <div className={styles.ruleItem}><span>⭐</span> Bonus → avance de 2 cases</div>
          <div className={styles.ruleItem}><span>⬇️</span> Malus → recule de 2 cases</div>
          <div className={styles.ruleItem}><span>🩺</span> Vétérinaire → passe un tour</div>
          <div className={styles.ruleItem}><span>🥕</span> Régal → Chipie mange !</div>
        </div>
        <button className={styles.playBtn} onClick={startGame}>Jouer ! 🐰</button>
      </div>
    </div>
  )

  // ── Win ──
  if (gameScreen === 'win') {
    const stars = getStars(game.correct, game.wrong)
    return (
      <div className={styles.page}>
        <div className={styles.winScreen}>
          <span className={styles.winEmoji}>🏁</span>
          <h2 className={styles.winTitle}>Chipie a parcouru toutes les saisons !</h2>
          <div className={styles.starsRow}>
            {[1,2,3].map(i => <span key={i} className={`${styles.star} ${i <= stars ? styles.starOn : ''}`}>⭐</span>)}
          </div>
          <div className={styles.winStats}>
            <div className={styles.winStat}><span className={styles.winNum}>{game.score}</span><span className={styles.winLabel}>points</span></div>
            <div className={styles.winDiv} />
            <div className={styles.winStat}><span className={styles.winNum}>{game.correct}</span><span className={styles.winLabel}>bonnes rép.</span></div>
            <div className={styles.winDiv} />
            <div className={styles.winStat}><span className={styles.winNum}>{game.wrong}</span><span className={styles.winLabel}>erreurs</span></div>
          </div>
          <div className={styles.winActions}>
            <button className={styles.playBtn} onClick={startGame}>Rejouer</button>
            <button className={styles.menuBtn} onClick={() => navigate('/jeu')}>Retour aux jeux</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing ──
  const curSeason = game.position > 0 ? SEASON_OF[Math.min(game.position, 24)] : 'spring'

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>
        <span className={styles.scoreDisplay}>⭐ {game.score} pts</span>
      </div>

      {/* Board */}
      <div className={styles.board}>
        {DISPLAY_ROWS.map((row, rowIdx) => {
          const season = seasonRowIndex(rowIdx)
          return (
            <div key={rowIdx} className={`${styles.boardRow} ${styles[`season_${season}`]}`}>
              {row.map(pos => {
                const type    = SQUARE_TYPE[pos]
                const isPlayer = game.position === pos
                const isPassed = game.position > pos
                return (
                  <div
                    key={pos}
                    className={`
                      ${styles.square}
                      ${isPlayer ? styles.squarePlayer : ''}
                      ${isPassed ? styles.squarePassed : ''}
                      ${type === 'end' ? styles.squareEnd : ''}
                    `}
                  >
                    {isPlayer
                      ? <span className={styles.playerToken}>🐰</span>
                      : type === 'end'
                        ? <span>🏁</span>
                        : <span className={styles.squareIcon}>{SQUARE_ICON[type]}</span>
                    }
                    <span className={styles.squareNum}>{pos}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span className={styles.statusSeason}>{SEASON_LABEL[curSeason]}</span>
        <span className={styles.statusPos}>Case {game.position} / 24</span>
      </div>

      {/* Dice area */}
      <div className={styles.diceArea}>
        {game.diceResult !== null && (
          <div className={`${styles.diceResult} ${game.rolling ? styles.diceRolling : ''}`}>
            {['⚀','⚁','⚂','⚃','⚄','⚅'][game.diceResult - 1]}
          </div>
        )}
        <button
          className={styles.rollBtn}
          onClick={rollDice}
          disabled={game.rolling || eventScreen !== 'none'}
        >
          {game.skipTurn ? '🩺 Tour passé (tap)' : game.rolling ? 'Lancement…' : '🎲 Lancer le dé'}
        </button>
      </div>

      {/* Event overlay */}
      {eventScreen !== 'none' && (
        <div className={styles.overlay}>
          <div className={styles.modal}>

            {/* Question */}
            {eventScreen === 'question' && currentQ && (
              <>
                <span className={styles.modalEmoji}>❓</span>
                <p className={styles.modalQuestion}>{currentQ.q}</p>
                {qAnswered === null ? (
                  <div className={styles.answerBtns}>
                    <button className={styles.btnTrue}  onClick={() => answerQuestion(true)}>✅ Vrai</button>
                    <button className={styles.btnFalse} onClick={() => answerQuestion(false)}>❌ Faux</button>
                  </div>
                ) : (
                  <>
                    <div className={`${styles.feedback} ${qAnswered === currentQ.answer ? styles.feedbackCorrect : styles.feedbackWrong}`}>
                      {qAnswered === currentQ.answer ? '✅ Bonne réponse !' : '❌ Mauvaise réponse…'}
                    </div>
                    <p className={styles.explication}>{currentQ.explication}</p>
                    <button className={styles.continueBtn} onClick={closeEvent}>Continuer →</button>
                  </>
                )}
              </>
            )}

            {/* Bonus / malus / vet / food */}
            {(eventScreen === 'bonus' || eventScreen === 'malus' || eventScreen === 'vet' || eventScreen === 'food') && (
              <>
                <span className={styles.modalEmoji}>
                  {eventScreen === 'bonus' ? '⭐' : eventScreen === 'malus' ? '⬇️' : eventScreen === 'vet' ? '🩺' : '🥕'}
                </span>
                <p className={styles.modalMsg}>{eventMsg}</p>
                <button className={styles.continueBtn} onClick={closeEvent}>Continuer →</button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

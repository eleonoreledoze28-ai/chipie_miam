import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './SoinPage.module.css'

interface Food { emoji: string; name: string; toxic: boolean }
interface Action { text: string; correct: boolean; feedback: string }

interface Scenario {
  symptom: string
  symptoEmoji: string
  foods: Food[]
  actions: Action[]
  fact: string
}

const SCENARIOS: Scenario[] = [
  {
    symptom: 'Chipie ne veut plus bouger et a le ventre gonflé…',
    symptoEmoji: '😰',
    foods: [
      { emoji: '🥕', name: 'Carotte',   toxic: false },
      { emoji: '🍇', name: 'Raisin',    toxic: true  },
      { emoji: '🌿', name: 'Persil',    toxic: false },
      { emoji: '🥬', name: 'Salade',    toxic: false },
    ],
    actions: [
      { text: 'Lui donner encore plus à manger',         correct: false, feedback: 'Non ! Elle a besoin de se reposer, pas de manger.' },
      { text: 'Appeler le vétérinaire d\'urgence',        correct: true,  feedback: 'Oui ! Le raisin est très toxique, le véto est indispensable.' },
      { text: 'Lui donner de l\'eau sucrée',              correct: false, feedback: 'Non ! Le sucre empire les problèmes digestifs.' },
    ],
    fact: '🍇 Le raisin est extrêmement toxique pour les lapins. Même en petite quantité, il peut causer une insuffisance rénale grave.',
  },
  {
    symptom: 'Chipie bave et secoue la tête sans arrêt…',
    symptoEmoji: '😵',
    foods: [
      { emoji: '🌾', name: 'Foin',     toxic: false },
      { emoji: '🥦', name: 'Brocoli',  toxic: false },
      { emoji: '🧅', name: 'Oignon',   toxic: true  },
      { emoji: '🥒', name: 'Concombre',toxic: false },
    ],
    actions: [
      { text: 'Lui enlever toute nourriture',             correct: false, feedback: 'Non ! Il faut surtout appeler le véto en urgence.' },
      { text: 'Lui donner de l\'eau',                     correct: false, feedback: 'Pas suffisant, l\'oignon est dangereux systémiquement.' },
      { text: 'Appeler le vétérinaire immédiatement',     correct: true,  feedback: 'Bravo ! L\'oignon détruit les globules rouges des lapins.' },
    ],
    fact: '🧅 L\'oignon contient des composés soufrés très toxiques pour les lapins. Même cuit, il reste dangereux.',
  },
  {
    symptom: 'Chipie convulse et a les yeux révulsés…',
    symptoEmoji: '🆘',
    foods: [
      { emoji: '🥬', name: 'Salade',    toxic: false },
      { emoji: '🌿', name: 'Menthe',    toxic: false },
      { emoji: '🍫', name: 'Chocolat',  toxic: true  },
      { emoji: '🥕', name: 'Carotte',   toxic: false },
    ],
    actions: [
      { text: 'La mettre dans une boîte sombre et calme, puis appeler le véto', correct: true,  feedback: 'Parfait ! Limiter le stress et appeler le véto en urgence.' },
      { text: 'Lui faire boire du lait',                  correct: false, feedback: 'Non ! Les lapins ne digèrent pas le lait.' },
      { text: 'Lui donner du foin pour absorber',         correct: false, feedback: 'Non ! Les convulsions nécessitent des soins vétérinaires immédiats.' },
    ],
    fact: '🍫 Le chocolat contient de la théobromine, une substance mortelle pour les lapins. Même une petite quantité peut être fatale.',
  },
  {
    symptom: 'Chipie a le museau gonflé et gratte sans cesse…',
    symptoEmoji: '😤',
    foods: [
      { emoji: '🌾', name: 'Foin',      toxic: false },
      { emoji: '🌱', name: 'Céleri',    toxic: false },
      { emoji: '🌽', name: 'Maïs',      toxic: true  },
      { emoji: '🍃', name: 'Épinard',   toxic: false },
    ],
    actions: [
      { text: 'Lui donner un antihistaminique humain',    correct: false, feedback: 'Non ! Les médicaments humains peuvent être toxiques pour les lapins.' },
      { text: 'Retirer la nourriture suspecte et contacter le véto', correct: true, feedback: 'Oui ! Identifier la cause et consulter un vétérinaire.' },
      { text: 'Lui donner plus de foin',                  correct: false, feedback: 'Le foin est bien, mais ce n\'est pas suffisant ici.' },
    ],
    fact: '🌽 Le maïs est difficile à digérer pour les lapins et peut provoquer des ballonnements et des allergies.',
  },
]

function getBest(): number { return parseInt(localStorage.getItem('soin_best') ?? '0') }

type Phase = 'menu' | 'symptom' | 'identify' | 'action' | 'fact' | 'end'

export default function SoinPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('menu')
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(getBest)
  const [selectedFood, setSelectedFood] = useState<number | null>(null)
  const [selectedAction, setSelectedAction] = useState<number | null>(null)
  const [foodResult, setFoodResult] = useState<boolean | null>(null)
  const [actionResult, setActionResult] = useState<string | null>(null)

  const scenario = SCENARIOS[idx % SCENARIOS.length]

  const start = () => {
    setIdx(0); setScore(0); setPhase('symptom')
    setSelectedFood(null); setSelectedAction(null)
    setFoodResult(null); setActionResult(null)
  }

  const pickFood = (i: number) => {
    if (foodResult !== null) return
    setSelectedFood(i)
    const ok = scenario.foods[i].toxic
    setFoodResult(ok)
    if (ok) setScore(s => s + 20)
    setTimeout(() => setPhase('action'), 1200)
  }

  const pickAction = (i: number) => {
    if (actionResult !== null) return
    setSelectedAction(i)
    const action = scenario.actions[i]
    setActionResult(action.feedback)
    if (action.correct) setScore(s => s + 30)
    setTimeout(() => setPhase('fact'), 1400)
  }

  const nextOrEnd = () => {
    if (idx + 1 >= SCENARIOS.length) {
      const final = score
      if (final > best) { localStorage.setItem('soin_best', String(final)); setBest(final) }
      setPhase('end')
    } else {
      setIdx(i => i + 1)
      setSelectedFood(null); setSelectedAction(null)
      setFoodResult(null); setActionResult(null)
      setPhase('symptom')
    }
  }

  if (phase === 'menu') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>
      <div className={styles.menuScreen}>
        <div className={styles.menuEmoji}>🚑</div>
        <h1 className={styles.menuTitle}>Soin d'urgence</h1>
        <p className={styles.menuSub}>Chipie a mangé quelque chose de mauvais !</p>
        {best > 0 && <div className={styles.menuBest}>🏆 Meilleur score : {best} pts</div>}
        <div className={styles.rules}>
          <div className={styles.rule}><span>🔍</span>Trouve l'aliment toxique qu'elle a mangé</div>
          <div className={styles.rule}><span>💊</span>Choisis la bonne action à faire</div>
          <div className={styles.rule}><span>📚</span>Apprends pourquoi c'est dangereux</div>
        </div>
        <button className={styles.playBtn} onClick={start}>Commencer !</button>
      </div>
    </div>
  )

  if (phase === 'end') return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>
      <div className={styles.endScreen}>
        <div className={styles.endEmoji}>{score >= 180 ? '🏆' : score >= 100 ? '⭐' : '🐰'}</div>
        <h2 className={styles.endTitle}>{score >= 180 ? 'Expert vétérinaire !' : score >= 100 ? 'Bien joué !' : 'Continue d\'apprendre !'}</h2>
        {score >= best && <div className={styles.newRecord}>🎉 Nouveau record !</div>}
        <div className={styles.endStats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{score}</span>
            <span className={styles.statLabel}>points</span>
          </div>
        </div>
        <div className={styles.endActions}>
          <button className={styles.playBtn} onClick={start}>Rejouer</button>
          <button className={styles.menuBtn} onClick={() => setPhase('menu')}>Menu</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/jeu')}>← Retour</button>

      <div className={styles.hud}>
        <span className={styles.hudScore}>⭐ {score} pts</span>
        <span className={styles.hudStep}>Scénario {idx + 1}/{SCENARIOS.length}</span>
      </div>

      {/* Symptom card */}
      {(phase === 'symptom' || phase === 'identify' || phase === 'action' || phase === 'fact') && (
        <div className={styles.symptomCard}>
          <span className={styles.symptoEmoji}>{scenario.symptoEmoji}</span>
          <p className={styles.symptomText}>{scenario.symptom}</p>
          {phase === 'symptom' && (
            <button className={styles.nextBtn} onClick={() => setPhase('identify')}>
              Qu'est-ce qu'elle a mangé ?
            </button>
          )}
        </div>
      )}

      {/* Identify phase */}
      {phase === 'identify' && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>🔍 Quel aliment est toxique ?</p>
          <div className={styles.foodGrid}>
            {scenario.foods.map((food, i) => (
              <button
                key={i}
                className={`${styles.foodCard}
                  ${selectedFood === i ? (foodResult ? styles.foodCorrect : styles.foodWrong) : ''}
                  ${foodResult !== null && food.toxic && selectedFood !== i ? styles.foodReveal : ''}`}
                onClick={() => pickFood(i)}
              >
                <span className={styles.foodEmoji}>{food.emoji}</span>
                <span className={styles.foodName}>{food.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action phase */}
      {phase === 'action' && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>💊 Que faire maintenant ?</p>
          <div className={styles.actionList}>
            {scenario.actions.map((action, i) => (
              <button
                key={i}
                className={`${styles.actionCard}
                  ${selectedAction === i ? (action.correct ? styles.actionCorrect : styles.actionWrong) : ''}
                  ${actionResult !== null && action.correct && selectedAction !== i ? styles.actionReveal : ''}`}
                onClick={() => pickAction(i)}
              >
                <span className={styles.actionText}>{action.text}</span>
                {selectedAction === i && actionResult && (
                  <span className={styles.actionFeedback}>{actionResult}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fact phase */}
      {phase === 'fact' && (
        <div className={styles.section}>
          <div className={styles.factCard}>
            <p className={styles.factTitle}>💡 Le savais-tu ?</p>
            <p className={styles.factText}>{scenario.fact}</p>
          </div>
          <button className={styles.playBtn} onClick={nextOrEnd}>
            {idx + 1 < SCENARIOS.length ? 'Cas suivant →' : 'Voir mon score →'}
          </button>
        </div>
      )}
    </div>
  )
}

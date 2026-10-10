import { useState } from 'react'
import GameShell, { GameResult } from '../../components/GameShell/GameShell'
import { useBestScore } from '../../hooks/useBestScore'
import { RACES_COMPAREES } from '../../data/races'
import type { RaceComparee } from '../../data/races'
import styles from './QuiEstCePage.module.css'

const ROUNDS = 5
const OPTIONS = 4
const MAX_CLUES = 5

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Évite qu'un indice donne directement la réponse (ex. « Le Rex a… »)
const STOP_WORDS = new Set(['des', 'de', 'du', 'la', 'le', 'les'])

function mask(text: string, nom: string): string {
  return nom
    .split(/[\s()]+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word.toLowerCase()))
    .reduce((acc, word) => acc.replace(new RegExp(word, 'gi'), '…'), text)
}

function level(n: number, low: string, mid: string, high: string): string {
  return n <= 2 ? low : n >= 4 ? high : mid
}

function cluesOf(r: RaceComparee): string[] {
  const clues = [
    `📏 Taille : ${r.taille.toLowerCase()} (${r.poids})`,
    `⏳ Espérance de vie : ${r.esperanceVie}`,
    `🎭 Caractère : ${level(r.activite, 'plutôt calme', 'assez actif', 'très actif')}, ${level(r.sociabilite, 'réservé', 'sociable', 'très câlin')}${r.suitableEnfants ? ', convient aux enfants' : ', peu adapté aux jeunes enfants'}`,
    `🪮 Poils : ${level(r.soinsPoils, 'entretien facile', 'entretien régulier', 'entretien exigeant')} · ${r.pointsForts[0] ?? ''}`,
    `🩺 À surveiller : ${r.risquesMedicaux[0] ?? 'rien de particulier'}`,
  ]
  return clues.map(c => mask(c, r.nom))
}

interface Round {
  answer: RaceComparee
  options: RaceComparee[]
  clues: string[]
}

function buildRounds(): Round[] {
  return shuffle(RACES_COMPAREES).slice(0, ROUNDS).map(answer => {
    const others = shuffle(RACES_COMPAREES.filter(r => r.id !== answer.id)).slice(0, OPTIONS - 1)
    return { answer, options: shuffle([answer, ...others]), clues: cluesOf(answer) }
  })
}

export default function QuiEstCePage() {
  const { best, submit } = useBestScore('chipie-quiestce-best')
  const [rounds, setRounds] = useState<Round[]>(buildRounds)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(1)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [gained, setGained] = useState(0)
  const [finished, setFinished] = useState(false)
  const [isRecord, setIsRecord] = useState(false)

  const round = rounds[index]
  const maxScore = ROUNDS * MAX_CLUES

  const answered = picked !== null
  const correct = answered && picked === round.answer.id

  const pick = (id: string) => {
    if (answered) return
    const points = id === round.answer.id ? MAX_CLUES + 1 - revealed : 0
    setPicked(id)
    setGained(points)
    setScore(s => s + points)
  }

  const next = () => {
    if (index + 1 >= ROUNDS) {
      setIsRecord(submit(score))
      setFinished(true)
      return
    }
    setIndex(i => i + 1)
    setRevealed(1)
    setPicked(null)
    setGained(0)
  }

  const restart = () => {
    setRounds(buildRounds())
    setIndex(0)
    setRevealed(1)
    setPicked(null)
    setScore(0)
    setGained(0)
    setFinished(false)
    setIsRecord(false)
  }

  const optionClass = (id: string) => {
    if (!answered) return styles.option
    if (id === round.answer.id) return `${styles.option} ${styles.optionRight}`
    if (id === picked) return `${styles.option} ${styles.optionWrong}`
    return `${styles.option} ${styles.optionDim}`
  }

  return (
    <GameShell
      title="Qui est-ce ?"
      emoji="🕵️"
      stats={<><span>⭐ {score}/{maxScore}</span><span>{Math.min(index + 1, ROUNDS)}/{ROUNDS}</span></>}
    >
      {finished ? (
        <GameResult
          title={score >= 18 ? 'Expert en lapins ! 🐇' : score >= 10 ? 'Bien joué !' : 'Encore un petit effort'}
          isRecord={isRecord}
          lines={[`Score : ${score} / ${maxScore}`, `Meilleur score : ${Math.max(best, score)}`]}
          onReplay={restart}
        />
      ) : (
        <>
          <p className={styles.help}>
            Devine la race ! Moins tu demandes d'indices, plus tu gagnes de points (jusqu'à {MAX_CLUES}).
          </p>

          <ul className={styles.clues}>
            {round.clues.slice(0, revealed).map(clue => <li key={clue} className={styles.clue}>{clue}</li>)}
          </ul>

          {!answered && (
            <button className={styles.clueBtn} onClick={() => setRevealed(r => r + 1)} disabled={revealed >= MAX_CLUES}>
              {revealed >= MAX_CLUES ? 'Plus d\'indices' : `Un indice de plus (−1 pt)`}
            </button>
          )}

          <div className={styles.options}>
            {round.options.map(r => (
              <button key={r.id} className={optionClass(r.id)} onClick={() => pick(r.id)} disabled={answered}>
                {r.nom}
              </button>
            ))}
          </div>

          {answered && (
            <div className={styles.feedback}>
              <p className={correct ? styles.good : styles.bad}>
                {correct ? `Bravo ! +${gained} point${gained > 1 ? 's' : ''}` : 'Raté !'} C'était {round.answer.emoji} {round.answer.nom}.
              </p>
              <button className={styles.nextBtn} onClick={next}>
                {index + 1 >= ROUNDS ? 'Voir le résultat' : 'Suivant'}
              </button>
            </div>
          )}
        </>
      )}
    </GameShell>
  )
}

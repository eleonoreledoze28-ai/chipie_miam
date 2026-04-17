import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import styles from './DetectivePage.module.css'

function getWeekNumber(): number {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7)
}

interface Affaire {
  id: string
  emoji: string
  titre: string
  contexte: string
  suspect: string
  indice: string
  question: string
  choixA: { label: string; reaction: string }
  choixB: { label: string; reaction: string }
  resolution: string
  verdict: string
}

const AFFAIRES: Affaire[] = [
  {
    id: 'foin',
    emoji: '🌾',
    titre: "L'Affaire du foin mystérieusement tassé",
    contexte: "Ce matin, le coin foin était bizarrement tassé. Quelqu'un avait touché au foin sans autorisation.",
    suspect: "Un agent extérieur non identifié. Ou toi.",
    indice: "Une odeur de main humaine sur le foin fraîchement perturbé.",
    question: "Comment mènes-tu l'enquête ?",
    choixA: {
      label: "🔍 Renifler le foin méthodiquement",
      reaction: "Après 47 secondes de reniflage intensif, tu identifias une trace olfactive humaine. La piste mène vers... le frigidaire ?",
    },
    choixB: {
      label: "👁️ Fixer le suspect dans les yeux sans ciller",
      reaction: "Tu le fixas pendant 3 minutes et 12 secondes. Il baissa les yeux en premier. Coupable ? Probablement.",
    },
    resolution: "Coupable identifié : toi. Tu avais voulu « vérifier la qualité ». Prochaine fois, demande.",
    verdict: "COUPABLE — L'humain de service",
  },
  {
    id: 'gamelle',
    emoji: '🥣',
    titre: "Le Mystère de la gamelle à 3 cm",
    contexte: "Ce matin, la gamelle d'eau était exactement 3,2 cm plus à gauche qu'à l'habitude. Inacceptable.",
    suspect: "Un habitant de cet appartement qui ne sait pas ranger.",
    indice: "Des traces de pantoufles à proximité immédiate. Quelqu'un est passé par là.",
    question: "Quelle méthode d'investigation adoptes-tu ?",
    choixA: {
      label: "🔄 Tourner autour de la gamelle 12 fois",
      reaction: "Après 12 rotations complètes à vitesse constante, la vérité apparut clairement : la gamelle avait bougé. Certitude : 100%.",
    },
    choixB: {
      label: "🪑 Attendre stoïquement que quelqu'un avoue",
      reaction: "Tu t'installâs, l'air indifférent mais l'oreille tendue. Résultat : 0 aveux spontanés. Technique à perfectionner.",
    },
    resolution: "L'humain avait passé l'aspirateur la veille. La gamelle était une victime collatérale. Dossier clos.",
    verdict: "COUPABLE — L'aspirateur (complice humain)",
  },
  {
    id: 'legume',
    emoji: '🥬',
    titre: "L'Énigme du légume inconnu",
    contexte: "Un légume jamais vu est apparu dans la gamelle. Rond. Verdâtre. D'origine totalement inconnue.",
    suspect: "L'humain aux courses impulsives et aux idées saugrenues.",
    indice: "Un ticket de caisse traîne quelque part dans la cuisine. Une piste.",
    question: "Comment gères-tu cette intrusion végétale ?",
    choixA: {
      label: "👃 Renifler sans toucher pendant 8 minutes",
      reaction: "Après 8 minutes d'expertise olfactive rigoureuse, diagnostic établi : probablement comestible. Probablement.",
    },
    choixB: {
      label: "🐾 Le pousser du museau hors de la gamelle",
      reaction: "Le légume fut éjecté avec une précision redoutable. Sa présence était inacceptable sans consentement préalable.",
    },
    resolution: "C'était du fenouil. Jugé acceptable après 2 jours d'apprivoisement progressif. L'humain ne recommencera pas sans prévenir.",
    verdict: "COUPABLE — L'humain aux courses impulsives",
  },
  {
    id: 'bruit',
    emoji: '🌙',
    titre: "L'Affaire du bruit inexpliqué à 3h14",
    contexte: "La nuit dernière, à exactement 3h14, un bruit sourd retentit dans le couloir. Origine inconnue.",
    suspect: "Les entités nocturnes. Ou le tuyau de chauffage.",
    indice: "Une perturbation dans l'énergie ambiante du salon. Détectée par mes vibrisses.",
    question: "Quelle est ta stratégie nocturne ?",
    choixA: {
      label: "💥 Thumpter 3 fois pour signaler la menace",
      reaction: "Tu thumptas 3 fois. Puis encore 2 fois. Puis une fois de plus par précaution. La menace sembla se retirer immédiatement.",
    },
    choixB: {
      label: "😴 Faire semblant de dormir, œil entrouvert",
      reaction: "Position adoptée : bouclé(e) sur toi-même, œil gauche entrouvert à 15%, oreille droite à 47 degrés. Surveillance maintenue jusqu'à l'aube.",
    },
    resolution: "C'était le tuyau de chauffage. Ou une entité. Dans le doute, thumpter reste la meilleure stratégie connue.",
    verdict: "NON ÉLUCIDÉ — Affaire classée avec prudence",
  },
  {
    id: 'calin',
    emoji: '🤗',
    titre: "Le Dossier du câlin non sollicité",
    contexte: "Hier après-midi, sans prévenir ni demander l'avis de quiconque, l'humain te prit dans ses bras.",
    suspect: "L'humain affectueux mais peu respectueux du protocole officiel.",
    indice: "Aucun. Il a juste dit « c'est trop mignon » et il a foncé.",
    question: "Comment réagis-tu face à cette violation du protocole ?",
    choixA: {
      label: "😑 Te laisser faire avec un air de martyr",
      reaction: "Tu restâs stoïque, les pattes dans le vide, l'expression de quelqu'un qui subit une injustice historique. Très efficace émotionnellement.",
    },
    choixB: {
      label: "🐾 Gigoter avec dignité jusqu'à libération",
      reaction: "Après 4 secondes de résistance organisée et digne, tu fus posé(e) avec douceur. Victoire tactique et respect mutuel restauré.",
    },
    resolution: "Le câlin dura 7 secondes. C'est 6 de trop. Un mémo a été déposé symboliquement. Dossier ouvert en cas de récidive.",
    verdict: "COUPABLE — L'humain affectueux (récidiviste)",
  },
  {
    id: 'reflet',
    emoji: '🪟',
    titre: "L'Incident du rival dans la vitre",
    contexte: "Ce matin, devant la baie vitrée, un lapin te fixa droit dans les yeux. Il avait exactement ton air.",
    suspect: "Un rival infiltré. Un ennemi de longue date. Ou une anomalie du continuum espace-temps.",
    indice: "Il bougeait exactement quand tu bougeais. Synchronisation suspecte à 100%.",
    question: "Comment gères-tu ce rival mystérieux ?",
    choixA: {
      label: "🐰 Faire un binky parfait pour le défier",
      reaction: "Tu effectuâs un binky parfait. L'autre lapin fit exactement pareil, au même moment. Mimétisme troublant. Ou magie.",
    },
    choixB: {
      label: "😤 L'ignorer avec souveraine indifférence",
      reaction: "Tu tournâs le dos. Avec style. Le regard qui dit « je t'ai vu et je suis au-dessus de ça ». Technique absolument maîtrisée.",
    },
    resolution: "C'était ton reflet. L'enquête conclut que tu es extrêmement beau/belle. Dossier classé avec satisfaction totale.",
    verdict: "RÉSOLU — Le suspect, c'était toi (en mieux)",
  },
]

type Phase = 'intro' | 'investigation' | 'revelation'

export default function DetectivePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const weekNum = useMemo(getWeekNumber, [])
  const affaire = useMemo(() => AFFAIRES[weekNum % AFFAIRES.length], [weekNum])

  const [phase, setPhase] = useState<Phase>('intro')
  const [choix, setChoix] = useState<'A' | 'B' | null>(null)

  function handleChoix(c: 'A' | 'B') {
    setChoix(c)
    setPhase('revelation')
  }

  const reaction = choix === 'A' ? affaire.choixA.reaction : choix === 'B' ? affaire.choixB.reaction : ''

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
        <span className={styles.badge}>Affaire #{weekNum.toString().padStart(3, '0')}</span>
      </div>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>🕵️</span>
        <div>
          <h1 className={styles.title}>L'Agence {profil.nom}</h1>
          <p className={styles.subtitle}>Détective privée. Spécialisée lapins.</p>
        </div>
      </div>

      {phase === 'intro' && (
        <>
          <div className={styles.caseCard}>
            <div className={styles.caseTop}>
              <span className={styles.caseEmoji}>{affaire.emoji}</span>
              <div>
                <p className={styles.caseLabel}>Dossier confidentiel</p>
                <h2 className={styles.caseTitre}>{affaire.titre}</h2>
              </div>
            </div>
            <div className={styles.caseDivider} />
            <div className={styles.caseField}>
              <span className={styles.fieldLabel}>📋 Contexte</span>
              <p className={styles.fieldText}>{affaire.contexte}</p>
            </div>
            <div className={styles.caseField}>
              <span className={styles.fieldLabel}>🎯 Suspect principal</span>
              <p className={styles.fieldText}>{affaire.suspect}</p>
            </div>
            <div className={styles.caseField}>
              <span className={styles.fieldLabel}>🔍 Indice clé</span>
              <p className={styles.fieldText}>{affaire.indice}</p>
            </div>
          </div>
          <button className={styles.startBtn} onClick={() => setPhase('investigation')}>
            🕵️ Commencer l'enquête
          </button>
        </>
      )}

      {phase === 'investigation' && (
        <>
          <div className={styles.questionCard}>
            <p className={styles.questionEmoji}>❓</p>
            <p className={styles.questionText}>{affaire.question}</p>
          </div>
          <div className={styles.choiceList}>
            <button className={styles.choiceBtn} onClick={() => handleChoix('A')}>
              {affaire.choixA.label}
            </button>
            <button className={styles.choiceBtn} onClick={() => handleChoix('B')}>
              {affaire.choixB.label}
            </button>
          </div>
        </>
      )}

      {phase === 'revelation' && (
        <>
          <div className={styles.reactionCard}>
            <p className={styles.reactionLabel}>🔍 Ce que tu fis</p>
            <p className={styles.reactionText}>{reaction}</p>
          </div>
          <div className={styles.resolutionCard}>
            <p className={styles.resolutionLabel}>⚖️ Résolution officielle</p>
            <p className={styles.resolutionText}>{affaire.resolution}</p>
            <div className={styles.verdictBadge}>{affaire.verdict}</div>
          </div>
          <p className={styles.nextCase}>Nouvelle affaire lundi prochain 🗓️</p>
        </>
      )}
    </div>
  )
}

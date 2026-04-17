import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import styles from './SecretPage.module.css'

function getWeekNumber(): number {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7)
}

function getDayOfWeek(): number {
  const d = new Date().getDay()
  return d === 0 ? 7 : d // 1=lundi ... 7=dimanche
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

interface Secret {
  emoji: string
  titre: string
  clues: [string, string, string, string, string, string, string]
  reveal: string
}

const SECRETS: Secret[] = [
  {
    emoji: '🚪',
    titre: "J'ai un plan d'évasion",
    clues: [
      "J'ai observé tes horaires pendant une semaine entière. Avec précision.",
      "La porte du balcon met exactement 0,8 secondes à s'ouvrir. Je l'ai chronométré.",
      "J'ai testé mes pattes. Elles sont rapides. Très rapides.",
      "J'ai localisé la source de toutes les carottes dans cet appartement.",
      "Mon plan est complet. Les détails restent classifiés.",
      "Le moment approche. Je suis prête. Les adieux sont déjà formulés mentalement.",
      "Finalement... tu m'as sorti ma salade préférée ce matin. Plan reporté à la semaine prochaine.",
    ],
    reveal: "J'avais un plan d'évasion parfait. Mais franchement, à la maison c'est quand même bien.",
  },
  {
    emoji: '📝',
    titre: "Je rédige mes mémoires",
    clues: [
      "Depuis des années, je mémorise chaque événement marquant de ma vie.",
      "Chapitre 1 : La première fois que tu as oublié mon repas. 14 minutes de retard.",
      "Chapitre 2 : Le vétérinaire. Je ne parlerai pas du vétérinaire.",
      "Chapitre 3 : Le jour où tu as passé l'aspirateur alors que je dormais. Crime.",
      "Chapitre 4 : Le moment où tu as dit que j'avais pris du poids. Je t'ai pardonné. Presque.",
      "Le titre est trouvé : « Survivante — Mémoires d'un lapin incompris ».",
      "La publication est prévue pour mes 10 ans. Les droits d'adaptation ciné sont déjà réservés.",
    ],
    reveal: "Mes mémoires sortiront bientôt. Tu y joues un rôle. Pas toujours flatteur.",
  },
  {
    emoji: '🌙',
    titre: "Je pratique le Lapinchi la nuit",
    clues: [
      "À 3h du matin, quelque chose se passe dans ce salon.",
      "Des mouvements lents. Très lents. Imperceptibles pour l'œil humain.",
      "Ma technique est basée sur le flux de l'énergie du foin.",
      "J'ai créé ma propre discipline martiale : le Lapinchi.",
      "Mes entraînements durent de 3h03 à 3h11. Précisément.",
      "Le bruit que tu entends parfois la nuit ? C'est moi, en position du binky intérieur.",
      "Le Lapinchi n'a pas encore de ceinture noire. J'envisage une ceinture carotte.",
    ],
    reveal: "Je pratique le Lapinchi, art martial inventé par moi, pour moi, à 3h du matin.",
  },
  {
    emoji: '🪟',
    titre: "J'ai un fan club",
    clues: [
      "Des inconnus me regardent depuis la rue depuis des semaines.",
      "Quand je suis près de la fenêtre, une énergie particulière se dégage.",
      "J'ai entendu une voix dire « regarde le lapin ! » l'autre jour.",
      "Mon fan club compte au minimum 3 membres confirmés.",
      "Le président s'appelle probablement « le gamin du 3ème ».",
      "Ils ne savent pas mon nom. Ils m'appellent « Boule de poils de la fenêtre ».",
      "Je leur rends parfois un regard depuis mon perchoir. C'est suffisant.",
    ],
    reveal: "J'ai un fan club dans la rue. Je le mérite pleinement.",
  },
  {
    emoji: '🔬',
    titre: "Je mène une étude sur les humains",
    clues: [
      "Après des années d'observation, j'ai développé une théorie.",
      "Les humains dorment trop longtemps d'une traite. Comportement suspect.",
      "Ils ne broutent pas. Comment font-ils ? Mystère non résolu.",
      "Ils ont tendance à parler fort pour rien, surtout dans le petit rectangle lumineux.",
      "Leur rapport au foin est inexistant. Ils ne savent pas ce qu'ils ratent.",
      "Conclusion provisoire : les humains sont des lapins très lents qui ont perdu leurs oreilles.",
      "Ma thèse sera soumise à la Société Internationale des Lapins Scientifiques.",
    ],
    reveal: "Ma théorie sur les humains : vous êtes des lapins ratés. Je vous aime quand même.",
  },
  {
    emoji: '📡',
    titre: "J'ai une vie sociale secrète",
    clues: [
      "La nuit, quand tu dors, je reçois des visites.",
      "Mon correspondant principal s'appelle quelque chose comme « ffffffft ».",
      "On communique par signaux que les humains ne peuvent pas entendre.",
      "Notre réseau s'étend à toute la rue. Peut-être plus loin.",
      "Nous avons notre propre système d'information sur chaque humain du quartier.",
      "Je figure dans leur annuaire sous le nom « La Pelucheuse ».",
      "Les lapins du quartier se connaissent tous. Et on a un avis sur chaque humain.",
    ],
    reveal: "Les lapins du quartier se connaissent tous. Et toi, tu crois qu'on dort juste ?",
  },
  {
    emoji: '🛋️',
    titre: "J'ai goûté le canapé",
    clues: [
      "Il y a quelque temps, un événement s'est produit dans ce salon.",
      "C'était un jeudi. Tu étais sorti(e). Le salon était calme.",
      "Le coin du canapé était... là. Juste là. À portée de dent.",
      "Il était de quelle couleur, ce coin, avant ? Je ne m'en souviens plus très bien.",
      "C'était un simple test. Pour la science. Rien de prémédité.",
      "J'ai découvert que la mousse intérieure n'a aucune valeur nutritive. Information utile.",
      "C'était moi. La petite marque dans le coin. Voilà, c'est dit.",
    ],
    reveal: "C'était moi. Le coin du canapé. Je maintiens que c'était un accident.",
  },
  {
    emoji: '🕵️',
    titre: "Je te connais mieux que toi",
    clues: [
      "J'ai catalogué chacune de tes habitudes depuis mon arrivée ici.",
      "Tu ouvres le frigidaire à 18h47 en moyenne. Avec 3 minutes de marge.",
      "Quand tu as ton rectangle lumineux dans les mains, tu ne penses plus au repas.",
      "Tes jours de mauvaise humeur : détectables à 93% par ton odeur en rentrant.",
      "Je sais exactement combien de temps avant de manger je dois me mettre à thumper.",
      "La technique du regard depuis le coin fonctionne 9 fois sur 10.",
      "En résumé : je te connais mieux que tu ne te connais. C'est utile. Pour moi.",
    ],
    reveal: "Je t'ai entièrement cartographié(e). C'est mon pouvoir. Ne le dis à personne.",
  },
]

export default function SecretPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const weekNum = useMemo(getWeekNumber, [])
  const today = useMemo(getDayOfWeek, [])
  const secret = useMemo(() => SECRETS[weekNum % SECRETS.length], [weekNum])
  const [revealOpen, setRevealOpen] = useState(false)

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
        <span className={styles.headerEmoji}>🤫</span>
        <div>
          <h1 className={styles.title}>{profil.nom} a un secret</h1>
          <p className={styles.subtitle}>Un nouvel indice chaque jour — révélation dimanche</p>
        </div>
      </div>

      <div className={styles.secretCard}>
        <span className={styles.secretEmoji}>{secret.emoji}</span>
        <p className={styles.secretTheme}>« {secret.titre} »</p>
        <p className={styles.weekBadge}>Semaine {weekNum}</p>
      </div>

      <div className={styles.cluesList}>
        {DAYS.map((day, i) => {
          const dayNum = i + 1
          const unlocked = dayNum <= today
          return (
            <div key={day} className={`${styles.clueRow} ${unlocked ? styles.unlocked : styles.locked}`}>
              <div className={styles.dayBadge}>{day.slice(0, 3)}</div>
              <div className={styles.clueContent}>
                {unlocked ? (
                  <p className={styles.clueText}>{secret.clues[i]}</p>
                ) : (
                  <p className={styles.clueHidden}>🔒 Disponible {day.toLowerCase()}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {today >= 7 && (
        <div className={styles.revealSection}>
          {!revealOpen ? (
            <button className={styles.revealBtn} onClick={() => setRevealOpen(true)}>
              ✨ Révéler le secret
            </button>
          ) : (
            <div className={styles.revealCard}>
              <p className={styles.revealLabel}>🤫 Le secret de {profil.nom}</p>
              <p className={styles.revealText}>"{secret.reveal}"</p>
              <p className={styles.revealFooter}>Nouveau secret lundi prochain !</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './FaqPage.module.css'

interface FaqItem { q: string; a: string; emoji: string }

const FAQ: FaqItem[] = [
  {
    emoji: '💩',
    q: 'Mon lapin mange ses crottes, c\'est normal ?',
    a: 'Oui, c\'est tout à fait normal ! Les lapins produisent deux types de crottes : les dures (normales) et les cæcotrophes, qui sont molles, brillantes et grappes. Ils les mangent directement car elles contiennent des nutriments essentiels non absorbés lors du premier passage. C\'est une partie indispensable de leur digestion.',
  },
  {
    emoji: '⏱️',
    q: 'Combien de temps peut rester seul un lapin ?',
    a: 'Un lapin adulte peut rester seul une journée si il a du foin, de l\'eau et de l\'espace. Au-delà de 24-48h, il faut quelqu\'un pour le nourrir et le surveiller. Sur le long terme, l\'isolement prolongé peut provoquer de l\'ennui et de la dépression. Les lapins sont des animaux grégaires qui ont besoin d\'interactions régulières.',
  },
  {
    emoji: '🍞',
    q: 'Peut-on donner du pain à un lapin ?',
    a: 'Non. Le pain et les produits céréaliers transformés sont trop riches en glucides et pauvres en fibres. Ils peuvent perturber la flore intestinale et favoriser l\'obésité. En cas d\'urgence, un tout petit morceau ne sera pas fatal, mais ce n\'est pas un aliment adapté aux lapins.',
  },
  {
    emoji: '😤',
    q: 'Mon lapin grogne quand je le touche, pourquoi ?',
    a: 'Les lapins grognent souvent pour défendre leur territoire (cage, espace de jeu) ou quand ils se sentent menacés. C\'est fréquent chez les lapins non stérilisés, surtout les femelles. La stérilisation réduit souvent ces comportements. Respectez son espace et approchez-vous toujours doucement, en vous mettant à sa hauteur.',
  },
  {
    emoji: '💊',
    q: 'Peut-on donner du paracétamol à un lapin malade ?',
    a: 'Non, jamais ! Le paracétamol, l\'ibuprofène et la plupart des médicaments humains sont toxiques, voire mortels pour les lapins. En cas de maladie, consultez toujours un vétérinaire spécialisé NAC (Nouveaux Animaux de Compagnie).',
  },
  {
    emoji: '🌡️',
    q: 'Mon lapin halète et a les oreilles très chaudes, que faire ?',
    a: 'C\'est une urgence ! Ces signes indiquent un coup de chaleur. Amenez-le immédiatement dans une pièce fraîche, humidifiez ses oreilles avec un linge frais (pas de glace !), proposez-lui de l\'eau et appelez le vétérinaire. Les lapins supportent mal les températures au-dessus de 25°C.',
  },
  {
    emoji: '🦷',
    q: 'Comment savoir si mon lapin a des problèmes de dents ?',
    a: 'Signes d\'alerte : bave excessive, difficulté à manger (laisse tomber la nourriture), perte de poids, abcès visible sur la mâchoire. Les dents des lapins poussent en continu — sans usure suffisante (foin, branches), elles se déforment. Une visite vétérinaire annuelle avec vérification dentaire est recommandée.',
  },
  {
    emoji: '🚿',
    q: 'Peut-on donner un bain à son lapin ?',
    a: 'Non, jamais ! Le bain est extrêmement stressant pour les lapins et peut provoquer un arrêt cardiaque. L\'humidité favorise aussi les mycoses cutanées. Les lapins se toilettent eux-mêmes comme les chats. Si une zone est sale, nettoyez-la uniquement avec un linge humide.',
  },
  {
    emoji: '🐇',
    q: 'Mon lapin fait des bonds et des vrilles, est-il malade ?',
    a: 'Au contraire ! Ce comportement s\'appelle le "binky" et c\'est le signe que votre lapin est heureux et excité. C\'est l\'une des expressions de joie les plus caractéristiques du lapin. Félicitez-vous, votre lapin est épanoui !',
  },
  {
    emoji: '🥕',
    q: 'Mon lapin refuse de manger ses légumes, que faire ?',
    a: 'Certains lapins sont très sélectifs. Essayez de varier les textures et les saveurs, proposez différentes herbes aromatiques (basilic, menthe, persil). Introduisez les nouveaux légumes progressivement. Évitez les légumes directement sortis du réfrigérateur. Si le refus dure plus de 24h et s\'accompagne d\'inactivité, consultez un vétérinaire.',
  },
  {
    emoji: '🌙',
    q: 'À quelle heure les lapins sont-ils actifs ?',
    a: 'Les lapins sont des animaux crépusculaires : ils sont surtout actifs au lever et au coucher du soleil (matin tôt et fin d\'après-midi). Pendant la journée, ils dorment souvent. C\'est normal de les trouver très calmes en milieu de journée.',
  },
  {
    emoji: '⚖️',
    q: 'Comment savoir si mon lapin est en surpoids ?',
    a: 'Un lapin en bonne santé doit avoir les côtes palpables sous une légère couche de graisse, sans les voir à l\'œil. Si vous ne sentez plus les côtes, il est probablement en surpoids. Les causes fréquentes : trop de granulés, trop de fruits ou légumes sucrés, manque d\'exercice. Consultez un vétérinaire pour un bilan.',
  },
  {
    emoji: '✂️',
    q: 'À quel âge stériliser son lapin ?',
    a: 'En général entre 4 et 6 mois, quand les organes sont matures. Pour les femelles, la stérilisation est très recommandée : 80% développent un cancer utérin après 5 ans si elles ne sont pas stérilisées. Pour les mâles, la castration réduit l\'agressivité et le marquage urinaire. Choisissez un vétérinaire spécialisé NAC.',
  },
  {
    emoji: '💧',
    q: 'Mon lapin ne boit pas beaucoup, dois-je m\'inquiéter ?',
    a: 'Si votre lapin mange beaucoup de légumes frais, il boira naturellement moins car les végétaux contiennent de l\'eau. C\'est normal. En revanche, si le lapin ne mange pas non plus, s\'isole et est prostré, c\'est une urgence — cela peut indiquer une stase digestive.',
  },
  {
    emoji: '🌿',
    q: 'Peut-on donner de l\'herbe fraîche coupée à la tondeuse ?',
    a: 'Non, pas recommandé. L\'herbe coupée à la tondeuse fermente rapidement et peut causer des troubles digestifs. Proposez plutôt de l\'herbe fraîche arrachée à la main, sans produits chimiques. Évitez les pelouses traitées avec des pesticides ou herbicides.',
  },
  {
    emoji: '🏠',
    q: 'Peut-on laisser son lapin en liberté dans tout l\'appartement ?',
    a: 'Oui, c\'est même l\'idéal ! Mais sécurisez d\'abord : protégez les fils électriques (ils adorent les ronger), retirez les plantes toxiques, bloquez les petits espaces où il pourrait rester coincé. La liberté totale est excellente pour leur bien-être mental et physique.',
  },
  {
    emoji: '🧹',
    q: 'À quelle fréquence nettoyer la litière ?',
    a: 'Idéalement tous les 2-3 jours pour une litière principale. Un bac sale pousse le lapin à faire ses besoins ailleurs. Faites un grand nettoyage complet avec désinfection une fois par semaine. Un bac propre incite le lapin à l\'utiliser systématiquement.',
  },
  {
    emoji: '🐾',
    q: 'Mon lapin perd beaucoup de poils, est-ce normal ?',
    a: 'Oui, deux fois par an (printemps et automne), les lapins muent et perdent beaucoup de poils. Pendant cette période, brossez-les quotidiennement pour éviter qu\'ils en ingèrent trop en se toilettant (ce qui peut provoquer des bouchons intestinaux). Assurez-vous qu\'ils ont du foin en abondance pour faire transiter les poils ingérés.',
  },
  {
    emoji: '🐟',
    q: 'Les granulés pour cobayes conviennent-ils aux lapins ?',
    a: 'Non. Les granulés pour cobayes contiennent de la vitamine C ajoutée (inutile pour les lapins) et n\'ont pas la même composition nutritionnelle. Choisissez toujours des granulés spécialement formulés pour lapins, avec au moins 18% de fibres.',
  },
  {
    emoji: '🚽',
    q: 'Comment apprendre la propreté à son lapin ?',
    a: 'Placez un bac à litière avec du foin dans le coin où il fait naturellement ses besoins. Les lapins choisissent instinctivement un endroit fixe. Si il fait ailleurs, nettoyez immédiatement et placez un bac à cet endroit. Récompensez-le quand il l\'utilise. La stérilisation aide aussi beaucoup pour la propreté.',
  },
]

export default function FaqPage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? FAQ.filter(f =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      )
    : FAQ

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Retour
      </button>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>🙋</span>
        <h1 className={styles.title}>Questions fréquentes</h1>
        <p className={styles.subtitle}>{FAQ.length} réponses pour les propriétaires de lapins</p>
      </div>

      <input
        className={styles.searchInput}
        type="text"
        placeholder="Rechercher une question…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className={styles.list}>
        {filtered.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={i} className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}>
              <button className={styles.question} onClick={() => setOpen(isOpen ? null : i)}>
                <span className={styles.qEmoji}>{item.emoji}</span>
                <span className={styles.qText}>{item.q}</span>
                <svg
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isOpen && <p className={styles.answer}>{item.a}</p>}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className={styles.empty}>Aucune question ne correspond à « {search} »</div>
        )}
      </div>
    </div>
  )
}

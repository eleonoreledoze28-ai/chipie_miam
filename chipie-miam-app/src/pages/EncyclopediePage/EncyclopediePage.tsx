import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './EncyclopediePage.module.css'

interface Article {
  id: string
  emoji: string
  title: string
  category: string
  content: string[]
}

const CATEGORIES = [
  { id: 'all', label: 'Tout', emoji: '📚' },
  { id: 'alimentation', label: 'Alimentation', emoji: '🥬' },
  { id: 'sante', label: 'Santé', emoji: '🩺' },
  { id: 'comportement', label: 'Comportement', emoji: '🐰' },
  { id: 'habitat', label: 'Habitat', emoji: '🏠' },
  { id: 'soins', label: 'Soins', emoji: '✨' },
]

const ARTICLES: Article[] = [
  // === ALIMENTATION ===
  {
    id: 'foin',
    emoji: '🌾',
    title: 'Le foin, base de l\'alimentation',
    category: 'alimentation',
    content: [
      'Le foin doit représenter 80% de l\'alimentation de votre lapin. Il est essentiel pour l\'usure des dents (qui poussent de 12cm par an) et pour le bon fonctionnement du système digestif.',
      'Privilégiez le foin de fléole (timothy) ou de crau. Évitez le foin de luzerne pour les adultes car il est trop riche en calcium.',
      'Le foin doit être disponible en permanence, frais et sec. Changez-le quotidiennement pour maintenir son appétence.',
    ],
  },
  {
    id: 'legumes-frais',
    emoji: '🥗',
    title: 'Les légumes frais au quotidien',
    category: 'alimentation',
    content: [
      'Un lapin adulte a besoin d\'environ 100g de verdure fraîche par kilo de poids corporel, répartis en 2 repas (matin et soir).',
      'Variez les végétaux : au moins 3 à 5 sortes différentes par jour. Mélangez feuilles, herbes aromatiques et légumes-feuilles.',
      'Introduisez toujours un nouvel aliment progressivement sur 3-4 jours pour éviter les troubles digestifs.',
    ],
  },
  {
    id: 'fruits-moderation',
    emoji: '🍎',
    title: 'Les fruits : avec modération',
    category: 'alimentation',
    content: [
      'Les fruits sont des friandises, pas un repas. Maximum 1 à 2 fois par semaine, en petites quantités (une cuillère à soupe).',
      'Ils sont riches en sucre et peuvent causer de l\'obésité et des problèmes dentaires si donnés en excès.',
      'Retirez toujours les noyaux, pépins et graines avant de donner un fruit. Certains contiennent du cyanure.',
    ],
  },
  {
    id: 'eau',
    emoji: '💧',
    title: 'L\'eau, un besoin vital',
    category: 'alimentation',
    content: [
      'Un lapin boit entre 50 et 150ml d\'eau par kilo de poids corporel par jour. L\'eau doit être fraîche et propre en permanence.',
      'Préférez une gamelle ouverte plutôt qu\'un biberon : c\'est plus naturel et le lapin boit davantage.',
      'Si votre lapin mange beaucoup de légumes frais, il boira moins car les végétaux contiennent de l\'eau.',
    ],
  },
  {
    id: 'granules',
    emoji: '🫘',
    title: 'Les granulés : compléments, pas base',
    category: 'alimentation',
    content: [
      'Les granulés ne doivent représenter qu\'une petite partie de l\'alimentation : environ 25g par kilo de poids corporel.',
      'Choisissez des granulés extrudés (uniforme) plutôt qu\'un mélange de graines pour éviter le tri sélectif.',
      'Un bon granulé contient au moins 18% de fibres et moins de 3% de matières grasses.',
    ],
  },

  // === SANTÉ ===
  {
    id: 'stase-digestive',
    emoji: '⚠️',
    title: 'La stase digestive : urgence',
    category: 'sante',
    content: [
      'La stase gastro-intestinale est la première cause de mortalité chez les lapins. Le transit s\'arrête et le contenu de l\'estomac fermente.',
      'Symptômes : le lapin ne mange plus, ne fait plus de crottes, est prostré, a le ventre gonflé et dur.',
      'C\'est une urgence vétérinaire absolue. Sans traitement rapide, la stase peut être fatale en 24-48h.',
      'Prévention : foin en permanence, exercice quotidien, variété alimentaire, réduction du stress.',
    ],
  },
  {
    id: 'dents',
    emoji: '🦷',
    title: 'Les problèmes dentaires',
    category: 'sante',
    content: [
      'Les dents d\'un lapin poussent en continu (2-3mm par semaine). Sans usure suffisante, elles provoquent des malocclusions.',
      'Le foin est le meilleur abrasif dentaire naturel. Les branches d\'arbres fruitiers (pommier, noisetier) aident aussi.',
      'Signes d\'alerte : bave excessive, difficulté à manger, perte de poids, abcès au niveau de la mâchoire.',
    ],
  },
  {
    id: 'vaccination',
    emoji: '💉',
    title: 'Les vaccins essentiels',
    category: 'sante',
    content: [
      'Deux maladies nécessitent une vaccination : la myxomatose et la maladie hémorragique virale (VHD 1 et 2).',
      'Le protocole classique : première injection dès 5 semaines, rappel à 3 mois, puis rappel annuel.',
      'Même un lapin d\'intérieur doit être vacciné : les virus peuvent être transportés par les chaussures, les insectes ou le foin.',
    ],
  },
  {
    id: 'sterilisation',
    emoji: '✂️',
    title: 'La stérilisation',
    category: 'sante',
    content: [
      'La stérilisation est fortement recommandée, surtout pour les femelles : 80% développent un cancer utérin après 5 ans si non stérilisées.',
      'Chez le mâle, la castration réduit l\'agressivité, le marquage urinaire et permet la cohabitation.',
      'L\'intervention se fait généralement entre 4 et 6 mois. Choisissez un vétérinaire spécialisé NAC.',
    ],
  },

  // === COMPORTEMENT ===
  {
    id: 'langage-corporel',
    emoji: '🗣️',
    title: 'Comprendre son lapin',
    category: 'comportement',
    content: [
      'Binky (saut avec vrille) : votre lapin est très heureux et excité !',
      'Se couche sur le flanc : il est détendu et en confiance. S\'il s\'étale complètement, il fait une "flaque de lapin".',
      'Tape du pied : il est mécontent, effrayé ou vous avertit d\'un danger.',
      'Grogne ou charge : il se sent menacé dans son territoire. Respectez son espace.',
      'Lèche vos mains/pieds : signe d\'affection, il vous toilette comme un membre de son groupe.',
    ],
  },
  {
    id: 'jeux-enrichissement',
    emoji: '🎾',
    title: 'Jeux et enrichissement',
    category: 'comportement',
    content: [
      'Un lapin s\'ennuie vite ! Proposez des tunnels, des cartons à explorer, des jouets à lancer (boules en osier).',
      'Les jeux de nourriture sont excellents : cachez des herbes dans du papier, des rouleaux de papier toilette remplis de foin.',
      'Variez les jouets régulièrement pour maintenir l\'intérêt. Un jouet "oublié" puis remis devient nouveau !',
      'Les lapins adorent creuser : un bac avec de la terre, du sable ou du papier journal déchiqueté les ravit.',
    ],
  },
  {
    id: 'socialisation',
    emoji: '👥',
    title: 'La vie sociale du lapin',
    category: 'comportement',
    content: [
      'Le lapin est un animal grégaire : il a besoin de compagnie. Un lapin seul peut développer de la dépression.',
      'L\'idéal est un couple mâle castré / femelle stérilisée. Deux mâles non castrés se battront.',
      'La mise en contact doit être progressive et sur terrain neutre. Ne forcez jamais la cohabitation.',
      'Votre présence ne remplace pas un compagnon lapin, mais des interactions quotidiennes sont indispensables.',
    ],
  },

  // === HABITAT ===
  {
    id: 'enclos',
    emoji: '🏡',
    title: 'L\'espace de vie idéal',
    category: 'habitat',
    content: [
      'Un lapin a besoin d\'au minimum 2m² d\'espace permanent, plus un espace de jeu de 4m² minimum accessible plusieurs heures par jour.',
      'Les cages à barreaux classiques du commerce sont TROP PETITES. Préférez un enclos modulable ou une pièce sécurisée.',
      'La liberté totale dans un appartement sécurisé (fils électriques protégés, plantes toxiques retirées) est l\'idéal.',
    ],
  },
  {
    id: 'litiere',
    emoji: '🧹',
    title: 'La litière et la propreté',
    category: 'habitat',
    content: [
      'Les lapins sont naturellement propres et choisissent un coin toilette. Placez-y un bac à litière avec du foin à côté.',
      'Utilisez une litière végétale (chanvre, lin, rafle de maïs). Évitez les copeaux de bois résineux (cèdre, pin) qui sont toxiques.',
      'Nettoyez le bac tous les 2-3 jours. Un bac sale pousse le lapin à faire ses besoins ailleurs.',
    ],
  },
  {
    id: 'temperature',
    emoji: '🌡️',
    title: 'Température et environnement',
    category: 'habitat',
    content: [
      'Le lapin supporte mieux le froid que la chaleur. La température idéale est entre 15°C et 22°C.',
      'Au-dessus de 28°C, risque de coup de chaleur mortel ! Signes : halètement, oreilles très chaudes, prostration.',
      'En été : bouteilles d\'eau glacée, carrelage frais, ventilateur indirect, serviettes humides.',
      'Évitez les courants d\'air directs et le soleil direct sur l\'enclos.',
    ],
  },

  // === SOINS ===
  {
    id: 'toilettage',
    emoji: '🪮',
    title: 'Le toilettage',
    category: 'soins',
    content: [
      'Brossez votre lapin 1 à 2 fois par semaine, quotidiennement en période de mue (printemps et automne).',
      'Les lapins ne doivent JAMAIS être baignés : le stress peut provoquer un arrêt cardiaque et l\'humidité cause des mycoses.',
      'Vérifiez les ongles toutes les 6-8 semaines. Si nécessaire, coupez-les avec un coupe-ongles adapté en évitant la veine.',
    ],
  },
  {
    id: 'transport',
    emoji: '🚗',
    title: 'Le transport chez le vétérinaire',
    category: 'soins',
    content: [
      'Utilisez une caisse de transport solide, tapissée d\'une serviette antidérapante et de foin.',
      'Couvrez la caisse avec un tissu pour réduire le stress visuel. Parlez doucement à votre lapin.',
      'En voiture, posez la caisse au sol (pas sur un siège) et évitez la climatisation directe.',
      'Emportez du foin et de l\'eau pour les trajets de plus de 30 minutes.',
    ],
  },
  {
    id: 'pharmacie',
    emoji: '💊',
    title: 'La pharmacie du lapin',
    category: 'soins',
    content: [
      'Indispensable : Critical Care (poudre de gavage en cas de stase), seringue de gavage, compresses stériles.',
      'Utile : désinfectant Bétadine jaune (pas rouge), coupe-ongles, brosse douce, pince à tiques.',
      'Ne donnez JAMAIS de médicament humain sans avis vétérinaire. Le paracétamol et l\'ibuprofène sont mortels pour les lapins.',
      'Gardez le numéro des urgences vétérinaires NAC à portée de main.',
    ],
  },
]

export default function EncyclopediePage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [openArticle, setOpenArticle] = useState<string | null>(null)

  // Mark encyclopédie visited (sticker unlock)
  useEffect(() => {
    try { localStorage.setItem('chipie-encyclopedie-visited', '1') } catch { /* */ }
  }, [])

  const filtered = activeCategory === 'all'
    ? ARTICLES
    : ARTICLES.filter(a => a.category === activeCategory)

  const catCounts = ARTICLES.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1
    return acc
  }, {})

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>📖</span>
        <h1 className={styles.title}>Encyclopédie Lapin</h1>
        <p className={styles.subtitle}>{ARTICLES.length} articles pour tout savoir</p>
      </div>

      {/* Quick shortcuts */}
      <div className={styles.shortcuts}>
        <button className={styles.shortcutBtn} onClick={() => navigate('/faq')}>
          <span>🙋</span>
          <div><span className={styles.shortcutTitle}>Questions fréquentes</span><span className={styles.shortcutSub}>20 réponses rapides</span></div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><path d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>

      {/* Lexique des races shortcut */}
      <button className={styles.racesBtn} onClick={() => navigate('/races')}>
        <span className={styles.racesBtnEmoji}>🐇</span>
        <div className={styles.racesBtnText}>
          <span className={styles.racesBtnTitle}>Lexique des races</span>
          <span className={styles.racesBtnSub}>9 races — caractère, soins, alimentation</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
          <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Category filter */}
      <div className={styles.categories}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            className={`${styles.catBtn} ${activeCategory === c.id ? styles.catBtnActive : ''}`}
            onClick={() => setActiveCategory(c.id)}
          >
            <span>{c.emoji}</span>
            <span>{c.label}</span>
            {c.id !== 'all' && <span className={styles.catCount}>{catCounts[c.id] || 0}</span>}
          </button>
        ))}
      </div>

      {/* Vidéos recommandées */}
      {(activeCategory === 'all') && (
        <div className={styles.videosSection}>
          <h2 className={styles.videosTitle}>🎬 Vidéos recommandées</h2>
          <p className={styles.videosSub}>Ressources sur YouTube pour approfondir</p>
          {[
            { title: 'Alimentation du lapin : les bases',       q: 'alimentation lapin légumes foin',         cat: '🥗 Alimentation' },
            { title: 'Comprendre le comportement de son lapin', q: 'comportement lapin binky langage',         cat: '🐰 Comportement' },
            { title: 'Soins et toilettage du lapin',            q: 'soin toilettage lapin brossage ongles',    cat: '✨ Soins' },
            { title: 'Stase digestive : reconnaître l\'urgence',q: 'stase digestive lapin urgence vétérinaire',cat: '⚠️ Santé' },
          ].map((v, i) => (
            <a
              key={i}
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.q)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.videoCard}
            >
              <div className={styles.videoThumb}>▶</div>
              <div className={styles.videoInfo}>
                <span className={styles.videoTitle}>{v.title}</span>
                <span className={styles.videoCat}>{v.cat}</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </a>
          ))}
        </div>
      )}

      {/* Articles */}
      <div className={styles.articles}>
        {filtered.map(article => {
          const isOpen = openArticle === article.id
          return (
            <div key={article.id} className={`${styles.article} ${isOpen ? styles.articleOpen : ''}`}>
              <button className={styles.articleHeader} onClick={() => setOpenArticle(isOpen ? null : article.id)}>
                <span className={styles.articleEmoji}>{article.emoji}</span>
                <div className={styles.articleMeta}>
                  <span className={styles.articleTitle}>{article.title}</span>
                  <span className={styles.articleCatLabel}>{CATEGORIES.find(c => c.id === article.category)?.label}</span>
                </div>
                <svg className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {isOpen && (
                <div className={styles.articleBody}>
                  {article.content.map((paragraph, i) => (
                    <p key={i} className={styles.paragraph}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import styles from './JeuxHubPage.module.css'

const ZONES = [
  {
    id: 'foret',
    name: 'La Forêt',
    emoji: '🌲',
    color: '#4a9e40',
    games: [
      { id: 'snake',      path: '/jeu/snake',      emoji: '🐍', title: 'Snake Chipie',       desc: 'Mange les bons, évite les toxiques !' },
      { id: 'labyrinthe', path: '/jeu/labyrinthe',  emoji: '🌀', title: 'Labyrinthe',         desc: 'Guidez Chipie vers son repas' },
      { id: 'course',     path: '/jeu/course',      emoji: '🏃', title: "Course d'obstacles", desc: 'Saute, collecte, esquive !' },
    ],
  },
  {
    id: 'village',
    name: 'Le Village',
    emoji: '🏡',
    color: '#E8963A',
    games: [
      { id: 'tamagotchi', path: '/jeu/tamagotchi',  emoji: '🐰', title: 'Chipie Virtuelle',   desc: 'Nourrissez et chouchoutez Chipie' },
      { id: 'memory',     path: '/jeu/memory',      emoji: '🧠', title: 'Memory',             desc: 'Trouvez les paires image / nom' },
      { id: 'devinette',  path: '/jeu/devinette',   emoji: '📸', title: 'Devinette Photo',    desc: 'Reconnaissez les végétaux' },
      { id: 'colorie',    path: '/jeu/colorie',     emoji: '🎨', title: 'Colorie Chipie',     desc: 'Colorie Chipie comme tu veux !' },
    ],
  },
  {
    id: 'potager',
    name: 'Le Potager',
    emoji: '🌾',
    color: '#4CD964',
    games: [
      { id: 'plante',     path: '/jeu/plante',      emoji: '🌱', title: 'Plante & Pousse',    desc: 'Cultive le potager de Chipie' },
      { id: 'peche',      path: '/jeu/peche',       emoji: '🎣', title: 'Pêche au foin',      desc: 'Trouve les légumes cachés' },
      { id: 'assiette',   path: '/jeu/assiette',    emoji: '🍽️', title: 'Assiette de Chipie', desc: 'Composez le repas idéal' },
      { id: 'tour',       path: '/jeu/tour',        emoji: '🏗️', title: 'Tour de légumes',    desc: 'Empile le plus haut possible !' },
      { id: 'marche',     path: '/jeu/marche',      emoji: '🛒', title: 'Marché de Chipie',   desc: 'Fais les courses dans le budget !' },
    ],
  },
  {
    id: 'ecole',
    name: "L'École",
    emoji: '📚',
    color: '#5AC8FA',
    games: [
      { id: 'quiz',        path: '/jeu/quiz',        emoji: '⚡', title: 'Quiz Vrai/Faux',    desc: 'Bon pour Chipie ? Répondez vite !' },
      { id: 'tri-express', path: '/jeu/tri-express', emoji: '🃏', title: 'Tri Express',       desc: 'Bon ou toxique ? Glisse la carte !' },
      { id: 'anagramme',   path: '/jeu/anagramme',   emoji: '🔤', title: 'Mot Mélangé',       desc: 'Remettez les lettres dans le bon ordre' },
      { id: 'soin',        path: '/jeu/soin',        emoji: '🚑', title: "Soin d'urgence",    desc: 'Identifie le toxique et soigne Chipie !' },
    ],
  },
]

export default function JeuxHubPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Jeux 🎮</h1>
        <p className={styles.subtitle}>Choisis ton aventure !</p>
      </div>

      {ZONES.map(zone => (
        <div key={zone.id} className={styles.section}>
          <div className={styles.sectionHeader} style={{ '--zc': zone.color } as React.CSSProperties}>
            <span className={styles.sectionEmoji}>{zone.emoji}</span>
            <span className={styles.sectionName}>{zone.name}</span>
            <span className={styles.sectionCount}>{zone.games.length} jeux</span>
          </div>
          <div className={styles.grid}>
            {zone.games.map(game => (
              <button
                key={game.id}
                className={styles.card}
                style={{ '--zc': zone.color } as React.CSSProperties}
                onClick={() => navigate(game.path)}
              >
                <span className={styles.cardEmoji}>{game.emoji}</span>
                <span className={styles.cardTitle}>{game.title}</span>
                <span className={styles.cardDesc}>{game.desc}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

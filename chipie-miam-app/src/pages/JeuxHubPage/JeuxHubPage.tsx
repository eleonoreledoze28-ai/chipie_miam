import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './JeuxHubPage.module.css'

const GAME_DATA: Record<string, { path: string; emoji: string; title: string; desc: string }> = {
  devinette:    { path: '/jeu/devinette',    emoji: '📸', title: 'Devinette Photo',    desc: 'Reconnaissez les végétaux à partir de leur photo' },
  memory:       { path: '/jeu/memory',       emoji: '🧠', title: 'Memory',             desc: 'Trouvez les paires image / nom de végétaux' },
  anagramme:    { path: '/jeu/anagramme',    emoji: '🔤', title: 'Mot Mélangé',        desc: 'Remettez les lettres dans le bon ordre' },
  tamagotchi:   { path: '/jeu/tamagotchi',   emoji: '🐰', title: 'Chipie Virtuelle',   desc: 'Nourrissez et chouchoutez Chipie' },
  labyrinthe:   { path: '/jeu/labyrinthe',   emoji: '🌀', title: 'Labyrinthe',         desc: 'Guidez Chipie vers son repas' },
  assiette:     { path: '/jeu/assiette',     emoji: '🍽️', title: 'Assiette de Chipie', desc: 'Composez le repas idéal pour Chipie' },
  quiz:         { path: '/jeu/quiz',         emoji: '⚡', title: 'Quiz Vrai/Faux',     desc: 'Bon pour Chipie ? Répondez vite !' },
  snake:        { path: '/jeu/snake',        emoji: '🐍', title: 'Snake Chipie',       desc: 'Mange les bons, évite les toxiques !' },
  'tri-express':{ path: '/jeu/tri-express',  emoji: '🃏', title: 'Tri Express',        desc: 'Bon ou toxique ? Glisse la carte !' },
  course:       { path: '/jeu/course',       emoji: '🏃', title: "Course d'obstacles", desc: 'Saute, collecte, esquive !' },
  plante:       { path: '/jeu/plante',       emoji: '🌱', title: 'Plante & Pousse',    desc: 'Cultive le potager de Chipie' },
  tour:         { path: '/jeu/tour',         emoji: '🏗️', title: 'Tour de légumes',    desc: 'Empile le plus haut possible !' },
  peche:        { path: '/jeu/peche',        emoji: '🎣', title: 'Pêche au foin',      desc: 'Trouve les légumes cachés dans le foin' },
}

interface Zone {
  id: string
  name: string
  emoji: string
  color: string
  top: string
  left: string
  gameIds: string[]
}

const ZONES: Zone[] = [
  {
    id: 'foret',
    name: 'La Forêt',
    emoji: '🌲',
    color: '#4a9e40',
    top: '7%', left: '3%',
    gameIds: ['snake', 'labyrinthe', 'course'],
  },
  {
    id: 'village',
    name: 'Le Village',
    emoji: '🏡',
    color: '#E8963A',
    top: '7%', left: '58%',
    gameIds: ['tamagotchi', 'memory', 'devinette'],
  },
  {
    id: 'potager',
    name: 'Le Potager',
    emoji: '🌾',
    color: '#4CD964',
    top: '56%', left: '3%',
    gameIds: ['plante', 'peche', 'assiette', 'tour'],
  },
  {
    id: 'ecole',
    name: "L'École",
    emoji: '📚',
    color: '#5AC8FA',
    top: '56%', left: '58%',
    gameIds: ['quiz', 'tri-express', 'anagramme'],
  },
]

// Decorative elements scattered on the map
// anim: 'cloud' | 'breath' | 'bob' | 'spin'
const DECOS = [
  { emoji: '☁️', top: '1%',  left: '8%',  size: '1.1rem', anim: 'cloud', delay: 0    },
  { emoji: '☁️', top: '2%',  left: '44%', size: '0.9rem', anim: 'cloud', delay: 1400 },
  { emoji: '☁️', top: '1%',  left: '74%', size: '1rem',   anim: 'cloud', delay: 700  },
  { emoji: '🌳', top: '20%', left: '6%',  size: '1.1rem', anim: 'breath', delay: 0   },
  { emoji: '🌲', top: '27%', left: '12%', size: '0.9rem', anim: 'breath', delay: 600 },
  { emoji: '🌸', top: '22%', left: '68%', size: '0.9rem', anim: 'breath', delay: 300 },
  { emoji: '🏠', top: '28%', left: '76%', size: '0.9rem', anim: 'bob',    delay: 200 },
  { emoji: '🌻', top: '70%', left: '8%',  size: '0.9rem', anim: 'breath', delay: 900 },
  { emoji: '🥕', top: '76%', left: '14%', size: '0.85rem',anim: 'bob',    delay: 500 },
  { emoji: '✏️', top: '70%', left: '72%', size: '0.9rem', anim: 'bob',    delay: 100 },
  { emoji: '⭐', top: '77%', left: '78%', size: '0.85rem',anim: 'spin',   delay: 0   },
]

export default function JeuxHubPage() {
  const navigate = useNavigate()
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  const activeZone = ZONES.find(z => z.id === selectedZone)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Le Monde de Chipie</h1>
        <p className={styles.subtitle}>Explore les zones et joue !</p>
      </div>

      {/* ── Map ── */}
      <div className={styles.map}>

        {/* Terrain path SVG */}
        <svg className={styles.pathSvg} viewBox="0 0 360 330" preserveAspectRatio="none">
          {/* Road base — solid dirt bed */}
          <path
            d="M 80,68 Q 180,18 278,68 Q 334,149 278,230 Q 180,282 80,230 Q 26,149 80,68 Z"
            fill="none"
            stroke="#5c3a0e"
            strokeWidth="18"
            strokeLinecap="round"
            opacity="0.55"
          />
          {/* Road mid layer — warm brown */}
          <path
            d="M 80,68 Q 180,18 278,68 Q 334,149 278,230 Q 180,282 80,230 Q 26,149 80,68 Z"
            fill="none"
            stroke="#c8903a"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.60"
          />
          {/* Road dashes — sandy highlights */}
          <path
            d="M 80,68 Q 180,18 278,68 Q 334,149 278,230 Q 180,282 80,230 Q 26,149 80,68 Z"
            fill="none"
            stroke="#f0d080"
            strokeWidth="4"
            strokeDasharray="12 10"
            strokeLinecap="round"
            opacity="0.65"
          />
        </svg>

        {/* Decorative emojis */}
        {DECOS.map((d, i) => (
          <span
            key={i}
            className={`${styles.deco} ${styles[`deco_${d.anim}`]}`}
            style={{ top: d.top, left: d.left, fontSize: d.size, animationDelay: `${d.delay}ms` }}
          >
            {d.emoji}
          </span>
        ))}

        {/* Chipie in center */}
        <div className={styles.chipieCenter}>
          <span className={styles.chipieEmoji}>🐰</span>
          <span className={styles.chipieName}>Chipie</span>
        </div>

        {/* Zone cards */}
        {ZONES.map((zone, i) => (
          <button
            key={zone.id}
            className={`${styles.zoneCard} ${selectedZone === zone.id ? styles.zoneCardActive : ''}`}
            style={{
              top: zone.top,
              left: zone.left,
              '--zc': zone.color,
              animationDelay: `${i * 120}ms`,
            } as React.CSSProperties}
            onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
          >
            <span className={styles.zoneEmoji}>{zone.emoji}</span>
            <span className={styles.zoneName}>{zone.name}</span>
            <div className={styles.zoneDots}>
              {zone.gameIds.map((_, j) => (
                <span key={j} className={styles.zoneDot} style={{ background: zone.color }} />
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* ── Bottom sheet ── */}
      {selectedZone && activeZone && (
        <div className={styles.overlay} onClick={() => setSelectedZone(null)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />

            <div className={styles.sheetHeader}>
              <span className={styles.sheetZoneEmoji}>{activeZone.emoji}</span>
              <h2 className={styles.sheetTitle}>{activeZone.name}</h2>
              <button className={styles.sheetClose} onClick={() => setSelectedZone(null)}>✕</button>
            </div>

            <div className={styles.sheetGames}>
              {activeZone.gameIds.map(id => {
                const game = GAME_DATA[id]
                return (
                  <button key={id} className={styles.sheetGame} onClick={() => navigate(game.path)}>
                    <span className={styles.sheetGameEmoji}>{game.emoji}</span>
                    <div className={styles.sheetGameInfo}>
                      <span className={styles.sheetGameTitle}>{game.title}</span>
                      <span className={styles.sheetGameDesc}>{game.desc}</span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" className={styles.sheetGameArrow}>
                      <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

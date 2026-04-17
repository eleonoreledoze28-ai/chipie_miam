import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ConseilsSaisonPage.module.css'

type SeasonKey = 'printemps' | 'ete' | 'automne' | 'hiver'

interface Conseil {
  emoji: string
  titre: string
  texte: string
  tag?: 'alimentation' | 'sante' | 'comportement' | 'logement'
}

const SAISONS: { key: SeasonKey; label: string; emoji: string; couleur: string; bg: string }[] = [
  { key: 'printemps', label: 'Printemps', emoji: '🌸', couleur: '#e91e8c', bg: '#fde8f4' },
  { key: 'ete',       label: 'Été',       emoji: '☀️', couleur: '#f59e0b', bg: '#fef3c7' },
  { key: 'automne',   label: 'Automne',   emoji: '🍂', couleur: '#ea580c', bg: '#ffedd5' },
  { key: 'hiver',     label: 'Hiver',     emoji: '❄️', couleur: '#3b82f6', bg: '#dbeafe' },
]

const CONSEILS: Record<SeasonKey, Conseil[]> = {
  printemps: [
    { emoji: '🌱', titre: 'Herbes fraîches avec précaution', texte: "Les premières pousses printanières sont délicieuses mais riches en eau. Introduis-les progressivement pour éviter les troubles digestifs.", tag: 'alimentation' },
    { emoji: '🌼', titre: 'Pissenlit à saisir !', texte: "Le pissenlit frais est un régal pour les lapins. Feuilles et fleurs sont comestibles, riches en vitamines. À cueillir loin des routes.", tag: 'alimentation' },
    { emoji: '🌿', titre: 'Surveille la mue', texte: "Le printemps déclenche une mue importante. Brosse régulièrement ton lapin pour éviter l'ingestion de poils.", tag: 'sante' },
    { emoji: '💊', titre: 'Rappel vaccin', texte: "Début de printemps = idéal pour le rappel vaccin VHD/myxomatose. Contacte ton vétérinaire pour planifier.", tag: 'sante' },
    { emoji: '🌞', titre: 'Premiers rayons de soleil', texte: "Ton lapin peut profiter du jardin mais surveille la chaleur. Prévois toujours un coin à l'ombre et de l'eau fraîche.", tag: 'comportement' },
    { emoji: '🐣', titre: 'Énergie au maximum', texte: "Les lapins sont très actifs au printemps. C'est le bon moment pour enrichir son environnement avec de nouveaux jouets.", tag: 'comportement' },
  ],
  ete: [
    { emoji: '🌡️', titre: 'Attention à la chaleur', texte: "Le lapin supporte mal les températures > 25°C. Maintiens la pièce fraîche, évite l'exposition directe au soleil.", tag: 'sante' },
    { emoji: '🧊', titre: 'Astuces rafraîchissantes', texte: "Place une bouteille d'eau glacée près de ton lapin. Tu peux aussi humidifier légèrement ses oreilles (zone de dissipation thermique).", tag: 'sante' },
    { emoji: '💧', titre: 'Hydratation renforcée', texte: "En été, change l'eau 2 fois par jour minimum. Tu peux proposer des légumes extra-frais (sans sortir du frigo abruptement).", tag: 'alimentation' },
    { emoji: '🥒', titre: 'Légumes gorgés d\'eau', texte: "Concombre, courgette, céleri : idéaux pour l'hydratation estivale. À intégrer en petite quantité dans la ration quotidienne.", tag: 'alimentation' },
    { emoji: '🌙', titre: 'Activité aux heures fraîches', texte: "Les lapins sont naturellement actifs à l'aube et au crépuscule. En été, adapte les sorties à ces moments plus frais.", tag: 'comportement' },
    { emoji: '🐛', titre: 'Surveillance des parasites', texte: "Vérifie régulièrement l'absence de puces, tiques ou myiases (asticots) qui prolifèrent en été. Inspecte autour de la queue.", tag: 'sante' },
  ],
  automne: [
    { emoji: '🍁', titre: 'Feuilles mortes : avec prudence', texte: "Certaines feuilles (chêne, noyer) sont toxiques. Évite les ramassages en forêt sauf si tu identifies précisément les espèces.", tag: 'alimentation' },
    { emoji: '🌾', titre: 'Stocker le foin maintenant', texte: "Automne est la bonne saison pour faire des réserves de foin de qualité. Vérifie l'humidité du stockage.", tag: 'alimentation' },
    { emoji: '🧥', titre: 'Mue d\'automne', texte: "Seconde mue de l'année. Brosse quotidiennement et assure-toi que ton lapin n'ingère pas trop de poils.", tag: 'sante' },
    { emoji: '🏠', titre: 'Préparer le logement', texte: "Si ton lapin vit à l'extérieur, anticipe l'isolation de son abri contre le froid et l'humidité hivernale.", tag: 'logement' },
    { emoji: '🍄', titre: 'Méfie-toi des champignons', texte: "Lors des promenades en extérieur, empêche ton lapin de grignoter champignons et baies inconnues.", tag: 'alimentation' },
    { emoji: '📅', titre: 'Bilan vétérinaire annuel', texte: "L'automne est une bonne période pour le check-up annuel. Poids, dents, griffes : anticipe l'hiver en bonne santé.", tag: 'sante' },
  ],
  hiver: [
    { emoji: '🌡️', titre: 'Température minimale', texte: "Les lapins supportent le froid jusqu'à 10°C, mais l'humidité est leur vraie ennemie. Garde l'abri sec et sans courants d'air.", tag: 'logement' },
    { emoji: '🥕', titre: 'Légumes-racines de saison', texte: "Carotte (avec modération), panais, céleri-rave : les légumes racines d'hiver sont disponibles et appréciés.", tag: 'alimentation' },
    { emoji: '🌾', titre: 'Plus de foin en hiver', texte: "En hiver, les lapins mangent plus de foin pour se réchauffer. Vérifie le stock régulièrement.", tag: 'alimentation' },
    { emoji: '💡', titre: 'Besoin de lumière', texte: "La courte durée du jour peut affecter l'humeur du lapin. Assure au moins 10h de lumière par jour (lumière naturelle ou douce lumière artificielle).", tag: 'comportement' },
    { emoji: '🤗', titre: 'Compagnie bienvenue', texte: "Par grand froid, les lapins d'intérieur apprécient encore plus la compagnie. Augmente les sessions de câlins !", tag: 'comportement' },
    { emoji: '🦷', titre: 'Contrôle dentaire', texte: "En hiver, propose des branches (pommier, osier) pour l'usure des dents. La croissance dentaire se poursuit toute l'année.", tag: 'sante' },
  ],
}

const TAG_LABELS: Record<string, string> = {
  alimentation: '🥕 Alimentation',
  sante: '💊 Santé',
  comportement: '🐇 Comportement',
  logement: '🏠 Logement',
}

function getCurrentSeasonKey(): SeasonKey {
  const m = new Date().getMonth()
  if (m >= 2 && m <= 4) return 'printemps'
  if (m >= 5 && m <= 7) return 'ete'
  if (m >= 8 && m <= 10) return 'automne'
  return 'hiver'
}

export default function ConseilsSaisonPage() {
  const navigate = useNavigate()
  const currentKey = getCurrentSeasonKey()
  const [selected, setSelected] = useState<SeasonKey>(currentKey)

  const saison = SAISONS.find(s => s.key === selected)!
  const conseils = CONSEILS[selected]

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
        <span className={styles.headerEmoji}>🍃</span>
        <div>
          <h1 className={styles.title}>Conseils de saison</h1>
          <p className={styles.subtitle}>Adapte le quotidien de ton lapin à chaque saison</p>
        </div>
      </div>

      {/* Season tabs */}
      <div className={styles.tabs}>
        {SAISONS.map(s => (
          <button
            key={s.key}
            className={`${styles.tab} ${selected === s.key ? styles.tabActive : ''}`}
            style={selected === s.key ? { '--sc': s.couleur, '--sbg': s.bg } as React.CSSProperties : undefined}
            onClick={() => setSelected(s.key)}
          >
            <span className={styles.tabEmoji}>{s.emoji}</span>
            <span className={styles.tabLabel}>{s.label}</span>
            {s.key === currentKey && <span className={styles.tabNow}>maintenant</span>}
          </button>
        ))}
      </div>

      {/* Season hero */}
      <div className={styles.hero} style={{ '--sc': saison.couleur, '--sbg': saison.bg } as React.CSSProperties}>
        <span className={styles.heroEmoji}>{saison.emoji}</span>
        <div>
          <p className={styles.heroTitle}>{saison.label}</p>
          {selected === currentKey && <p className={styles.heroCurrent}>Saison actuelle</p>}
        </div>
        <span className={styles.heroCount}>{conseils.length} conseils</span>
      </div>

      {/* Advice cards */}
      <div className={styles.list}>
        {conseils.map((c, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.cardEmoji}>{c.emoji}</span>
              <div className={styles.cardContent}>
                <p className={styles.cardTitle}>{c.titre}</p>
                <p className={styles.cardText}>{c.texte}</p>
              </div>
            </div>
            {c.tag && (
              <span className={styles.tag}>{TAG_LABELS[c.tag]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

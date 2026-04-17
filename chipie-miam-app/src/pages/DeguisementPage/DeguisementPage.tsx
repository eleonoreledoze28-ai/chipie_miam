import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { assetUrl } from '../../utils/assetUrl'
import styles from './DeguisementPage.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

export interface Costume {
  id: string
  emoji: string
  label: string
  desc: string
  unlock?: string
}

export const COSTUMES: Costume[] = [
  { id: 'none',      emoji: '',   label: 'Aucun',         desc: 'Chipie au naturel' },
  { id: 'princesse', emoji: '👑', label: 'Princesse',     desc: 'La reine du foin' },
  { id: 'pirate',    emoji: '🏴‍☠️', label: 'Pirate',       desc: 'Cap sur les légumes !' },
  { id: 'astronaute',emoji: '🚀', label: 'Astronaute',    desc: 'Exploratrice de l\'espace' },
  { id: 'chef',      emoji: '👨‍🍳', label: 'Chef cuisinière', desc: 'Maîtresse des saveurs' },
  { id: 'cowboy',    emoji: '🤠', label: 'Cowgirl',       desc: 'La cavalière des prairies' },
  { id: 'ninja',     emoji: '🥷', label: 'Ninja',         desc: 'Silencieuse et redoutable' },
  { id: 'licorne',   emoji: '🦄', label: 'Licorne',       desc: 'Magique et unique' },
  { id: 'fee',       emoji: '🧚', label: 'Fée',           desc: 'Disponible au printemps', unlock: 'printemps' },
  { id: 'soleil',    emoji: '☀️', label: 'Soleil d\'été', desc: 'Disponible en été', unlock: 'ete' },
  { id: 'citrouille',emoji: '🎃', label: 'Citrouille',    desc: 'Disponible en automne', unlock: 'automne' },
  { id: 'noel',      emoji: '🎅', label: 'Père Noël',     desc: 'Disponible en hiver', unlock: 'hiver' },
  { id: 'vampire',   emoji: '🧛', label: 'Vampire',       desc: 'Disponible en automne', unlock: 'automne' },
  { id: 'flocon',    emoji: '❄️', label: 'Flocon',        desc: 'Disponible en hiver', unlock: 'hiver' },
  { id: 'detective', emoji: '🕵️', label: 'Détective',    desc: 'Sur la piste du pissenlit' },
  { id: 'rock',      emoji: '🎸', label: 'Rock star',     desc: 'Les oreilles en feu' },
  { id: 'sorciere',  emoji: '🧙', label: 'Sorcière',      desc: 'Disponible en automne', unlock: 'automne' },
  { id: 'champion',  emoji: '🏆', label: 'Championne',    desc: 'La meilleure de toutes' },
]

function getCurrentSeason(): string {
  const m = new Date().getMonth()
  if (m >= 2 && m <= 4) return 'printemps'
  if (m >= 5 && m <= 7) return 'ete'
  if (m >= 8 && m <= 10) return 'automne'
  return 'hiver'
}

export function storageKey() { return `chipie-costume-${getActiveProfileId()}` }
export function loadCostume(): string { return localStorage.getItem(storageKey()) ?? 'none' }

export default function DeguisementPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [selected, setSelected] = useState(loadCostume)

  const currentSeason = getCurrentSeason()
  const avatarSrc = profil.avatar ? assetUrl(profil.avatar) : DEFAULT_AVATAR

  function isUnlocked(c: Costume): boolean {
    if (!c.unlock) return true
    return c.unlock === currentSeason
  }

  function handleSelect(id: string) {
    setSelected(id)
    localStorage.setItem(storageKey(), id)
  }

  const activeCostume = COSTUMES.find(c => c.id === selected)

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
        <span className={styles.headerEmoji}>🎭</span>
        <div>
          <h1 className={styles.title}>Chipie se déguise</h1>
          <p className={styles.subtitle}>Choisis un costume pour {profil.nom}</p>
        </div>
      </div>

      {/* Avatar preview */}
      <div className={styles.preview}>
        <div className={styles.avatarWrap}>
          <img src={avatarSrc} alt={profil.nom} className={styles.avatar} />
          {activeCostume && activeCostume.id !== 'none' && (
            <span className={styles.costumeOverlay}>{activeCostume.emoji}</span>
          )}
        </div>
        <div className={styles.previewInfo}>
          <p className={styles.previewName}>{profil.nom}</p>
          <p className={styles.previewCostume}>
            {activeCostume?.id === 'none' ? 'Sans costume' : activeCostume?.label ?? ''}
          </p>
          {activeCostume && activeCostume.id !== 'none' && (
            <p className={styles.previewDesc}>{activeCostume.desc}</p>
          )}
        </div>
      </div>

      {/* Costume grid */}
      <div className={styles.grid}>
        {COSTUMES.map(c => {
          const unlocked = isUnlocked(c)
          const active = selected === c.id
          return (
            <button
              key={c.id}
              className={`${styles.costumeBtn} ${active ? styles.costumeBtnActive : ''} ${!unlocked ? styles.costumeBtnLocked : ''}`}
              onClick={() => unlocked && handleSelect(c.id)}
            >
              <span className={styles.costumeEmoji}>{c.id === 'none' ? '🐇' : c.emoji}</span>
              <span className={styles.costumeLabel}>{c.label}</span>
              {!unlocked && <span className={styles.lockIcon}>🔒</span>}
              {active && <span className={styles.checkMark}>✓</span>}
            </button>
          )
        })}
      </div>

      {currentSeason && (
        <p className={styles.hint}>
          🍃 Certains costumes se débloquent selon la saison. Reviens en {
            currentSeason === 'printemps' ? 'été' :
            currentSeason === 'ete' ? 'automne' :
            currentSeason === 'automne' ? 'hiver' : 'printemps'
          } pour en découvrir d'autres !
        </p>
      )}
    </div>
  )
}

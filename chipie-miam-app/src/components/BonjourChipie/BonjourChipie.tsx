import { useMemo } from 'react'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { assetUrl } from '../../utils/assetUrl'
import styles from './BonjourChipie.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

interface Props {
  todayTotal: number
  checkedCount: number
  checklistTotal: number
}

function getGreeting(nom: string): { text: string; emoji: string; sub: string } {
  const h = new Date().getHours()
  const day = new Date().toLocaleDateString('fr-FR', { weekday: 'long' })
  const dayCapital = day.charAt(0).toUpperCase() + day.slice(1)

  if (h >= 5 && h < 12) return {
    text: `Bonjour !`,
    emoji: '🌅',
    sub: `${dayCapital} — n'oublie pas les légumes de ${nom}`,
  }
  if (h >= 12 && h < 18) return {
    text: `Bonne après-midi !`,
    emoji: '☀️',
    sub: `${dayCapital} — ${nom} a besoin de verdure`,
  }
  if (h >= 18 && h < 22) return {
    text: `Bonsoir !`,
    emoji: '🌆',
    sub: `${dayCapital} — dernier repas de la journée`,
  }
  return {
    text: `Bonne nuit !`,
    emoji: '🌙',
    sub: `${nom} dort paisiblement 🐇`,
  }
}

function getMood(todayTotal: number, checkedCount: number, checklistTotal: number) {
  if (checkedCount === checklistTotal && todayTotal > 0) return { emoji: '😄', label: 'Chipie est heureuse !' }
  if (todayTotal === 0) return { emoji: '😔', label: 'Chipie attend ses légumes…' }
  if (checkedCount < 2) return { emoji: '🙂', label: 'Quelques choses à faire encore' }
  return { emoji: '😊', label: 'Bonne journée en cours !' }
}

export default function BonjourChipie({ todayTotal, checkedCount, checklistTotal }: Props) {
  const { profil } = useProfil()

  const greeting = useMemo(() => getGreeting(profil.nom), [profil.nom])
  const mood = useMemo(() => getMood(todayTotal, checkedCount, checklistTotal), [todayTotal, checkedCount, checklistTotal])

  // Last seen check (show "tu nous as manqué" if >1 day)
  const lastSeenMsg = useMemo(() => {
    try {
      const last = localStorage.getItem(`chipie-last-open-${getActiveProfileId()}`)
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem(`chipie-last-open-${getActiveProfileId()}`, today)
      if (!last) return null
      const diff = Math.floor((Date.now() - new Date(last).getTime()) / 86400000)
      if (diff >= 2) return `${diff} jours sans nouvelles… ${profil.nom} t'attendait ! 🥺`
      if (diff === 1) return `De retour ! ${profil.nom} est content(e) de te revoir 🐇`
      return null
    } catch { return null }
  }, [profil.nom])

  const avatarSrc = profil.avatar ? assetUrl(profil.avatar) : DEFAULT_AVATAR
  const accentColor = profil.couleur || 'var(--accent-orange)'

  return (
    <div className={styles.card} style={{ '--ac': accentColor } as React.CSSProperties}>
      <div className={styles.left}>
        <div className={styles.avatarWrap}>
          <img src={avatarSrc} alt={profil.nom} className={styles.avatar} />
          <span className={styles.moodDot}>{mood.emoji}</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.greetRow}>
          <span className={styles.greetEmoji}>{greeting.emoji}</span>
          <span className={styles.greetText}>{greeting.text}</span>
        </div>
        <p className={styles.name}>{profil.nom}</p>
        <p className={styles.sub}>
          {lastSeenMsg ?? greeting.sub}
        </p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statVal}>{todayTotal}</span>
            <span className={styles.statLbl}>portions</span>
          </div>
          <div className={styles.statDiv} />
          <div className={styles.stat}>
            <span className={styles.statVal}>{checkedCount}/{checklistTotal}</span>
            <span className={styles.statLbl}>checklist</span>
          </div>
          <div className={styles.statDiv} />
          <div className={styles.stat}>
            <span className={styles.statMood}>{mood.label}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import styles from './AnniversairePage.module.css'

// ── Age helpers ───────────────────────────────────────────────────────────────
function calcAge(dateNaissance: string): number {
  const today = new Date()
  const bday = new Date(dateNaissance + 'T00:00:00')
  let age = today.getFullYear() - bday.getFullYear()
  const m = today.getMonth() - bday.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--
  return Math.max(0, age)
}

function calcHumanAge(rabbitAge: number): number {
  if (rabbitAge <= 0) return 0
  if (rabbitAge < 1) return Math.round(rabbitAge * 14)
  return Math.round(6 + rabbitAge * 8)
}

function daysUntilBirthday(dateNaissance: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const bday = new Date(dateNaissance + 'T00:00:00')
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  const diff = (next.getTime() - today.getTime()) / 86400000
  return Math.round(diff)
}

function isBirthday(dateNaissance: string): boolean {
  const today = new Date()
  const bday = new Date(dateNaissance + 'T00:00:00')
  return today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate()
}

function formatDateFr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

function nextBirthdayDate(dateNaissance: string): string {
  const today = new Date()
  const bday = new Date(dateNaissance + 'T00:00:00')
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
  return `${next.getDate()} ${months[next.getMonth()]} ${next.getFullYear()}`
}

// ── Confetti ──────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#F0A53A','#B07CFF','#4cd964','#ff3b30','#ffcc00','#5AC8FA','#ff69b4']

interface Confetto {
  id: number
  left: number
  color: string
  delay: number
  duration: number
  size: number
}

function generateConfetti(n = 40): Confetto[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 2,
    duration: 2.5 + Math.random() * 2,
    size: 6 + Math.random() * 8,
  }))
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AnniversairePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [confetti] = useState<Confetto[]>(() => generateConfetti(50))
  const [tick, setTick] = useState(0)

  // Refresh countdown every minute
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const hasDate = !!profil.dateNaissance

  const age = useMemo(() => hasDate ? calcAge(profil.dateNaissance) : 0, [profil.dateNaissance, hasDate])
  const humanAge = useMemo(() => calcHumanAge(age), [age])
  const days = useMemo(() => hasDate ? daysUntilBirthday(profil.dateNaissance) : 0, [profil.dateNaissance, hasDate, tick])
  const isToday = useMemo(() => hasDate && isBirthday(profil.dateNaissance), [profil.dateNaissance, hasDate])
  const nextDate = useMemo(() => hasDate ? nextBirthdayDate(profil.dateNaissance) : '', [profil.dateNaissance, hasDate])

  const avatarSrc = profil.avatar || `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

  return (
    <div className={styles.page}>
      {/* Confetti on birthday */}
      {isToday && (
        <div className={styles.confettiWrap} aria-hidden>
          {confetti.map(c => (
            <div
              key={c.id}
              className={styles.confetto}
              style={{
                left: `${c.left}%`,
                background: c.color,
                width: c.size,
                height: c.size,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
      </div>

      {!hasDate ? (
        /* No birthday set */
        <div className={styles.noDate}>
          <span className={styles.noDateEmoji}>📅</span>
          <h2 className={styles.noDateTitle}>Date de naissance inconnue</h2>
          <p className={styles.noDateText}>
            Renseigne la date de naissance de {profil.nom} dans son profil pour voir le compte à rebours.
          </p>
          <button className={styles.noDateBtn} onClick={() => navigate('/profil')}>
            Aller au profil
          </button>
        </div>
      ) : isToday ? (
        /* Birthday today! */
        <>
          <div className={styles.heroSection}>
            <div className={styles.avatarRing}>
              <img src={avatarSrc} alt={profil.nom} className={styles.avatar} />
            </div>
            <h1 className={styles.birthdayTitle}>Joyeux anniversaire</h1>
            <h2 className={styles.birthdayName}>{profil.nom} ! 🎂</h2>
            <p className={styles.birthdayAge}>
              {age} an{age > 1 ? 's' : ''} aujourd'hui
            </p>
          </div>

          <div className={styles.card}>
            <span className={styles.cardEmoji}>🎉</span>
            <div>
              <p className={styles.cardTitle}>C'est le grand jour !</p>
              <p className={styles.cardText}>
                {profil.nom} fête ses {age} an{age > 1 ? 's' : ''} aujourd'hui.
                En années humaines, ça correspond à environ <strong>{humanAge} ans</strong>.
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <span className={styles.cardEmoji}>🐰</span>
            <div>
              <p className={styles.cardTitle}>Né(e) le</p>
              <p className={styles.cardText}>{formatDateFr(profil.dateNaissance)}</p>
            </div>
          </div>

          <div className={styles.ideesCard}>
            <p className={styles.ideesTitle}>🎁 Idées cadeau</p>
            <ul className={styles.ideesList}>
              <li>Un bouquet de foin parfumé aux fleurs</li>
              <li>Des légumes frais du marché</li>
              <li>Un nouveau jouet à ronger</li>
              <li>Une friandise naturelle (petite quantité !)</li>
            </ul>
          </div>
        </>
      ) : (
        /* Countdown */
        <>
          <div className={styles.heroSection}>
            <div className={styles.avatarWrap}>
              <img src={avatarSrc} alt={profil.nom} className={styles.avatar} />
            </div>
            <h1 className={styles.countdownTitle}>Prochain anniversaire</h1>
            <p className={styles.countdownName}>de {profil.nom}</p>
          </div>

          {/* Countdown card */}
          <div className={styles.countdownCard}>
            <div className={styles.daysNumber}>{days}</div>
            <div className={styles.daysLabel}>jour{days > 1 ? 's' : ''}</div>
            <div className={styles.daysDate}>Le {nextDate}</div>
          </div>

          {/* Info cards */}
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <span className={styles.infoEmoji}>🎂</span>
              <span className={styles.infoValue}>{age} an{age !== 1 ? 's' : ''}</span>
              <span className={styles.infoLabel}>Âge actuel</span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoEmoji}>🎂</span>
              <span className={styles.infoValue}>{age + 1} an{age + 1 !== 1 ? 's' : ''}</span>
              <span className={styles.infoLabel}>Prochain anniversaire</span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoEmoji}>👤</span>
              <span className={styles.infoValue}>~{humanAge} ans</span>
              <span className={styles.infoLabel}>Équivalent humain</span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoEmoji}>📅</span>
              <span className={styles.infoValue}>{formatDateFr(profil.dateNaissance)}</span>
              <span className={styles.infoLabel}>Date de naissance</span>
            </div>
          </div>

          {/* Human age explanation */}
          <div className={styles.ageCard}>
            <p className={styles.ageCardTitle}>🐇 Comment calculer l'âge humain ?</p>
            <p className={styles.ageCardText}>
              La première année d'un lapin correspond à environ 14 années humaines.
              Chaque année suivante équivaut à 8 ans. Avec {age} an{age !== 1 ? 's' : ''},
              {profil.nom} a l'équivalent d'un humain de <strong>~{humanAge} ans</strong>.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

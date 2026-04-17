import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { VEGETAUX } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './InfluenceusePage.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

function todayStr() { return new Date().toISOString().slice(0, 10) }

interface Post {
  caption: string
  hashtags: string[]
  likes: number
  comments: { user: string; text: string }[]
  filter: string
  mood: string
}

const FILTERS = ['Lumière naturelle ✨', 'Golden hour 🌅', 'Noir & blanc 🖤', 'Rose pastel 🌸', 'Vintage 🎞️']
const MOODS = ['Pensif·ve', 'Sérieux·se', 'Mystérieux·se', 'Distant·e', 'Imposant·e']

function buildPost(nom: string): Post {
  const today = todayStr()
  const h = new Date().getHours()
  const weekDay = new Date().getDay()
  const seed = new Date().getDate() + new Date().getMonth() * 30

  let topVeg = ''
  let todayCount = 0
  try {
    const raw = localStorage.getItem(`chipie_journal_${getActiveProfileId()}`)
    const entries: { date: string; vegetalId: string }[] = raw ? JSON.parse(raw) : []
    const todayEntries = entries.filter(e => e.date === today)
    todayCount = todayEntries.length
    const counts: Record<string, number> = {}
    todayEntries.forEach(e => { counts[e.vegetalId] = (counts[e.vegetalId] || 0) + 1 })
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    topVeg = topId ? (VEGETAUX.find(v => v.id === topId)?.nom ?? '') : ''
  } catch { /* ignore */ }

  let foinBas = false
  try {
    const raw = localStorage.getItem(`chipie-foin-${getActiveProfileId()}`)
    if (raw) {
      const achats: { kg: number }[] = JSON.parse(raw)
      foinBas = achats.reduce((s, a) => s + a.kg * 1000, 0) < 600
    }
  } catch { /* ignore */ }

  const captions: string[] = []

  if (h < 9) {
    captions.push(
      `Morning vibes ☀️ Levée avant tout le monde comme d'habitude. Mon humain dort encore. Je gère.`,
      `Up since 5am checking my territory 🗺️ The grind never stops when you're this iconic.`,
    )
  } else if (h >= 14 && h <= 16) {
    captions.push(
      `Siesta era activated 💤 Self-care is not optional, c'est un mode de vie.`,
      `Afternoon recharge. Mon agenda est chargé mais je priorise le repos. Luxe absolu.`,
    )
  } else if (h >= 20) {
    captions.push(
      `Evening reset 🌙 Couvre-feu décrété dans l'appartement. Mes règles.`,
      `Night mode. Je surveille. Je juge. Je disparais dans l'ombre. Goodnight.`,
    )
  }

  if (topVeg) {
    captions.push(
      `Today's fuel : ${topVeg} 🌿 Choisir ses aliments avec intention, c'est mon mantra.`,
      `${topVeg} szn 🍃 Parce que mon corps mérite ce qu'il y a de meilleur. No compromise.`,
    )
  } else {
    captions.push(
      `Clean eating era 🌱 Je ne mange que local, frais, et préparé avec amour. Par mon humain. Évidemment.`,
      `Alimentation intuitive 🥗 Mon instinct ne se trompe jamais.`,
    )
  }

  if (foinBas) {
    captions.push(`Foin crisis 🌾 Mon équipe gère. Mais lentement. Trop lentement. Un update suivra.`)
  }

  const weeklyInspo = [
    `Rappel : vous n'avez pas besoin de l'approbation des autres. Sauf la mienne.`,
    `Ce que les gens pensent de toi ne te définit pas. Ce que je pense de toi, si.`,
    `Période de transformation. Les anciens me reconnaissent à peine. C'est voulu.`,
    `Reminder : votre espace mérite autant d'attention que moi. Ce qui fait beaucoup.`,
    `New week new me. Même pelage, nouvelle énergie.`,
    `Le silence est mon arme principale. Parmi d'autres.`,
    `Je ne suis pas distante. Je suis sélective. Nuance.`,
  ]
  captions.push(weeklyInspo[weekDay % weeklyInspo.length])

  const caption = captions[seed % captions.length]

  const allTags = [
    `#lapin${nom.toLowerCase()}`, `#bunnylife`, `#lapininfluenceur`, `#${nom.toLowerCase()}official`,
    `#cottagecore`, `#petlife`, `#bunstagram`, `#lapinmignon`, `#fourrure`,
    `#selfcare`, `#minimaliste`, `#lifestyle`, `#authentique`, `#lapinluxe`,
    `#foin`, `#vegetal`, `#greenliving`, `#snacktime`,
  ]
  const tagSeed = (seed + h) % 5
  const hashtags = [...allTags.slice(0, 4), ...allTags.slice(4 + tagSeed, 8 + tagSeed)]

  const allComments = [
    { user: 'maman_lapin_officiel', text: '😭 Trop mignonne tu me tues' },
    { user: 'vegetaux_addict', text: 'Le ${topVeg || "foin"} c\'est vrai que c\'est 👌' },
    { user: 'bunnylifestyle_fr', text: 'Collab quand ?? 🐇✨' },
    { user: 'flora.bunny', text: 'Cette présence à l\'écran... inégalable' },
    { user: 'lapinpassion', text: 'J\'attends le merch 👀' },
    { user: 'petit_pelage', text: 'Les vibes de cette photo omg' },
    { user: 'carotteparty', text: 'Icône totale' },
    { user: 'bunny_mama_37', text: 'Mon lapin la suit et s\'inspire d\'elle' },
    { user: 'herbe_frais', text: 'La lumière sur sa fourrure... maîtrise absolue' },
    { user: 'lapinsation', text: '🙏 une queen' },
  ]

  const comments = allComments.slice(seed % 4, (seed % 4) + 4).map(c => ({
    ...c,
    text: c.text.replace('${topVeg || "foin"}', topVeg || 'foin'),
  }))

  const baseLikes = 1247 + seed * 37 + todayCount * 12
  const likes = baseLikes + Math.floor(h * 3.7)
  const filter = FILTERS[seed % FILTERS.length]
  const mood = MOODS[h % MOODS.length]

  return { caption, hashtags, likes, comments, filter, mood }
}

export default function InfluenceusePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  const post = useMemo(() => buildPost(profil.nom), [profil.nom])
  const avatarSrc = profil.avatar ? assetUrl(profil.avatar) : DEFAULT_AVATAR

  const displayLikes = liked ? post.likes + 1 : post.likes

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
        <span className={styles.headerEmoji}>📸</span>
        <div>
          <h1 className={styles.title}>Chipie influenceuse</h1>
          <p className={styles.subtitle}>{profil.nom} sur les réseaux</p>
        </div>
      </div>

      {/* Fake Instagram post */}
      <div className={styles.insta}>
        {/* Post header */}
        <div className={styles.postHeader}>
          <div className={styles.storyRing}>
            <img src={avatarSrc} alt={profil.nom} className={styles.postAvatar} />
          </div>
          <div className={styles.postMeta}>
            <p className={styles.postUsername}>{profil.nom.toLowerCase().replace(/ /g, '_')}.official</p>
            <p className={styles.postLocation}>📍 Son territoire</p>
          </div>
          <div className={styles.postMore}>•••</div>
        </div>

        {/* Image area */}
        <div className={styles.imageArea}>
          <img src={avatarSrc} alt={profil.nom} className={styles.postImage} />
          <div className={styles.filterLabel}>{post.filter}</div>
          <div className={styles.moodLabel}>{post.mood}</div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <div className={styles.leftActions}>
            <button
              className={`${styles.actionBtn} ${liked ? styles.liked : ''}`}
              onClick={() => setLiked(l => !l)}
            >
              {liked ? '❤️' : '🤍'}
            </button>
            <button className={styles.actionBtn}>💬</button>
            <button className={styles.actionBtn}>✈️</button>
          </div>
          <button
            className={`${styles.actionBtn} ${saved ? styles.saved : ''}`}
            onClick={() => setSaved(s => !s)}
          >
            {saved ? '🔖' : '🏷️'}
          </button>
        </div>

        {/* Likes */}
        <p className={styles.likes}>
          <strong>{displayLikes.toLocaleString('fr-FR')} J'aime</strong>
        </p>

        {/* Caption */}
        <div className={styles.caption}>
          <span className={styles.captionUser}>{profil.nom.toLowerCase().replace(/ /g, '_')}.official</span>{' '}
          <span className={styles.captionText}>{post.caption}</span>
        </div>

        {/* Hashtags */}
        <p className={styles.hashtags}>{post.hashtags.join(' ')}</p>

        {/* Comments */}
        <div className={styles.comments}>
          {post.comments.map((c, i) => (
            <div key={i} className={styles.comment}>
              <span className={styles.commentUser}>{c.user}</span>{' '}
              <span className={styles.commentText}>{c.text}</span>
            </div>
          ))}
        </div>

        {/* Time */}
        <p className={styles.postTime}>IL Y A 2 HEURES</p>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{(displayLikes / 1000).toFixed(1)}k</span>
          <span className={styles.statLabel}>Likes</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{(displayLikes * 0.043).toFixed(1)}k</span>
          <span className={styles.statLabel}>Followers</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{(post.likes * 0.0031 * 100).toFixed(1)}%</span>
          <span className={styles.statLabel}>Engagement</span>
        </div>
      </div>
    </div>
  )
}

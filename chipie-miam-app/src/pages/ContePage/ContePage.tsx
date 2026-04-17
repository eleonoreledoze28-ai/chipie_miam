import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { VEGETAUX } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './ContePage.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

function getWeekNumber(): number {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7)
}

function getCurrentSeason(): string {
  const m = new Date().getMonth()
  if (m >= 2 && m <= 4) return 'printemps'
  if (m >= 5 && m <= 7) return 'été'
  if (m >= 8 && m <= 10) return 'automne'
  return 'hiver'
}

function getPast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().slice(0, 10)
  })
}

function getWeekLabel(): string {
  const d = new Date()
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay() + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (x: Date) => x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return `${fmt(start)} – ${fmt(end)}`
}

const SEASON_SETTING: Record<string, string> = {
  printemps: 'les premières fleurs de printemps éclosaient dans le jardin',
  été:       'le soleil de l\'été inondait la pièce de lumière dorée',
  automne:   'les feuilles orangées tourbillonnaient derrière la fenêtre',
  hiver:     'le froid de l\'hiver dessinait des cristaux sur la vitre',
}

interface StoryData {
  nom: string
  race: string
  topVegetals: string[]
  totalEntries: number
  season: string
  weekNum: number
  foinBas: boolean
  daysWithEntries: number
}

function generateStory(d: StoryData): { title: string; paragraphs: string[] } {
  const setting = SEASON_SETTING[d.season] ?? 'la lumière du jour entrait doucement'
  const raceDesc = d.race ? `lapin ${d.race}` : 'lapin'
  const vA = d.topVegetals[0] ?? 'pissenlit'
  const vB = d.topVegetals[1] ?? 'persil'
  const vC = d.topVegetals[2] ?? 'roquette'

  const templates = [
    {
      title: `${d.nom} et la grande exploration`,
      paragraphs: [
        `Il était une fois ${d.nom}, un(e) courageux/courageuse ${raceDesc} qui vécut une semaine absolument extraordinaire — pendant que ${setting}.`,
        `Tout commença un matin ordinaire. ${d.nom} se réveilla, les narines frémissantes, et sentit quelque chose d'inhabituel dans l'air. ${d.totalEntries > 0 ? `Cette semaine, pas moins de ${d.totalEntries} portions de végétaux avaient été préparées avec amour.` : `Cette semaine fut plus calme que d'habitude côté assiette.`} Parmi tous ces trésors verts, le ${vA} restait le favori absolu — impossible de résister à ses effluves irrésistibles.`,
        `${d.daysWithEntries >= 5 ? `Chaque jour, fidèle au poste, ${d.nom} attendait son repas avec une impatience à peine contenue. Les jours se succédaient, rythmés par le craquement du foin et le bruissement des feuilles fraîches.` : `Certains jours, ${d.nom} attendit son repas en thumptant doucement sur le sol — une façon subtile de rappeler qu'on n'oublie pas si facilement un lapin affamé.`}`,
        `${d.foinBas ? `Un soir, l'impensable arriva : le foin venait à manquer ! ${d.nom} tourna en rond, perplexe, le museau levé vers l'horizon comme un explorateur face au désert. La situation fut vite résolue, mais le traumatisme, lui, resta.` : `Le foin était en abondance, et ${d.nom} s'en donna à cœur joie, construisant même un petit nid douillet dans un coin reculé de son territoire.`}`,
        `La semaine se termina sur une note de sérénité absolue. ${d.nom} s'étira longuement, exécuta un binky majestueux qui aurait mérité d'être filmé, puis s'installa pour une longue sieste bien méritée. La vie était belle. La vie était verte. Fin.`,
      ],
    },
    {
      title: `Les aventures culinaires de ${d.nom}`,
      paragraphs: [
        `Dans une maison paisible où ${setting}, vivait ${d.nom}, un(e) ${raceDesc} dont la passion pour la gastronomie n'avait d'égale que son élégance naturelle.`,
        `Cette semaine fut une semaine de grande cuisine. ${d.totalEntries > 5 ? `Avec ${d.totalEntries} portions engloutie avec délice,` : `Avec quelques portions savourées lentement,`} ${d.nom} confirma son statut de fin gourmet. Le ${vA} trônait en tête de ses préférences, suivi de près par ${d.topVegetals.length > 1 ? `le ${vB}` : 'ses autres favoris'} et ${d.topVegetals.length > 2 ? `l'incontournable ${vC}` : 'quelques surprises du marché'}.`,
        `Mais ${d.nom} n'était pas qu'un simple mangeur. C'était un critique gastronomique. Chaque légume était d'abord reniflé, puis tourné sous toutes ses faces, avant d'être grignoté avec une délicatesse qui aurait fait rougir les plus grands chefs. La roquette un poil trop amère ? Laissée de côté avec un air de profonde déception.`,
        `La semaine se clôtura dans une douce torpeur digestive. ${d.nom} s'allongea sur le côté — position dite du "lapin heureux" — et rêva probablement de prairies infinies couvertes de pissenlits en fleurs. La vie était belle. La vie était verte.`,
      ],
    },
    {
      title: `Le mystère de ${d.nom}`,
      paragraphs: [
        `Ce fut une semaine étrange. Pendant que ${setting}, des événements inexplicables se produisirent dans la vie de ${d.nom}, ${raceDesc} aux yeux pétillants et à l'alibi toujours parfait.`,
        `Tout commença par une disparition. Un morceau de ${vA}, posé là innocemment, disparut en moins de trente secondes. Les enquêteurs eurent beau chercher : aucune trace. Seul(e) ${d.nom}, l'air parfaitement innocent, semblait ne rien savoir.`,
        `${d.totalEntries > 0 ? `Au fil des ${d.totalEntries} repas de la semaine, d'autres mystères s'accumulèrent.` : `Les jours passèrent, chargés de mystère.`} Qui avait mâchouillé le coin du tapis ? Qui avait déplacé la gamelle de trois centimètres vers la droite ? Le coupable ne fut jamais officiellement identifié. Bien que tous les soupçons convergent vers un(e) certain(e) ${d.nom}.`,
        `La semaine s'acheva comme elle avait commencé : dans le mystère. ${d.nom} fixait le mur depuis une demi-heure. Que voyait-il/elle ? Un insecte invisible ? Une fissure dans le continuum espace-temps ? Personne ne le sait. Et c'est peut-être mieux ainsi.`,
      ],
    },
    {
      title: `${d.nom}, philosophe du dimanche`,
      paragraphs: [
        `Pendant que ${setting}, ${d.nom}, ${raceDesc} d'une sagesse rare, traversa une semaine de grande réflexion intérieure.`,
        `Lundi, assis(e) devant sa gamelle de ${vA} fraîchement servi, ${d.nom} prit le temps de contempler l'existence. Qu'est-ce que la vie, sinon une succession de repas et de siestes entrecoupés de binkies spontanés ? La philosophie du lapin tient en une phrase : profite du présent, et méfie-toi du vétérinaire.`,
        `Mercredi apporta une révélation. ${d.nom} réalisa que le meilleur endroit pour réfléchir était sous la table basse. Là, à l'abri des regards, loin du tumulte du monde (et de l'aspirateur), les grandes questions trouvaient enfin leur réponse. Pourquoi thumpter ? Pour que l'on sache que tu existes. Pourquoi brouter du foin ? Parce que c'est la base de tout.`,
        `Le dimanche, ${d.nom} prit une grande décision : continuer d'être exactement comme il/elle est. Car dans un monde compliqué, être un lapin heureux est déjà une forme de résistance. Binky. Sieste. Recommencer.`,
      ],
    },
    {
      title: `${d.nom} championne de la semaine`,
      paragraphs: [
        `Les annales du championnat hebdomadaire des lapins retinrent la semaine où ${d.nom}, ${raceDesc} hors du commun, accomplit des exploits légendaires — tout cela pendant que ${setting}.`,
        `Épreuve n°1 : la dégustation express. ${d.totalEntries > 3 ? `Avec ${d.totalEntries} portions consommées avec une précision chirurgicale, dont le fameux ${vA} dévoré en moins de deux minutes,` : `Avec une technique de grignotage affinée au fil des ans,`} ${d.nom} remporta la médaille d'or de la rapidité gustative.`,
        `Épreuve n°2 : la sieste olympique. Commencée en milieu d'après-midi et conduite avec une rigueur absolue. Les juges (les moutons du rembourrage du canapé) notèrent une technique impeccable : oreilles repliées, yeux mi-clos, respiration profonde. Note : 9,8/10.`,
        `Épreuve n°3 : le regard de reproche. ${d.nom} maîtrise à la perfection l'art de fixer son propriétaire avec une expression qui dit clairement "tu es en retard de 4 minutes". Cette discipline, peu connue du grand public, est pourtant l'une des plus exigeantes. Médaille d'or, catégorie senior.`,
      ],
    },
    {
      title: `Les rêves de ${d.nom}`,
      paragraphs: [
        `On dit que les lapins rêvent. Et si c'était vrai, cette semaine, pendant que ${setting}, les rêves de ${d.nom} auraient été absolument épiques.`,
        `La nuit du lundi, ${d.nom} rêva d'une prairie infinie couverte de ${vA} à perte de vue. Pas besoin de gamelle, pas besoin d'horaire. Un horizon vert, une brise douce, et la liberté absolue. Dans ce rêve, ${d.nom} courait à 70 km/h et personne ne l'attrapait jamais.`,
        `La nuit du jeudi apporta un rêve plus étrange : ${d.nom} était critique gastronomique dans un restaurant cinq étoiles pour lapins. Le menu du soir : ${[vA, vB, vC].join(', ')}. Le chef ? Un pissenlit géant en toque blanche. La note dans le carnet imaginaire : "Parfait, mais manquait un peu de foin."`,
        `Le matin du dimanche, ${d.nom} se réveilla, s'étira, fit un binky pour rien, et reprit sa vie normale. Les rêves s'évaporèrent. Mais quelque chose, dans la façon dont il/elle regarda sa gamelle ce matin-là, laissait entendre qu'il/elle savait encore des choses que nous ne saurons jamais.`,
      ],
    },
  ]

  return templates[d.weekNum % templates.length]
}

// ── Canvas export ─────────────────────────────────────────────────────────────
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineH
    } else { line = test }
  }
  ctx.fillText(line, x, y)
  return y + lineH
}

function drawStory(canvas: HTMLCanvasElement, story: { title: string; paragraphs: string[] }, _nom: string, avatarImg: HTMLImageElement | null) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = 800
  canvas.width = W
  // Estimate height
  canvas.height = 1200
  const grad = ctx.createLinearGradient(0, 0, W, canvas.height)
  grad.addColorStop(0, '#fff9f0')
  grad.addColorStop(1, '#ffecd2')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, canvas.height)

  // Header
  if (avatarImg) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(60, 60, 40, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatarImg, 20, 20, 80, 80)
    ctx.restore()
  }
  ctx.fillStyle = '#ff6b35'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('📖 Le conte de la semaine', avatarImg ? 115 : 30, 45)
  ctx.fillStyle = '#333'
  ctx.font = 'bold 22px sans-serif'
  ctx.fillText(story.title, avatarImg ? 115 : 30, 72)

  // Paragraphs
  ctx.fillStyle = '#444'
  ctx.font = '16px sans-serif'
  ctx.textAlign = 'left'
  let y = 130
  for (const para of story.paragraphs) {
    y = wrapText(ctx, para, 30, y, W - 60, 24)
    y += 14
  }

  // Trim canvas
  canvas.height = y + 30
  // Redraw background after resize
  const g2 = ctx.createLinearGradient(0, 0, W, canvas.height)
  g2.addColorStop(0, '#fff9f0')
  g2.addColorStop(1, '#ffecd2')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, W, canvas.height)

  if (avatarImg) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(60, 60, 40, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatarImg, 20, 20, 80, 80)
    ctx.restore()
  }
  ctx.fillStyle = '#ff6b35'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('📖 Le conte de la semaine', avatarImg ? 115 : 30, 45)
  ctx.fillStyle = '#333'
  ctx.font = 'bold 22px sans-serif'
  ctx.fillText(story.title, avatarImg ? 115 : 30, 72)
  ctx.fillStyle = '#444'
  ctx.font = '16px sans-serif'
  y = 130
  for (const para of story.paragraphs) {
    y = wrapText(ctx, para, 30, y, W - 60, 24)
    y += 14
  }
  ctx.fillStyle = '#ff6b35'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('💛 Chipie Miam', W / 2, canvas.height - 12)
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ContePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const story = useMemo(() => {
    const days = getPast7Days()
    let entries: { date: string; vegetalId: string }[] = []
    try {
      const raw = localStorage.getItem(`chipie_journal_${getActiveProfileId()}`)
      if (raw) entries = JSON.parse(raw)
    } catch { /* ignore */ }

    const weekEntries = entries.filter(e => days.includes(e.date))
    const daysWithEntries = new Set(weekEntries.map(e => e.date)).size

    const counts: Record<string, number> = {}
    weekEntries.forEach(e => { counts[e.vegetalId] = (counts[e.vegetalId] || 0) + 1 })
    const topIds = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0])
    const topVegetals = topIds.map(id => VEGETAUX.find(v => v.id === id)?.nom ?? id)

    let foinBas = false
    try {
      const raw = localStorage.getItem(`chipie-foin-${getActiveProfileId()}`)
      if (raw) {
        const achats: { kg: number }[] = JSON.parse(raw)
        foinBas = achats.reduce((s, a) => s + a.kg * 1000, 0) < 500
      }
    } catch { /* ignore */ }

    return generateStory({
      nom: profil.nom,
      race: profil.race,
      topVegetals,
      totalEntries: weekEntries.length,
      season: getCurrentSeason(),
      weekNum: getWeekNumber(),
      foinBas,
      daysWithEntries,
    })
  }, [profil.nom, profil.race])

  const weekLabel = useMemo(getWeekLabel, [])
  const avatarSrc = profil.avatar ? assetUrl(profil.avatar) : DEFAULT_AVATAR

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => {
      drawStory(canvas, story, profil.nom, img)
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `conte-${profil.nom.toLowerCase()}-semaine-${getWeekNumber()}.png`
      a.click()
    }
    img.onerror = () => {
      drawStory(canvas, story, profil.nom, null)
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `conte-${profil.nom.toLowerCase()}-semaine-${getWeekNumber()}.png`
      a.click()
    }
    img.src = avatarSrc
  }

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
        <span className={styles.headerEmoji}>📖</span>
        <div>
          <h1 className={styles.title}>Le conte de la semaine</h1>
          <p className={styles.subtitle}>{weekLabel}</p>
        </div>
      </div>

      {/* Story card */}
      <div className={styles.storyCard}>
        <div className={styles.storyTop}>
          <img src={avatarSrc} alt={profil.nom} className={styles.avatar} />
          <div>
            <p className={styles.storyLabel}>📖 Histoire de la semaine</p>
            <h2 className={styles.storyTitle}>{story.title}</h2>
          </div>
        </div>

        <div className={styles.storyBody}>
          {story.paragraphs.map((para, i) => (
            <p key={i} className={styles.para}>{para}</p>
          ))}
        </div>

        <p className={styles.storyFooter}>✨ Généré automatiquement d'après ta semaine avec {profil.nom}</p>
      </div>

      <button className={styles.downloadBtn} onClick={handleDownload}>
        ⬇️ Télécharger l'image
      </button>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

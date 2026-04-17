import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { VEGETAUX } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './LettreChipiePage.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

function getWeekNumber(): number {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7)
}

function getPast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10)
  })
}

function dateLettre(): string {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

interface LetterData {
  nom: string
  topVeg: string
  totalEntries: number
  daysWithEntries: number
  foinBas: boolean
  weekNum: number
}

function generateLetter(d: LetterData): { salutation: string; corps: string[]; signature: string; ps: string } {
  const personalities = [
    // 0: Formelle & aristocratique
    {
      salutation: `Chère Humaine,`,
      corps: [
        `Je me permets de vous adresser cette missive afin de vous faire part de mes impressions sur la semaine écoulée. Il convient de noter que votre présence a été, dans l'ensemble, satisfaisante — ce qui, dans ma langue, constitue un compliment de premier ordre.`,
        d.totalEntries > 0
          ? `Les ${d.totalEntries} portions de végétaux servies cette semaine ont été examinées avec la rigueur qui s'impose. ${d.topVeg ? `Le ${d.topVeg} mérite une mention spéciale — il était d'une fraîcheur admirable.` : `La qualité était variable, mais acceptable.'`}`
          : `Force m'est de constater qu'aucune portion n'a été enregistrée cette semaine. Je ne dis rien. Je note, c'est tout.`,
        d.foinBas ? `Je vous informe également que le stock de foin approche d'un niveau préoccupant. J'espère que cela retiendra votre attention dans les meilleurs délais.` : `Le foin était abondant. Vous avez bien géré ce point. Je le reconnais volontiers.`,
        `Dans l'attente de vous voir déposer ma prochaine ration avec la ponctualité qui vous caractérise (parfois),`,
      ],
      signature: `Votre très distinguée lapine,\n${d.nom}`,
      ps: `P.S. Le pissenlit de mardi était exceptionnel. Ne changez rien à votre fournisseur.`,
    },
    // 1: Passif-agressive
    {
      salutation: `Salut toi,`,
      corps: [
        `Tu te demandes peut-être si tu m'as oublié(e) cette semaine. Non, je ne garde pas de rancune. Enfin si, un peu. Mais passons.`,
        d.totalEntries > 0
          ? `${d.totalEntries} portions, c'est bien. ${d.totalEntries < 5 ? `Ce n'est pas non plus ce qu'on appelle "gâter son lapin", mais c'est un effort.` : `J'apprécie. Ne t'emballe pas, mais j'apprécie.`} ${d.topVeg ? `Le ${d.topVeg} était correct. Juste correct.` : ''}`
          : `Cette semaine, la gamelle a parfois semblé singulièrement vide. Je ne dis pas ça pour te culpabiliser. Je le pense juste très fort.`,
        d.foinBas ? `Aussi : le foin. Je n'insiste pas. Je mentionne juste. Pour la troisième fois cette semaine, mais qui compte ?` : `Le foin était là. Merci. Tu as eu le minimum syndical.`,
        `Bref, je suis là. Comme toujours. Tu peux me remercier à tout moment.`,
      ],
      signature: `Avec autant d'amour que tu le mérites (ce soir : 73%),\n${d.nom} 🐇`,
      ps: `P.S. J'ai mâché un coin du tapis. C'était thérapeutique.`,
    },
    // 2: Dramatique & lyrique
    {
      salutation: `Ô chère humaine de mon cœur,`,
      corps: [
        `Il faut que tu saches. Cette semaine a été un voyage émotionnel d'une intensité rare. Des hauts, des bas, et plusieurs binkies incontrôlés dont je ne m'explique pas encore l'origine.`,
        d.totalEntries > 0
          ? `${d.topVeg ? `Le ${d.topVeg} — je ne peux pas en parler sans frissonner. C'était une révélation. Une expérience sensorielle totale.` : `Les légumes de la semaine ont suscité en moi des émotions que les mots peinent à saisir.`}`
          : `La semaine fut maigre en légumes. J'ai médité. Beaucoup. Sur le sens de la faim.`,
        `${d.daysWithEntries >= 5 ? `Cinq jours de présence, de soin, d'attention. Je t'en suis reconnaissante du fond de mon âme lapine.` : `Les jours sans repas enregistrés furent des jours de contemplation solitaire. Je survécus.`}`,
        `La vie est belle. La vie est verte. Tu en fais partie.`,
      ],
      signature: `Pour toujours et au-delà du foin,\n${d.nom} ✨`,
      ps: `P.S. J'ai fait un rêve où je courais dans un champ infini de pissenlits. Tu n'étais pas là. C'était quand même bien.`,
    },
    // 3: Ado / cool
    {
      salutation: `Yo,`,
      corps: [
        `Bref, cette semaine. T'as assuré par moments, moins par d'autres. C'est la vie.`,
        d.totalEntries > 0
          ? `${d.totalEntries} repas, c'est relou à compter mais ça va. ${d.topVeg ? `Le ${d.topVeg} : validé. Je mets ça dans ma liste des trucs qui déchirent.` : `Les légumes en général : okayyyy.`}`
          : `Les repas étaient genre… absents ? Check tes notifs stp.`,
        d.foinBas ? `Aussi le foin : urgence. Genre vraiment. J'suis sérieuse.` : `Le foin : nickel. Respect.`,
        `Ouais. T'es pas trop mal comme humain(e). Ne change pas trop.`,
      ],
      signature: `Tchuss,\n${d.nom} (la meilleure)`,
      ps: `P.S. J'ai décidé que le mardi serait mon jour de méditation. Arrête d'aspirer ce jour-là.`,
    },
    // 4: Philosophe zen
    {
      salutation: `Chère compagne de vie,`,
      corps: [
        `Les jours passent comme des feuilles sur l'eau. Cette semaine fut ce qu'elle fut — ni plus, ni moins. J'ai observé, j'ai mangé, j'ai dormi. L'essentiel.`,
        d.totalEntries > 0
          ? `${d.topVeg ? `Le ${d.topVeg} m'a rappelé que la nature offre des trésors quand on sait les recevoir.` : `Chaque légume portait en lui une leçon secrète que j'ai su accueillir en silence.`}`
          : `Cette semaine sans repas enregistrés fut une invitation à contempler le vide. J'en ressors apaisée et légèrement affamée.`,
        `Le foin est la base de toute sérénité. ${d.foinBas ? `Il manque. Cela perturbe mon équilibre intérieur.` : `Il était là. Mon équilibre était intact.`}`,
        `Je n'ai besoin de rien d'autre que du foin, de l'eau, et de ta présence silencieuse. Enfin, et du pissenlit. Surtout le pissenlit.`,
      ],
      signature: `Dans la paix et la satiété,\n${d.nom} 🌿`,
      ps: `P.S. J'ai regardé le mur pendant 20 minutes ce matin. Je ne peux pas encore en parler.`,
    },
  ]

  return personalities[d.weekNum % personalities.length]
}

export default function LettreChipiePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const avatarSrc = profil.avatar ? assetUrl(profil.avatar) : DEFAULT_AVATAR

  const letter = useMemo(() => {
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
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topVeg = topId ? (VEGETAUX.find(v => v.id === topId)?.nom ?? '') : ''
    let foinBas = false
    try {
      const raw = localStorage.getItem(`chipie-foin-${getActiveProfileId()}`)
      if (raw) {
        const achats: { kg: number }[] = JSON.parse(raw)
        foinBas = achats.reduce((s, a) => s + a.kg * 1000, 0) < 500
      }
    } catch { /* ignore */ }

    return generateLetter({
      nom: profil.nom,
      topVeg,
      totalEntries: weekEntries.length,
      daysWithEntries,
      foinBas,
      weekNum: getWeekNumber(),
    })
  }, [profil.nom])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return
    const safeCtx = ctx
    const safeCanvas = canvas
    const W = 800, pad = 40
    canvas.width = W
    canvas.height = 900

    ctx.fillStyle = '#fdf6e3'
    ctx.fillRect(0, 0, W, canvas.height)

    // Border
    ctx.strokeStyle = '#d4a855'
    ctx.lineWidth = 3
    ctx.strokeRect(16, 16, W - 32, canvas.height - 32)

    // Avatar
    const img = new Image()
    img.onload = () => {
      ctx.save()
      ctx.beginPath()
      ctx.arc(60, 60, 35, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, 25, 25, 70, 70)
      ctx.restore()
      drawText()
    }
    img.onerror = drawText
    img.src = avatarSrc

    let drawn = false
    function drawText() {
      safeCtx.fillStyle = '#7c5c2e'
      safeCtx.font = 'italic 13px Georgia, serif'
      safeCtx.textAlign = 'right'
      safeCtx.fillText(dateLettre(), W - pad, 50)

      safeCtx.textAlign = 'left'
      safeCtx.font = 'bold 16px Georgia, serif'
      safeCtx.fillStyle = '#3d2a1e'
      safeCtx.fillText(letter.salutation, pad, 100)

      safeCtx.font = '15px Georgia, serif'
      safeCtx.fillStyle = '#3d2a1e'
      let y = 135
      for (const para of letter.corps) {
        const words = para.split(' ')
        let line = ''
        for (const word of words) {
          const test = line ? `${line} ${word}` : word
          if (safeCtx.measureText(test).width > W - pad * 2 && line) {
            safeCtx.fillText(line, pad, y); line = word; y += 22
          } else line = test
        }
        safeCtx.fillText(line, pad, y); y += 34
      }

      safeCtx.font = 'italic 15px Georgia, serif'
      safeCtx.fillStyle = '#7c5c2e'
      const sigLines = letter.signature.split('\n')
      for (const sl of sigLines) { safeCtx.fillText(sl, pad, y); y += 22 }
      y += 10
      safeCtx.font = '13px Georgia, serif'
      safeCtx.fillStyle = '#9a7a4e'
      safeCtx.fillText(letter.ps, pad, y)

      if (!drawn) {
        drawn = true
        safeCanvas.height = y + 50
        const bg = safeCtx.createLinearGradient(0, 0, 0, safeCanvas.height)
        bg.addColorStop(0, '#fdf6e3')
        bg.addColorStop(1, '#faf0d0')
        safeCtx.fillStyle = bg
        safeCtx.fillRect(0, 0, W, safeCanvas.height)
        safeCtx.strokeStyle = '#d4a855'; safeCtx.lineWidth = 3
        safeCtx.strokeRect(16, 16, W - 32, safeCanvas.height - 32)
        drawText()
      } else {
        const url = safeCanvas.toDataURL('image/png')
        const a = document.createElement('a')
        a.href = url
        a.download = `lettre-${profil.nom.toLowerCase()}.png`
        a.click()
      }
    }
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
        <span className={styles.headerEmoji}>💌</span>
        <div>
          <h1 className={styles.title}>Chipie t'écrit</h1>
          <p className={styles.subtitle}>La lettre de la semaine</p>
        </div>
      </div>

      {/* Letter */}
      <div className={styles.letter}>
        <div className={styles.letterTop}>
          <img src={avatarSrc} alt={profil.nom} className={styles.avatar} />
          <div>
            <p className={styles.from}>De : {profil.nom} 🐇</p>
            <p className={styles.date}>{dateLettre()}</p>
          </div>
        </div>

        <p className={styles.salutation}>{letter.salutation}</p>

        {letter.corps.map((para, i) => (
          <p key={i} className={styles.para}>{para}</p>
        ))}

        <p className={styles.signature}>
          {letter.signature.split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </p>

        <p className={styles.ps}>{letter.ps}</p>
      </div>

      <button className={styles.downloadBtn} onClick={handleDownload}>
        ⬇️ Télécharger la lettre
      </button>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

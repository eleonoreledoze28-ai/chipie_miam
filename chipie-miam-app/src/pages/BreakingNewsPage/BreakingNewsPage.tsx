import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { VEGETAUX } from '../../data/vegetaux'
import styles from './BreakingNewsPage.module.css'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function timeStr() { return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
function dateStr() { return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) }

type Level = 'alerte' | 'urgent' | 'info' | 'bonne'

interface NewsItem {
  level: Level
  headline: string
  detail: string
}

function buildNews(nom: string, race: string): NewsItem[] {
  const items: NewsItem[] = []
  const today = todayStr()
  const h = new Date().getHours()

  // Journal check
  let todayCount = 0
  let topVeg = ''
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

  if (todayCount === 0 && h >= 10) {
    items.push({ level: 'alerte', headline: `${nom} EN GRÈVE DE LA FAIM`, detail: `Aucune portion enregistrée ce jour. La lapine refuse de commenter et fixe le vide depuis 14 minutes.` })
  } else if (todayCount >= 5) {
    items.push({ level: 'bonne', headline: `RECORD BATTU : ${todayCount} PORTIONS`, detail: `${nom} a atteint un niveau historique de satiété. Les experts parlent d'un "festin sans précédent".` })
  } else if (todayCount > 0) {
    items.push({ level: 'info', headline: `${topVeg ? topVeg.toUpperCase() : 'VÉGÉTAL'} AU MENU CE SOIR`, detail: `${nom} a reçu ses légumes. La situation est stable. Les marchés sont rassurés.` })
  }

  // Checklist check
  try {
    const raw = localStorage.getItem(`chipie-checklist-${today}`)
    const done: string[] = raw ? JSON.parse(raw) : []
    if (!done.includes('foin')) items.push({ level: 'urgent', headline: `FOIN NON RENOUVELÉ — CRISE IMMINENTE`, detail: `Nos reporters sur le terrain confirment : le foin n'a pas été changé. ${nom} a été aperçue en train de soupirer ostensiblement.` })
    if (!done.includes('eau')) items.push({ level: 'urgent', headline: `PÉNURIE D'EAU FRAÎCHE`, detail: `La gamelle d'eau présente des signes inquiétants. Une ONG internationale a été contactée. Réponse attendue d'ici 4 heures.` })
    if (done.length === 4) items.push({ level: 'bonne', headline: `CHECKLIST 100% — PROPRIÉTAIRE DU MOIS`, detail: `Dans un geste sans précédent, ${nom} a accordé un regard de 3 secondes à son propriétaire. Les analystes parlent d'une "normalisation des relations".` })
  } catch { /* ignore */ }

  // Foin check
  try {
    const raw = localStorage.getItem(`chipie-foin-${getActiveProfileId()}`)
    if (raw) {
      const achats: { kg: number }[] = JSON.parse(raw)
      const total = achats.reduce((s, a) => s + a.kg * 1000, 0)
      if (total < 200) items.push({ level: 'alerte', headline: `NIVEAU FOIN CRITIQUE — ÉTAT D'URGENCE`, detail: `Le stock de foin a atteint un niveau historiquement bas. Le gouvernement lapinesque envisage de décréter l'état d'urgence alimentaire.` })
      else if (total < 700) items.push({ level: 'urgent', headline: `ALERTE FOIN : MOINS DE 7 JOURS`, detail: `Les réserves stratégiques de foin approchent du seuil critique. Les marchés à terme du foin sont en ébullition.` })
    }
  } catch { /* ignore */ }

  // Time-based
  if (h < 8) items.push({ level: 'info', headline: `${nom} EN PLEINE MÉDITATION MATINALE`, detail: `Les équipes de Chipie News confirment que la lapine est debout et procède à l'inspection de son territoire. Tout se passe normalement.` })
  else if (h >= 14 && h <= 16) items.push({ level: 'info', headline: `SIESTE NATIONALE — NE PAS DÉRANGER`, detail: `${nom} a entamé sa sieste réglementaire de l'après-midi. Tout bruit sera signalé aux autorités compétentes.` })
  else if (h >= 21) items.push({ level: 'info', headline: `COUVRE-FEU DÉCRÉTÉ DANS L'APPARTEMENT`, detail: `${nom} a officiellement entamé sa routine nocturne. Les activités humaines doivent cesser avant 22h.` })

  // Race-based
  if (race) items.push({ level: 'info', headline: `RAPPORT ANNUEL DES ${race.toUpperCase()}S`, detail: `Selon une étude exclusive de Chipie News, les lapins ${race} sont classés "exceptionnellement mignons" pour la 3ème année consécutive.` })

  // Fillers
  const fillers: NewsItem[] = [
    { level: 'info', headline: `TAPIS : UN COIN MYSTÉRIEUSEMENT MÂCHOUILLÉ`, detail: `Les autorités enquêtent. ${nom} a nié tout en regardant ostensiblement ailleurs. L'affaire suit son cours.` },
    { level: 'info', headline: `GAMELLE DÉPLACÉE DE 3CM — L'ENQUÊTE CONTINUE`, detail: `Un incident inexpliqué a été signalé dans la zone de repas. Des témoins affirment avoir vu la suspecte s'éloigner tranquillement.` },
    { level: 'bonne', headline: `BINKY SPONTANÉ OBSERVÉ À ${timeStr()}`, detail: `${nom} a exécuté un binky d'une technicité remarquable. Les juges de la fédération internationale donnent 9,7/10.` },
    { level: 'info', headline: `LE MUR DE LA CUISINE FAIT L'OBJET D'UNE SURVEILLANCE INTENSE`, detail: `${nom} fixe le mur depuis 18 minutes. Nos experts sont incapables d'expliquer ce phénomène. Nous vous tiendrons informés.` },
    { level: 'urgent', headline: `ASPIRATEUR DÉTECTÉ — NIVEAU DE MENACE MAXIMUM`, detail: `Un aspirateur a été aperçu dans l'appartement. ${nom} a émis un grognement sourd et s'est réfugiée sous le canapé. Situation sous contrôle.` },
    { level: 'bonne', headline: `DIPLOMATIE : ${nom} A ACCEPTÉ UN CÂLIN`, detail: `Dans un geste historique, la lapine a toléré 12 secondes de contact humain sans se débattre. Les négociateurs sont soulagés.` },
  ]

  // Pick random fillers to fill to 5 items
  const shuffled = fillers.sort(() => Math.random() - 0.5)
  for (const f of shuffled) {
    if (items.length >= 5) break
    items.push(f)
  }

  return items.slice(0, 5)
}

const LEVEL_CONFIG: Record<Level, { label: string; color: string; bg: string }> = {
  alerte: { label: '🔴 ALERTE',  color: '#e74c3c', bg: 'rgba(231,76,60,0.1)' },
  urgent: { label: '🟠 URGENT',  color: '#e67e22', bg: 'rgba(230,126,34,0.1)' },
  info:   { label: '🔵 INFO',    color: '#3498db', bg: 'rgba(52,152,219,0.1)' },
  bonne:  { label: '🟢 BONNE NOUVELLE', color: '#27ae60', bg: 'rgba(39,174,96,0.1)' },
}

export default function BreakingNewsPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [tick, setTick] = useState(0)
  const [time, setTime] = useState(timeStr())

  useEffect(() => {
    const t = setInterval(() => { setTick(i => i + 1); setTime(timeStr()) }, 3000)
    return () => clearInterval(t)
  }, [])

  const news = useMemo(() => buildNews(profil.nom, profil.race), [profil.nom, profil.race])
  const top = news[0]

  const TICKER_ITEMS = [
    `${profil.nom} décline tout commentaire`,
    `Le pissenlit en hausse de 3% sur les marchés mondiaux`,
    `Météo : risque de carottes ce week-end`,
    `${profil.nom} confirme : le mardi est son meilleur jour`,
    `Nouveau record mondial de sieste : 14h consécutives`,
    `Le thumping : une langue incomprise des humains depuis des siècles`,
    `Bourse du foin : cours stable`,
    `${profil.nom} refuse de confirmer ou d'infirmer la rumeur`,
    `Les cécotrophes : toujours incompris, toujours consommés`,
  ]
  const tickerText = TICKER_ITEMS.join('   •   ')

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

      {/* TV Header */}
      <div className={styles.tvHeader}>
        <div className={styles.tvLogo}>
          <span className={styles.tvDot} />
          <span className={styles.tvName}>CHIPIE NEWS 24/7</span>
        </div>
        <div className={styles.tvMeta}>
          <span className={styles.tvDate}>{dateStr()}</span>
          <span className={styles.tvTime}>{time}</span>
        </div>
      </div>

      {/* Breaking banner */}
      <div className={styles.breakingBanner} style={{ background: LEVEL_CONFIG[top.level].color }}>
        <span className={styles.breakingLabel}>⚡ BREAKING</span>
        <span className={styles.breakingHeadline}>{top.headline}</span>
      </div>

      {/* Lead story */}
      <div className={styles.leadCard}>
        <span className={styles.levelBadge} style={{ color: LEVEL_CONFIG[top.level].color, background: LEVEL_CONFIG[top.level].bg }}>
          {LEVEL_CONFIG[top.level].label}
        </span>
        <h2 className={styles.leadTitle}>{top.headline}</h2>
        <p className={styles.leadDetail}>{top.detail}</p>
        <span className={styles.reporter}>— Envoyée spéciale Chipie News, {time}</span>
      </div>

      {/* Other news */}
      <div className={styles.otherNews}>
        <p className={styles.otherTitle}>AUTRES INFORMATIONS</p>
        {news.slice(1).map((item, i) => (
          <div key={i} className={styles.newsItem}>
            <span className={styles.newsLevel} style={{ color: LEVEL_CONFIG[item.level].color }}>
              {LEVEL_CONFIG[item.level].label}
            </span>
            <div>
              <p className={styles.newsHeadline}>{item.headline}</p>
              <p className={styles.newsDetail}>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ticker */}
      <div className={styles.ticker}>
        <span className={styles.tickerLabel}>EN CONTINU</span>
        <div className={styles.tickerWrap}>
          <span className={styles.tickerText} key={tick}>{tickerText}</span>
        </div>
      </div>
    </div>
  )
}

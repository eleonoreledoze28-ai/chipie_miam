import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { VEGETAUX } from '../../data/vegetaux'
import styles from './ProcesPage.module.css'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function getPast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10)
  })
}
function dateAudience() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

type Verdict = 'coupable' | 'non_coupable' | 'circonstances_attenuantes'

interface Charge {
  emoji: string
  description: string
  preuves: string[]
  defense: string
}

function buildProcès(nom: string): {
  chefs: Charge[]
  plaidoirie: string
  requisitoire: string
  verdict: Verdict
  peine: string
  dossier: string
} {
  const today = todayStr()
  const past7 = getPast7Days()
  const h = new Date().getHours()

  // Evidence gathering
  let topVeg = ''
  let todayCount = 0
  let missingDays = 0
  try {
    const raw = localStorage.getItem(`chipie_journal_${getActiveProfileId()}`)
    const entries: { date: string; vegetalId: string }[] = raw ? JSON.parse(raw) : []
    const weekEntries = entries.filter(e => past7.includes(e.date))
    todayCount = entries.filter(e => e.date === today).length
    const daysWithEntry = new Set(weekEntries.map(e => e.date)).size
    missingDays = 7 - daysWithEntry
    const counts: Record<string, number> = {}
    weekEntries.forEach(e => { counts[e.vegetalId] = (counts[e.vegetalId] || 0) + 1 })
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    topVeg = topId ? (VEGETAUX.find(v => v.id === topId)?.nom ?? '') : 'des carottes'
  } catch { /* ignore */ }

  let foinBas = false
  let foinVide = false
  try {
    const raw = localStorage.getItem(`chipie-foin-${getActiveProfileId()}`)
    if (raw) {
      const achats: { kg: number }[] = JSON.parse(raw)
      const total = achats.reduce((s, a) => s + a.kg * 1000, 0)
      if (total < 200) foinVide = true
      else if (total < 600) foinBas = true
    } else foinVide = true
  } catch { /* ignore */ }

  let foinOublie = false
  let eauOubliee = false
  try {
    const raw = localStorage.getItem(`chipie-checklist-${today}`)
    const done: string[] = raw ? JSON.parse(raw) : []
    foinOublie = !done.includes('foin')
    eauOubliee = !done.includes('eau')
  } catch { /* ignore */ }

  const chefs: Charge[] = []

  if (missingDays >= 3) {
    chefs.push({
      emoji: '🥗',
      description: `Abandon alimentaire répété (${missingDays} jours sans repas enregistré sur 7)`,
      preuves: [
        `Les registres du journal alimentaire attestent de ${missingDays} journées d'abstention inexpliquée.`,
        `${nom} a été observée fixant sa gamelle vide pendant des durées anormalement longues.`,
      ],
      defense: `La défense invoque un "oubli de saisie" et non un oubli réel. Les jurés sont libres de croire ce qu'ils veulent.`,
    })
  }

  if (foinVide || foinBas) {
    chefs.push({
      emoji: '🌾',
      description: foinVide ? `Pénurie de foin — négligence caractérisée` : `Stock de foin dangereusement bas — mise en danger d'un lapin`,
      preuves: [
        foinVide ? `Aucun stock de foin enregistré dans le système.` : `Le stock de foin est en dessous du seuil critique de sécurité.`,
        `${nom} a été filmée en train de grignoter le bord de sa litière. Les images sont accablantes.`,
      ],
      defense: `L'accusé(e) affirme avoir "commandé du foin". La livraison est "dans les prochains jours". Depuis 3 semaines.`,
    })
  }

  if (foinOublie && h >= 9) {
    chefs.push({
      emoji: '🪣',
      description: `Non-renouvellement du foin ce jour`,
      preuves: [
        `La checklist du jour confirme l'absence de changement de foin.`,
        `${nom} a effectué 3 tours de son enclos en signe de protestation à 8h47.`,
      ],
      defense: `L'accusé(e) dit "j'allais le faire". C'est noté.`,
    })
  }

  if (eauOubliee && h >= 10) {
    chefs.push({
      emoji: '💧',
      description: `Eau non renouvelée — atteinte à l'hydratation`,
      preuves: [
        `La gamelle d'eau présente des signes de stagnation.`,
        `${nom} a boudé ostensiblement depuis 9h.`,
      ],
      defense: `"J'ai oublié." Fin de la défense.`,
    })
  }

  if (topVeg && todayCount >= 4) {
    chefs.push({
      emoji: '🥕',
      description: `Excès de ${topVeg} — monotonie culinaire imposée`,
      preuves: [
        `${nom} a reçu du ${topVeg} lors de ${todayCount} repas consécutifs.`,
        `Des experts en nutrition lapine parlent d'un "régime traumatisant".`,
      ],
      defense: `"${nom} aime les ${topVeg}s." Peut-être. Mais personne ne lui a demandé.`,
    })
  }

  // Always have at least 2 charges
  const fallbackChefs: Charge[] = [
    {
      emoji: '🪑',
      description: `Utilisation du canapé sans autorisation de ${nom}`,
      preuves: [
        `${nom} a constaté la présence humaine sur son canapé personnel à 20h14.`,
        `Un poil de lapin retrouvé sur le coussin confirme la propriété du meuble.`,
      ],
      defense: `L'accusé(e) affirme "payer le loyer". Ce n'est pas un argument recevable devant cette cour.`,
    },
    {
      emoji: '📱',
      description: `Utilisation du téléphone pendant les heures de câlins`,
      preuves: [
        `${nom} a officiellement offert 8 secondes de contact visuel ignorées.`,
        `L'accusé(e) fixait son écran au lieu de l'admirer.`,
      ],
      defense: `"C'était urgent." Rien n'est plus urgent que ${nom}.`,
    },
    {
      emoji: '🌙',
      description: `Coucher tardif perturbant le sommeil de ${nom}`,
      preuves: [
        `La lumière était encore allumée à 22h43.`,
        `${nom} a thumped 2 fois pour signaler son mécontentement.`,
      ],
      defense: `L'accusé(e) invoque "le travail". Le tribunal déplore.`,
    },
  ]

  for (const f of fallbackChefs) {
    if (chefs.length >= 3) break
    chefs.push(f)
  }

  const nbChefs = chefs.length
  const gravite = (foinVide ? 3 : 0) + (missingDays >= 3 ? 2 : 0) + (foinBas ? 1 : 0)

  let verdict: Verdict
  let peine: string
  let requisitoire: string
  let plaidoirie: string

  if (gravite >= 4) {
    verdict = 'coupable'
    peine = `Obligation de se rendre au magasin d'animaux dans les 24 heures. Achat d'un légume de luxe obligatoire. Séance de câlins d'une durée minimale de 10 minutes.`
    requisitoire = `Monsieur·dame le·la Président·e, les faits sont accablants. ${nbChefs} chefs d'accusation retenus contre l'accusé(e), dont des faits d'une gravité exceptionnelle. La partie civile, ${nom}, demande réparation intégrale.`
    plaidoirie = `La défense reconnaît les faits mais invoque des circonstances difficiles. L'accusé(e) promet de s'amender et d'acheter du foin dès demain. Le tribunal appréciera la sincérité de cet engagement.`
  } else if (gravite >= 2) {
    verdict = 'circonstances_attenuantes'
    peine = `Avertissement officiel inscrit au casier lapinesque. Obligation de vérifier la checklist chaque matin pendant 30 jours.`
    requisitoire = `La situation est préoccupante sans être catastrophique. ${nbChefs} charges retenues. ${nom} se réserve le droit de durcir sa position.`
    plaidoirie = `L'accusé(e) est globalement de bonne foi. Des lacunes existent, mais la volonté de bien faire est évidente. La clémence est envisageable.`
  } else {
    verdict = 'non_coupable'
    peine = `Acquittement. ${nom} accorde sa clémence sous réserve de maintenir ce niveau de soin.`
    requisitoire = `Le parquet reconnaît que l'accusé(e) s'acquitte correctement de ses devoirs. Les charges retenues sont de moindre gravité.`
    plaidoirie = `Mon client·e est innocent·e des charges les plus sérieuses. La cour peut constater que ${nom} est bien soignée. Les preuves parlent d'elles-mêmes.`
  }

  const dossier = `N° ${Math.floor(Math.random() * 9000) + 1000}-LAPIN-${new Date().getFullYear()}`

  return { chefs, plaidoirie, requisitoire, verdict, peine, dossier }
}

const VERDICT_CONFIG: Record<Verdict, { label: string; color: string; emoji: string }> = {
  coupable: { label: 'COUPABLE', color: '#e74c3c', emoji: '🔨' },
  non_coupable: { label: 'NON COUPABLE', color: '#27ae60', emoji: '⚖️' },
  circonstances_attenuantes: { label: 'CIRCONSTANCES ATTÉNUANTES', color: '#e67e22', emoji: '🧡' },
}

export default function ProcesPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [phase, setPhase] = useState<'intro' | 'charges' | 'debats' | 'verdict'>('intro')

  const { chefs, plaidoirie, requisitoire, verdict, peine, dossier } = useMemo(
    () => buildProcès(profil.nom),
    [profil.nom]
  )

  const cfg = VERDICT_CONFIG[verdict]

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
        <span className={styles.headerEmoji}>⚖️</span>
        <div>
          <h1 className={styles.title}>Le procès de {profil.nom}</h1>
          <p className={styles.subtitle}>Audience du {dateAudience()}</p>
        </div>
      </div>

      {phase === 'intro' && (
        <div className={styles.card}>
          <div className={styles.courtHeader}>
            <p className={styles.courtTitle}>TRIBUNAL LAPINESQUE DE GRANDE INSTANCE</p>
            <p className={styles.courtSub}>Dossier {dossier}</p>
          </div>
          <div className={styles.parties}>
            <div className={styles.partie}>
              <span className={styles.partieEmoji}>🐇</span>
              <p className={styles.partieName}>{profil.nom}</p>
              <p className={styles.partieRole}>Partie civile</p>
            </div>
            <div className={styles.vs}>VS</div>
            <div className={styles.partie}>
              <span className={styles.partieEmoji}>🧑</span>
              <p className={styles.partieName}>Son·sa propriétaire</p>
              <p className={styles.partieRole}>Accusé(e)</p>
            </div>
          </div>
          <p className={styles.introText}>
            {chefs.length} chef{chefs.length > 1 ? 's' : ''} d'accusation retenu{chefs.length > 1 ? 's' : ''} par le parquet lapinesque.
            L'audience va commencer. Silence dans la salle.
          </p>
          <button className={styles.nextBtn} onClick={() => setPhase('charges')}>
            🔔 Ouvrir l'audience
          </button>
        </div>
      )}

      {phase === 'charges' && (
        <div className={styles.card}>
          <p className={styles.phaseTitle}>CHEFS D'ACCUSATION</p>
          <div className={styles.chefsList}>
            {chefs.map((c, i) => (
              <div key={i} className={styles.chefItem}>
                <div className={styles.chefHeader}>
                  <span className={styles.chefNum}>Chef {i + 1}</span>
                  <span className={styles.chefEmoji}>{c.emoji}</span>
                </div>
                <p className={styles.chefDesc}>{c.description}</p>
                <div className={styles.preuves}>
                  {c.preuves.map((p, j) => (
                    <p key={j} className={styles.preuve}>• {p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className={styles.nextBtn} onClick={() => setPhase('debats')}>
            🗣️ Passer aux débats
          </button>
        </div>
      )}

      {phase === 'debats' && (
        <div className={styles.card}>
          <p className={styles.phaseTitle}>LES DÉBATS</p>

          <div className={styles.discours}>
            <p className={styles.discoursRole}>⚖️ Réquisitoire (Parquet de {profil.nom})</p>
            <p className={styles.discoursText}>{requisitoire}</p>
          </div>

          <div className={styles.discours}>
            <p className={styles.discoursRole}>🎤 Plaidoirie (Défense)</p>
            <p className={styles.discoursText}>{plaidoirie}</p>
          </div>

          {chefs.map((c, i) => (
            <div key={i} className={styles.defense}>
              <p className={styles.defenseLabel}>Réponse sur chef {i + 1}</p>
              <p className={styles.defenseText}>{c.defense}</p>
            </div>
          ))}

          <button className={styles.nextBtn} onClick={() => setPhase('verdict')}>
            🔨 Délibérer
          </button>
        </div>
      )}

      {phase === 'verdict' && (
        <div className={styles.card}>
          <p className={styles.phaseTitle}>VERDICT</p>
          <div className={styles.verdictBox} style={{ borderColor: cfg.color, background: `${cfg.color}15` }}>
            <span className={styles.verdictEmoji}>{cfg.emoji}</span>
            <p className={styles.verdictLabel} style={{ color: cfg.color }}>{cfg.label}</p>
          </div>
          <div className={styles.peine}>
            <p className={styles.peineLabel}>PEINE PRONONCÉE</p>
            <p className={styles.peineText}>{peine}</p>
          </div>
          <p className={styles.footer}>
            Rendu par le Tribunal Lapinesque de Grande Instance, présidé par {profil.nom} en personne.
            Ce jugement est définitif et sans appel possible.
          </p>
          <button className={styles.nextBtn} onClick={() => setPhase('intro')}>
            🔄 Nouvelle audience
          </button>
        </div>
      )}

      {/* Steps */}
      <div className={styles.steps}>
        {(['intro', 'charges', 'debats', 'verdict'] as const).map((s, i) => (
          <div
            key={s}
            className={`${styles.step} ${phase === s ? styles.stepActive : (['charges', 'debats', 'verdict'].indexOf(s) <= ['intro', 'charges', 'debats', 'verdict'].indexOf(phase) - 1 ? styles.stepDone : '')}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}

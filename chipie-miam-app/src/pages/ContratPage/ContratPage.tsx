import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { VEGETAUX } from '../../data/vegetaux'
import styles from './ContratPage.module.css'

function getMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}`
}

function storageKey() { return `chipie-contrat-${getActiveProfileId()}` }

interface SignedContrat { month: string; date: string; clauses: string[] }

function loadSigned(): SignedContrat[] {
  try { const r = localStorage.getItem(storageKey()); return r ? JSON.parse(r) : [] } catch { return [] }
}

function saveSign(clauses: string[]) {
  const all = loadSigned()
  const month = getMonthKey()
  const updated = all.filter(c => c.month !== month)
  updated.push({ month, date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), clauses })
  localStorage.setItem(storageKey(), JSON.stringify(updated))
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function buildClauses(nom: string): string[] {
  const clauses: string[] = []
  const today = todayStr()
  const month = new Date().getMonth()

  // Data analysis
  let totalEntries = 0
  let topVeg = ''
  let varietyCount = 0
  try {
    const raw = localStorage.getItem(`chipie_journal_${getActiveProfileId()}`)
    const entries: { date: string; vegetalId: string }[] = raw ? JSON.parse(raw) : []
    const past30 = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10) })
    const recent = entries.filter(e => past30.includes(e.date))
    totalEntries = recent.length
    const counts: Record<string, number> = {}
    recent.forEach(e => { counts[e.vegetalId] = (counts[e.vegetalId] || 0) + 1 })
    varietyCount = Object.keys(counts).length
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    topVeg = topId ? (VEGETAUX.find(v => v.id === topId)?.nom ?? '') : ''
  } catch { /* ignore */ }

  let foinBas = false
  try {
    const raw = localStorage.getItem(`chipie-foin-${getActiveProfileId()}`)
    if (raw) foinBas = JSON.parse(raw).reduce((s: number, a: { kg: number }) => s + a.kg * 1000, 0) < 600
    else foinBas = true
  } catch { foinBas = true }

  let checklistScore = 0
  try {
    const raw = localStorage.getItem(`chipie-checklist-${today}`)
    checklistScore = raw ? JSON.parse(raw).length : 0
  } catch { /* ignore */ }

  // Fixed foundational clauses
  clauses.push(`**Article 1 — Propriété des lieux.** ${nom} est reconnue propriétaire morale et émotionnelle du logement. L'humain est locataire à titre gracieux, sous réserve de bonne conduite.`)
  clauses.push(`**Article 2 — Foin.** Le foin sera disponible en permanence, renouvelé chaque matin avant toute activité humaine. Toute pénurie constitue une violation grave du présent contrat.`)
  clauses.push(`**Article 3 — Les câlins.** La durée et la fréquence des câlins sont fixées unilatéralement par ${nom}. Tout dépassement de la durée accordée est passible d'une morsure préventive.`)
  clauses.push(`**Article 4 — Le canapé.** Le canapé est officiellement désigné territoire mixte. L'humain y est toléré à condition de ne pas occuper le coin préféré de ${nom}, lequel lui sera communiqué par geste hostile.`)

  // Data-driven clauses
  if (foinBas) {
    clauses.push(`**Article 5 — Protocole d'urgence foin.** Vu la situation critique du stock actuel, l'humain s'engage à procéder au réapprovisionnement dans les 48 heures suivant la signature du présent acte. Le délai est non négociable.`)
  } else {
    clauses.push(`**Article 5 — Gestion préventive du foin.** L'humain s'engage à maintenir un stock minimum de sécurité. Tout stock inférieur à 500g déclenchera automatiquement une procédure de mise en demeure.`)
  }

  if (totalEntries >= 15) {
    clauses.push(`**Article 6 — Mérite alimentaire.** L'humain ayant démontré une régularité appréciable (${totalEntries} repas enregistrés ce mois), ${nom} lui accorde le titre honorifique de "Gestionnaire Acceptable". Ce titre est révocable.`)
  } else {
    clauses.push(`**Article 6 — Obligation alimentaire.** Le journal alimentaire sera tenu avec sérieux. ${totalEntries < 5 ? `Les résultats actuels (${totalEntries} entrées) sont jugés insuffisants et consignés comme pièce à charge.` : `Des progrès sont attendus.`}`)
  }

  if (topVeg) {
    clauses.push(`**Article 7 — Diversité culinaire.** L'humain reconnaît que ${nom} mérite une alimentation variée. ${varietyCount >= 8 ? `La diversité actuelle (${varietyCount} légumes) est jugée satisfaisante.` : `La surreprésentation du ${topVeg} au menu est notée et fera l'objet d'une surveillance.`}`)
  } else {
    clauses.push(`**Article 7 — Diversité culinaire.** L'humain s'engage à proposer au minimum 5 légumes différents par semaine. La monotonie alimentaire est considérée comme une atteinte au bien-être lapinesque.`)
  }

  if (checklistScore < 3) {
    clauses.push(`**Article 8 — Soins quotidiens.** La checklist de soins journaliers sera complétée avant 10h du matin. ${nom} a observé des manquements récurrents et les a consignés dans son propre registre.`)
  } else {
    clauses.push(`**Article 8 — Soins quotidiens.** Les soins du jour ayant été effectués dans des délais raisonnables, ${nom} accorde à l'humain une journée sans regard accusateur. Offre non renouvelable automatiquement.`)
  }

  // Seasonal clause
  const seasons = ['hivernal', 'printanier', 'estival', 'automnal']
  const season = seasons[Math.floor(month / 3)]
  clauses.push(`**Article 9 — Clause saisonnière.** Pour cette période ${season}, ${nom} se réserve le droit d'adapter ses habitudes sans en informer l'humain à l'avance. Les binkies inattendus, les bouderies inexpliquées et les heures de sommeil irrégulières entrent dans ce cadre.`)

  clauses.push(`**Article 10 — Clause de révision.** Le présent contrat est renouvelé chaque mois. En cas de non-signature, ${nom} considère que les termes précédents lui sont favorables et les maintient unilatéralement.`)

  return clauses
}

const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']

export default function ContratPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [signed, setSigned] = useState(() => {
    const all = loadSigned()
    return all.find(c => c.month === getMonthKey()) ?? null
  })
  const [signing, setSigning] = useState(false)

  const clauses = useMemo(() => buildClauses(profil.nom), [profil.nom])
  const month = new Date()
  const monthLabel = `${MONTHS_FR[month.getMonth()]} ${month.getFullYear()}`

  function handleSign() {
    setSigning(true)
    setTimeout(() => {
      saveSign(clauses)
      setSigned({ month: getMonthKey(), date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), clauses })
      setSigning(false)
    }, 1200)
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
        <span className={styles.headerEmoji}>📜</span>
        <div>
          <h1 className={styles.title}>Contrat de cohabitation</h1>
          <p className={styles.subtitle}>Édition {monthLabel}</p>
        </div>
      </div>

      <div className={styles.document}>
        <div className={styles.docHeader}>
          <p className={styles.docEtablissement}>ÉTUDE LAPINESQUE NOTARIALE</p>
          <p className={styles.docSub}>Enregistré sous le n° {new Date().getFullYear()}-{String(new Date().getMonth() + 1).padStart(2, '0')}-LAPIN</p>
          <div className={styles.docDivider} />
          <h2 className={styles.docTitle}>CONTRAT DE COHABITATION</h2>
          <p className={styles.docPeriod}>Valable pour le mois de {monthLabel}</p>
          <div className={styles.parties}>
            <div className={styles.partie}><span className={styles.partieRole}>La partie lapine</span><span className={styles.partieName}>{profil.nom} 🐰</span></div>
            <span className={styles.et}>et</span>
            <div className={styles.partie}><span className={styles.partieRole}>La partie humaine</span><span className={styles.partieName}>Son·sa propriétaire</span></div>
          </div>
        </div>

        <div className={styles.clauses}>
          {clauses.map((c, i) => {
            const [bold, ...rest] = c.split('.')
            return (
              <div key={i} className={styles.clause}>
                <p className={styles.clauseText}>
                  <strong>{bold.replace(/\*\*/g, '')}.</strong>{rest.join('.')}
                </p>
              </div>
            )
          })}
        </div>

        <div className={styles.signatures}>
          <div className={styles.sigBlock}>
            <div className={`${styles.sigLine} ${signed ? styles.sigLineSigned : ''}`} />
            <p className={styles.sigRole}>La partie lapine</p>
            <p className={styles.sigName}>{profil.nom}</p>
            {signed && <p className={styles.sigDate}>{signed.date}</p>}
          </div>
          <div className={styles.sigBlock}>
            <div className={`${styles.sigLine} ${signed ? styles.sigLineSigned : ''}`} />
            <p className={styles.sigRole}>La partie humaine</p>
            <p className={styles.sigName}>Son·sa propriétaire</p>
            {signed && <p className={styles.sigDate}>{signed.date}</p>}
          </div>
        </div>

        {signed ? (
          <div className={styles.signedBadge}>
            <span className={styles.signedStamp}>✦ SIGNÉ ✦</span>
            <p className={styles.signedText}>Contrat en vigueur jusqu'au 1er du mois prochain.</p>
          </div>
        ) : (
          <button className={`${styles.signBtn} ${signing ? styles.signBtnSigning : ''}`} onClick={handleSign} disabled={signing}>
            {signing ? '✍️ Signature en cours…' : '✍️ Signer le contrat'}
          </button>
        )}
      </div>
    </div>
  )
}

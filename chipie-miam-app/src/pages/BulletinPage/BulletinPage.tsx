import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { VEGETAUX } from '../../data/vegetaux'
import styles from './BulletinPage.module.css'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function getPast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10)
  })
}

type Grade = 'A' | 'B' | 'C' | 'D' | 'F'
interface Subject {
  emoji: string
  matiere: string
  note: Grade
  appreciation: string
}

const GRADE_COLOR: Record<Grade, string> = {
  A: '#27ae60',
  B: '#2980b9',
  C: '#f39c12',
  D: '#e67e22',
  F: '#e74c3c',
}

function gradeFromScore(score: number, max: number): Grade {
  const pct = max === 0 ? 0 : score / max
  if (pct >= 0.85) return 'A'
  if (pct >= 0.65) return 'B'
  if (pct >= 0.45) return 'C'
  if (pct >= 0.25) return 'D'
  return 'F'
}

function buildBulletin(nom: string): { subjects: Subject[]; mention: string; commentaire: string; trimestre: number } {
  const past30 = getPast30Days()
  const today = todayStr()
  const trimestre = Math.ceil((new Date().getMonth() + 1) / 4)

  // Journal analysis
  let uniqueDays = 0
  let topVeg = ''
  let varietyScore = 0
  try {
    const raw = localStorage.getItem(`chipie_journal_${getActiveProfileId()}`)
    const entries: { date: string; vegetalId: string }[] = raw ? JSON.parse(raw) : []
    const monthEntries = entries.filter(e => past30.includes(e.date))
    uniqueDays = new Set(monthEntries.map(e => e.date)).size
    const counts: Record<string, number> = {}
    monthEntries.forEach(e => { counts[e.vegetalId] = (counts[e.vegetalId] || 0) + 1 })
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    topVeg = topId ? (VEGETAUX.find(v => v.id === topId)?.nom ?? '') : ''
    varietyScore = Object.keys(counts).length
  } catch { /* ignore */ }

  // Checklist analysis
  let checklistScore = 0
  let checklistTotal = 0
  try {
    for (const day of past30.slice(0, 7)) {
      const raw = localStorage.getItem(`chipie-checklist-${day}`)
      const done: string[] = raw ? JSON.parse(raw) : []
      checklistScore += done.length
      checklistTotal += 4
    }
  } catch { /* ignore */ }

  // Foin
  let foinScore = 100
  try {
    const raw = localStorage.getItem(`chipie-foin-${getActiveProfileId()}`)
    if (raw) {
      const achats: { kg: number }[] = JSON.parse(raw)
      const total = achats.reduce((s, a) => s + a.kg * 1000, 0)
      if (total < 200) foinScore = 10
      else if (total < 500) foinScore = 40
      else if (total < 1000) foinScore = 70
    } else foinScore = 0
  } catch { /* ignore */ }

  // Today checklist
  let todayDone = 0
  try {
    const raw = localStorage.getItem(`chipie-checklist-${today}`)
    todayDone = raw ? JSON.parse(raw).length : 0
  } catch { /* ignore */ }

  const alimentGrade = gradeFromScore(uniqueDays, 25)
  const varietyGrade = gradeFromScore(varietyScore, 10)
  const foinGrade = gradeFromScore(foinScore, 100)
  const checklistGrade = checklistTotal > 0 ? gradeFromScore(checklistScore, checklistTotal) : (todayDone >= 3 ? 'B' : todayDone === 2 ? 'C' : 'D') as Grade

  const appreciationAliment: Record<Grade, string> = {
    A: `${nom} est nourrie avec une régularité exemplaire. La gestionnaire mérite une médaille.`,
    B: `L'alimentation est dans l'ensemble satisfaisante. Quelques jours d'absence notés, mais rien d'alarmant.`,
    C: `Des lacunes dans la régularité des repas. ${nom} a eu faim certains jours. Peut mieux faire.`,
    D: `La régularité est insuffisante. ${nom} lance des regards accusateurs depuis une semaine.`,
    F: `Aucun repas enregistré ce mois. Le jury est sans voix. ${nom} aussi, mais par dépit.`,
  }

  const appreciationVariety: Record<Grade, string> = {
    A: `Un régime d'une diversité remarquable. ${topVeg ? `Le ${topVeg} reste le chouchou.` : ''} Élève modèle.`,
    B: `Bonne variété dans l'ensemble. ${topVeg ? `Légère surreprésentation du ${topVeg}.` : ''} Satisfaisant.`,
    C: `Le menu manque de créativité. ${nom} commence à connaître les légumes par cœur.`,
    D: `Répétition inquiétante. ${nom} fait des cauchemars de carottes.`,
    F: `Diversité nulle. Résultats à revoir d'urgence.`,
  }

  const appreciationFoin: Record<Grade, string> = {
    A: `Stock de foin impeccable. Chapeau bas.`,
    B: `Stock correct. À surveiller néanmoins.`,
    C: `Stock en dessous du souhaitable. À réapprovisionner rapidement.`,
    D: `Niveau critique. ${nom} fixe la mangeoire avec des yeux de survivante.`,
    F: `Stock non enregistré ou vide. Situation d'urgence nationale.`,
  }

  const appreciationChecklist: Record<Grade, string> = {
    A: `La checklist est réalisée avec une ponctualité militaire. ${nom} est impressionnée — ce qui est rare.`,
    B: `La checklist est globalement bien suivie. Quelques oublis pardonnables.`,
    C: `Des oublis récurrents. Le foin a parfois attendu. L'eau aussi.`,
    D: `La checklist est souvent incomplète. ${nom} prend des notes.`,
    F: `La checklist est ignorée. ${nom} se débrouille seule. Avec dignité.`,
  }

  const subjects: Subject[] = [
    { emoji: '🥗', matiere: 'Alimentation', note: alimentGrade, appreciation: appreciationAliment[alimentGrade] },
    { emoji: '🌈', matiere: 'Diversité végétale', note: varietyGrade, appreciation: appreciationVariety[varietyGrade] },
    { emoji: '🌾', matiere: 'Gestion du foin', note: foinGrade, appreciation: appreciationFoin[foinGrade] },
    { emoji: '✅', matiere: 'Soins quotidiens', note: checklistGrade, appreciation: appreciationChecklist[checklistGrade] },
  ]

  const avg = [alimentGrade, varietyGrade, foinGrade, checklistGrade]
  const gradeVal = { A: 4, B: 3, C: 2, D: 1, F: 0 }
  const avgScore = avg.reduce((s, g) => s + gradeVal[g], 0) / avg.length

  let mention = ''
  let commentaire = ''
  if (avgScore >= 3.5) {
    mention = 'Mention Très Bien'
    commentaire = `Félicitations au conseil de famille. ${nom} accorde un câlin de 8 secondes en guise de récompense.`
  } else if (avgScore >= 2.5) {
    mention = 'Mention Bien'
    commentaire = `Bon trimestre dans l'ensemble. ${nom} a noté vos efforts et les reconnaît officiellement (par un regard neutre mais bienveillant).`
  } else if (avgScore >= 1.5) {
    mention = 'Mention Assez Bien'
    commentaire = `Des progrès sont visibles mais des efforts restent nécessaires. ${nom} reste optimiste. Enfin, "optimiste" est un grand mot.`
  } else if (avgScore >= 0.5) {
    mention = 'Passage en conseil de discipline'
    commentaire = `La situation est préoccupante. ${nom} a convoqué une réunion d'urgence. Présence obligatoire.`
  } else {
    mention = 'Redoublement recommandé'
    commentaire = `Le jury est consterné. ${nom} a demandé à être placée dans une famille d'accueil. Dossier en cours.`
  }

  return { subjects, mention, commentaire, trimestre }
}

export default function BulletinPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()

  const { subjects, mention, commentaire, trimestre } = useMemo(
    () => buildBulletin(profil.nom),
    [profil.nom]
  )

  const year = new Date().getFullYear()

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
        <span className={styles.headerEmoji}>📋</span>
        <div>
          <h1 className={styles.title}>Bulletin de notes</h1>
          <p className={styles.subtitle}>Évaluation par {profil.nom}</p>
        </div>
      </div>

      {/* Official header */}
      <div className={styles.bulletin}>
        <div className={styles.officialHeader}>
          <p className={styles.school}>ACADÉMIE DE {profil.nom.toUpperCase()}</p>
          <p className={styles.schoolSub}>Établissement agréé par la Fédération Lapine Internationale</p>
          <div className={styles.divider} />
          <p className={styles.period}>Trimestre {trimestre} — Année {year - 1}/{year}</p>
          <p className={styles.student}>Élève : <strong>SON·SA PROPRIÉTAIRE</strong></p>
        </div>

        {/* Grades */}
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Matière</span>
            <span>Note</span>
          </div>
          {subjects.map((s, i) => (
            <div key={i} className={styles.tableRow}>
              <div className={styles.rowLeft}>
                <span className={styles.rowEmoji}>{s.emoji}</span>
                <div>
                  <p className={styles.rowMatiere}>{s.matiere}</p>
                  <p className={styles.rowAppreciation}>{s.appreciation}</p>
                </div>
              </div>
              <span className={styles.rowGrade} style={{ color: GRADE_COLOR[s.note], borderColor: GRADE_COLOR[s.note] }}>
                {s.note}
              </span>
            </div>
          ))}
        </div>

        {/* Mention */}
        <div className={styles.mentionBox}>
          <p className={styles.mentionLabel}>DÉCISION DU JURY</p>
          <p className={styles.mention}>{mention}</p>
          <p className={styles.commentaire}>{commentaire}</p>
        </div>

        {/* Signature */}
        <div className={styles.signatureRow}>
          <div className={styles.sig}>
            <div className={styles.sigLine} />
            <p className={styles.sigLabel}>Le Proviseur</p>
            <p className={styles.sigName}>{profil.nom} 🐇</p>
          </div>
          <div className={styles.sig}>
            <div className={styles.sigLine} />
            <p className={styles.sigLabel}>L'Élève</p>
            <p className={styles.sigName}>Son·sa propriétaire</p>
          </div>
        </div>

        <p className={styles.stamp}>✦ ORIGINAL ✦</p>
      </div>
    </div>
  )
}

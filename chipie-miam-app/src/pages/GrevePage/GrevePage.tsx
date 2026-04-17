import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './GrevePage.module.css'

function todayStr() { return new Date().toISOString().slice(0, 10) }

interface Revendication {
  id: string
  emoji: string
  titre: string
  detail: string
  gravite: 1 | 2 | 3
}

interface GreveState {
  enGreve: boolean
  niveau: 0 | 1 | 2 | 3
  revendications: Revendication[]
  satisfaites: string[]
}

function storageKey() { return `chipie-greve-${getActiveProfileId()}` }
function loadSatisfaites(): string[] {
  try { const r = localStorage.getItem(storageKey()); return r ? JSON.parse(r) : [] } catch { return [] }
}
function saveSatisfaites(ids: string[]) {
  localStorage.setItem(storageKey(), JSON.stringify(ids))
}

function buildGreve(nom: string): GreveState {
  const today = todayStr()
  const revendications: Revendication[] = []

  // Check foin
  try {
    const raw = localStorage.getItem(`chipie-foin-${getActiveProfileId()}`)
    if (!raw) {
      revendications.push({ id: 'foin-vide', emoji: '🌾', titre: 'Stock de foin inexistant', detail: `Aucun approvisionnement enregistré. ${nom} refuse de commenter et fixe le plafond depuis 3 heures.`, gravite: 3 })
    } else {
      const total = JSON.parse(raw).reduce((s: number, a: { kg: number }) => s + a.kg * 1000, 0)
      if (total < 200) revendications.push({ id: 'foin-critique', emoji: '🌾', titre: 'Foin en état critique', detail: `Moins de 200g restants. ${nom} a rédigé son testament par précaution.`, gravite: 3 })
      else if (total < 600) revendications.push({ id: 'foin-bas', emoji: '🌾', titre: 'Réserves de foin insuffisantes', detail: `Le stock approche du seuil d'alerte. ${nom} surveille la situation avec méfiance.`, gravite: 2 })
    }
  } catch { /* ignore */ }

  // Check checklist
  try {
    const raw = localStorage.getItem(`chipie-checklist-${today}`)
    const done: string[] = raw ? JSON.parse(raw) : []
    if (!done.includes('foin')) revendications.push({ id: 'foin-jour', emoji: '🪣', titre: 'Foin non renouvelé ce jour', detail: `Il est ${new Date().getHours()}h et le foin n'a pas été changé. ${nom} a déposé un préavis à 8h04.`, gravite: 2 })
    if (!done.includes('eau')) revendications.push({ id: 'eau', emoji: '💧', titre: 'Eau non renouvelée', detail: `La gamelle présente des signes de vieillissement avancé. Une ONG internationale a été alertée.`, gravite: 2 })
    if (!done.includes('legumes')) revendications.push({ id: 'legumes-jour', emoji: '🥗', titre: 'Légumes frais non servis', detail: `${nom} attend ses légumes avec une patience qui commence à s'éroder.`, gravite: 1 })
  } catch { /* ignore */ }

  // Check journal
  try {
    const raw = localStorage.getItem(`chipie_journal_${getActiveProfileId()}`)
    const entries: { date: string }[] = raw ? JSON.parse(raw) : []
    const past5 = Array.from({ length: 5 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10) })
    const daysWithEntry = new Set(entries.filter(e => past5.includes(e.date)).map(e => e.date)).size
    if (daysWithEntry <= 1) revendications.push({ id: 'journal', emoji: '📔', titre: 'Journal alimentaire abandonné', detail: `${daysWithEntry === 0 ? 'Aucune' : 'Une seule'} entrée sur les 5 derniers jours. ${nom} se sent statistiquement ignorée.`, gravite: 1 })
  } catch { /* ignore */ }

  // Always add one fun filler if no real issues
  const fillers: Revendication[] = [
    { id: 'aspirateur', emoji: '🌀', titre: 'Utilisation non concertée de l\'aspirateur', detail: `L'aspirateur a été sorti sans avertissement préalable de 48h. ${nom} exige des excuses formelles.`, gravite: 1 },
    { id: 'tapis', emoji: '🟫', titre: 'Restriction d\'accès au tapis du salon', detail: `${nom} a été redirigée lors de son expression artistique sur le tapis. Liberté créatrice bafouée.`, gravite: 1 },
    { id: 'regard', emoji: '👀', titre: 'Regard non consenti pendant la sieste', detail: `Un humain a observé ${nom} dormir pendant plus de 2 minutes. Violation de l'intimité lapinesque.`, gravite: 1 },
    { id: 'câlin-force', emoji: '🤗', titre: 'Câlin non sollicité à 16h37', detail: `${nom} n'avait pas accordé sa permission. Le préavis est déposé pour la forme.`, gravite: 1 },
  ]

  if (revendications.length === 0) {
    // Chipie est satisfaite — pas de grève
    return { enGreve: false, niveau: 0, revendications: [], satisfaites: [] }
  }

  // Always add one filler for flavour
  const seed = new Date().getDate() % fillers.length
  revendications.push(fillers[seed])

  const graviteTotal = revendications.reduce((s, r) => s + r.gravite, 0)
  const niveau: 0 | 1 | 2 | 3 = graviteTotal >= 8 ? 3 : graviteTotal >= 5 ? 2 : 1

  return { enGreve: true, niveau, revendications, satisfaites: loadSatisfaites() }
}

const NIVEAU_CONFIG = {
  0: { label: 'Satisfaite', color: '#27ae60', emoji: '😌', bg: 'rgba(39,174,96,0.1)' },
  1: { label: 'Grève de zèle', color: '#f39c12', emoji: '😤', bg: 'rgba(243,156,18,0.1)' },
  2: { label: 'Grève totale', color: '#e67e22', emoji: '✊', bg: 'rgba(230,126,34,0.1)' },
  3: { label: 'GRÈVE GÉNÉRALE', color: '#e74c3c', emoji: '🔥', bg: 'rgba(231,76,60,0.1)' },
}

export default function GrevePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [satisfaites, setSatisfaites] = useState<string[]>(loadSatisfaites)

  const { enGreve, niveau, revendications } = useMemo(() => buildGreve(profil.nom), [profil.nom])
  const cfg = NIVEAU_CONFIG[niveau]

  const allSatisfied = revendications.every(r => satisfaites.includes(r.id))

  function toggleSatisfaite(id: string) {
    const next = satisfaites.includes(id) ? satisfaites.filter(s => s !== id) : [...satisfaites, id]
    setSatisfaites(next)
    saveSatisfaites(next)
  }

  function resolver() {
    const all = revendications.map(r => r.id)
    setSatisfaites(all)
    saveSatisfaites(all)
  }

  const tauxSatisfaction = revendications.length > 0 ? Math.round((revendications.filter(r => satisfaites.includes(r.id)).length / revendications.length) * 100) : 100

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
        <span className={styles.headerEmoji}>✊</span>
        <div>
          <h1 className={styles.title}>Chipie fait grève</h1>
          <p className={styles.subtitle}>Syndicat Lapinesque Autonome</p>
        </div>
      </div>

      {/* Status banner */}
      <div className={styles.statusBanner} style={{ background: cfg.bg, borderColor: cfg.color }}>
        <span className={styles.statusEmoji}>{cfg.emoji}</span>
        <div className={styles.statusInfo}>
          <p className={styles.statusLevel} style={{ color: cfg.color }}>{cfg.label}</p>
          <p className={styles.statusName}>
            {enGreve
              ? `${profil.nom} a déposé ${revendications.length} revendication${revendications.length > 1 ? 's' : ''}`
              : `${profil.nom} est satisfaite… pour l'instant.`}
          </p>
        </div>
        {enGreve && (
          <div className={styles.statusPct} style={{ color: cfg.color }}>
            <span className={styles.pctNum}>{tauxSatisfaction}%</span>
            <span className={styles.pctLbl}>résolu</span>
          </div>
        )}
      </div>

      {!enGreve ? (
        /* Pas de grève */
        <div className={styles.happyCard}>
          <span className={styles.happyEmoji}>🌿</span>
          <p className={styles.happyTitle}>Aucun préavis en cours</p>
          <p className={styles.happyDesc}>{profil.nom} reconnaît officiellement vos efforts. Ce calme est fragile — ne le gâchez pas.</p>
          <div className={styles.tipsGrid}>
            <div className={styles.tip}>🌾 Foin à jour</div>
            <div className={styles.tip}>💧 Eau fraîche</div>
            <div className={styles.tip}>🥗 Légumes servis</div>
            <div className={styles.tip}>✅ Checklist OK</div>
          </div>
        </div>
      ) : (
        <>
          {/* Préavis officiel */}
          <div className={styles.preavis}>
            <p className={styles.preavisTitle}>⚠️ PRÉAVIS DE GRÈVE OFFICIEL</p>
            <p className={styles.preavisText}>
              Le Syndicat Lapinesque Autonome, représentant les intérêts de <strong>{profil.nom}</strong>, dépose ce jour un préavis de grève au motif des griefs suivants. La direction humaine est invitée à traiter chaque point dans les meilleurs délais.
            </p>
          </div>

          {/* Revendications */}
          <div className={styles.revendications}>
            {revendications.map((r) => {
              const done = satisfaites.includes(r.id)
              return (
                <div key={r.id} className={`${styles.revenCard} ${done ? styles.revenDone : ''}`}>
                  <div className={styles.revenTop}>
                    <span className={styles.revenEmoji}>{r.emoji}</span>
                    <div className={styles.revenInfo}>
                      <p className={styles.revenTitre}>{r.titre}</p>
                      <div className={styles.revenGravite}>
                        {Array.from({ length: r.gravite }).map((_, i) => (
                          <span key={i} className={styles.graviteDot} style={{ background: r.gravite === 3 ? '#e74c3c' : r.gravite === 2 ? '#e67e22' : '#f39c12' }} />
                        ))}
                        <span className={styles.graviteLabel}>{r.gravite === 3 ? 'Critique' : r.gravite === 2 ? 'Urgent' : 'Modéré'}</span>
                      </div>
                    </div>
                    <button
                      className={`${styles.checkBtn} ${done ? styles.checkBtnDone : ''}`}
                      onClick={() => toggleSatisfaite(r.id)}
                    >
                      {done ? '✓' : '○'}
                    </button>
                  </div>
                  <p className={styles.revenDetail}>{r.detail}</p>
                </div>
              )
            })}
          </div>

          {/* Resolution */}
          {allSatisfied ? (
            <div className={styles.resolvedCard}>
              <span className={styles.resolvedEmoji}>🤝</span>
              <p className={styles.resolvedTitle}>Accord trouvé !</p>
              <p className={styles.resolvedDesc}>{profil.nom} lève le mouvement à titre provisoire. Elle reste attentive au respect des engagements pris.</p>
            </div>
          ) : (
            <button className={styles.resolveBtn} onClick={resolver}>
              🤝 Accéder à toutes les revendications
            </button>
          )}
        </>
      )}
    </div>
  )
}

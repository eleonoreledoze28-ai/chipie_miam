import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './ParlementPage.module.css'

function getWeekKey() {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

function storageKey() { return `chipie-parlement-${getActiveProfileId()}` }
interface VotesData { [loi: string]: 'pour' | 'contre' }
function loadVotes(): VotesData { try { const r = localStorage.getItem(storageKey()); return r ? JSON.parse(r) : {} } catch { return {} } }
function saveVotes(v: VotesData) { localStorage.setItem(storageKey(), JSON.stringify(v)) }

interface Loi {
  id: string
  numero: string
  titre: string
  texte: string
  pourPct: number
  emoji: string
}

const TOUTES_LOIS: Omit<Loi, 'pourPct'>[] = [
  { id: 'l01', numero: 'PPL-001', emoji: '🌀', titre: 'Loi anti-aspirateur', texte: 'L\'aspirateur sera rangé dans un local sécurisé, hors de portée de vue et d\'ouïe. Son usage nécessitera un préavis de 48 heures et l\'accord exprès de la partie lapine.' },
  { id: 'l02', numero: 'PPL-002', emoji: '🛋️', titre: 'Nationalisation du canapé', texte: 'Le canapé est déclaré bien public lapinesque. L\'accès humain y est toléré sous réserve de ne pas occuper le coin gauche, propriété exclusive de la partie lapine depuis le 3 mars.' },
  { id: 'l03', numero: 'PPL-003', emoji: '🔕', titre: 'Couvre-feu sonore nocturne', texte: 'Tout bruit humain est interdit entre 21h00 et 08h00. Les violations sont passibles d\'un thumping sourd, répété, jusqu\'à obtention du silence requis.' },
  { id: 'l04', numero: 'PPL-004', emoji: '📱', titre: 'Interdiction des écrans durant les câlins', texte: 'L\'humain posera son téléphone lors de tout contact physique accordé. Le regard doit être fixé sur la partie lapine. Un regard distrait annule immédiatement le câlin en cours.' },
  { id: 'l05', numero: 'PPL-005', emoji: '🌿', titre: 'Pissenlit élevé au rang de légume national', texte: 'Le pissenlit est officiellement désigné légume d\'État. Il sera présent au menu au minimum deux fois par semaine, frais, non flétri, servi avec respect.' },
  { id: 'l06', numero: 'PPL-006', emoji: '🚪', titre: 'Obligation de frapper avant d\'entrer', texte: 'Tout humain souhaitant pénétrer dans le salon devra frapper trois fois et attendre l\'autorisation tacite de la partie lapine. L\'absence de réponse vaut refus.' },
  { id: 'l07', numero: 'PPL-007', emoji: '🥕', titre: 'Charte de la diversité légumière', texte: 'Un minimum de 6 légumes différents sera servi par semaine. La répétition abusive d\'un seul aliment constitue une atteinte à la dignité gustative lapinesque.' },
  { id: 'l08', numero: 'PPL-008', emoji: '🪑', titre: 'Protection du territoire de jeu', texte: 'La zone de déambulation libre sera maintenue dégagée de tout obstacle humain. Les chaussures traînantes sont visées spécifiquement. Avertissement définitif.' },
  { id: 'l09', numero: 'PPL-009', emoji: '⏰', titre: 'Service matinal avant 8h30', texte: 'Le foin sera renouvelé et les légumes servis avant 8h30 chaque matin. Tout retard déclenchera un regard réprobateur d\'une durée proportionnelle au retard.' },
  { id: 'l10', numero: 'PPL-010', emoji: '🎵', titre: 'Réglementation musicale', texte: 'La musique forte est tolérée jusqu\'à 19h. Passé cette heure, seule la musique classique douce est autorisée. Le rap et la techno sont interdits en toutes circonstances.' },
  { id: 'l11', numero: 'PPL-011', emoji: '📸', titre: 'Droit à l\'image lapinesque', texte: 'Toute photographie nécessite l\'accord préalable de la partie lapine. Les photos non consenties seront floues — par la volonté de la partie lapine et non par erreur de mise au point.' },
  { id: 'l12', numero: 'PPL-012', emoji: '🛁', titre: 'Intégrité corporelle absolue', texte: 'Aucun bain, aucun shampoing, aucun soin non consenti ne sera imposé. La partie lapine se nettoie elle-même. C\'est de la science, pas de la négligence.' },
  { id: 'l13', numero: 'PPL-013', emoji: '🗓️', titre: 'Journée nationale du binky', texte: 'Le samedi est déclaré Journée Nationale du Binky. L\'humain s\'engage à documenter tout binky observé et à exprimer son admiration de façon audible et sincère.' },
  { id: 'l14', numero: 'PPL-014', emoji: '🌡️', titre: 'Régulation thermique de l\'appartement', texte: 'La température ne descendra pas en dessous de 18°C ni ne dépassera 22°C. Tout écart sera signalé par une posture d\'étalement ou un grignotage préventif de meuble.' },
  { id: 'l15', numero: 'PPL-015', emoji: '📦', titre: 'Droit au premier examen des sacs', texte: 'Tout sac rapporté du commerce sera posé au sol pendant 3 minutes minimum pour permettre à la partie lapine d\'en faire l\'inspection réglementaire.' },
  { id: 'l16', numero: 'PPL-016', emoji: '🏥', titre: 'Transparence vétérinaire', texte: 'L\'humain s\'engage à ne pas prononcer le mot "vétérinaire" à voix haute avant le départ effectif. L\'élément de surprise est exigé pour limiter le stress préventif.' },
  { id: 'l17', numero: 'PPL-017', emoji: '🌙', titre: 'Protection de la sieste de l\'après-midi', texte: 'Entre 14h et 16h, toute activité humaine bruyante est proscrite. Cette plage horaire est sacrée, protégée par la Constitution Lapinesque de 2024.' },
  { id: 'l18', numero: 'PPL-018', emoji: '🪟', titre: 'Droit à la contemplation de fenêtre', texte: 'Un poste d\'observation sera maintenu accessible en permanence. Aucun meuble, aucun rideau ne pourra obstruer la vue stratégique sur le couloir et la rue.' },
]

function getWeekLois(nom: string): Loi[] {
  const week = getWeekKey()
  const seed = week.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const shuffled = [...TOUTES_LOIS].sort((a, b) => {
    const ha = (seed * a.id.charCodeAt(2)) % 97
    const hb = (seed * b.id.charCodeAt(2)) % 97
    return ha - hb
  })
  return shuffled.slice(0, 3).map((l, i) => ({
    ...l,
    titre: l.titre.replace('{nom}', nom),
    texte: l.texte.replace(/{nom}/g, nom),
    pourPct: [71, 58, 84, 63, 77, 45, 90, 52][((seed + i) % 8)],
  }))
}

function getLoisAdoptees(votes: VotesData, toutes: Loi[]): Loi[] {
  return toutes.filter(l => votes[l.id] === 'pour')
}

export default function ParlementPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [votes, setVotes] = useState<VotesData>(loadVotes)
  const [tab, setTab] = useState<'session' | 'journal'>('session')

  const weekLois = useMemo(() => getWeekLois(profil.nom), [profil.nom])
  const allVotedLois = useMemo(() => TOUTES_LOIS.map(l => ({ ...l, pourPct: 71 })), [])
  const adoptees = getLoisAdoptees(votes, allVotedLois as Loi[])

  const weekStr = (() => {
    const d = new Date()
    return `Session du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
  })()

  function vote(loiId: string, choix: 'pour' | 'contre') {
    const next = { ...votes, [loiId]: choix }
    setVotes(next)
    saveVotes(next)
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

      {/* Header */}
      <div className={styles.parlHeader}>
        <div className={styles.parlLogo}>
          <span className={styles.parlEmoji}>🏛️</span>
          <div>
            <p className={styles.parlName}>PARLEMENT LAPINESQUE</p>
            <p className={styles.parlSub}>Chambre des Représentants de {profil.nom}</p>
          </div>
        </div>
        <p className={styles.parlDate}>{weekStr}</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'session' ? styles.tabActive : ''}`} onClick={() => setTab('session')}>
          🗳️ Session en cours
        </button>
        <button className={`${styles.tab} ${tab === 'journal' ? styles.tabActive : ''}`} onClick={() => setTab('journal')}>
          📜 Journal Officiel {adoptees.length > 0 && <span className={styles.badge}>{adoptees.length}</span>}
        </button>
      </div>

      {tab === 'session' && (
        <>
          <p className={styles.sessionInfo}>
            3 propositions de loi soumises au vote cette semaine. Le résultat de votre vote est enregistré et définitif.
          </p>
          <div className={styles.loisList}>
            {weekLois.map((loi) => {
              const monVote = votes[loi.id]
              const voted = !!monVote
              return (
                <div key={loi.id} className={`${styles.loiCard} ${voted ? styles.loiVoted : ''}`}>
                  <div className={styles.loiHeader}>
                    <span className={styles.loiEmoji}>{loi.emoji}</span>
                    <div>
                      <p className={styles.loiNumero}>{loi.numero}</p>
                      <p className={styles.loiTitre}>{loi.titre}</p>
                    </div>
                    {voted && (
                      <span className={`${styles.loiVoteBadge} ${monVote === 'pour' ? styles.badgePour : styles.badgeContre}`}>
                        {monVote === 'pour' ? '✓ Pour' : '✗ Contre'}
                      </span>
                    )}
                  </div>

                  <p className={styles.loiTexte}>{loi.texte}</p>

                  {voted ? (
                    <div className={styles.resultat}>
                      <div className={styles.barTrack}>
                        <div className={styles.barPour} style={{ width: `${loi.pourPct}%` }} />
                      </div>
                      <div className={styles.barLabels}>
                        <span className={styles.labelPour}>Pour {loi.pourPct}%</span>
                        <span className={styles.labelContre}>Contre {100 - loi.pourPct}%</span>
                      </div>
                      <p className={styles.resultatVerdict}>
                        {loi.pourPct >= 50
                          ? `✅ Adoptée — promulguée par ${profil.nom} en personne`
                          : `❌ Rejetée — ${profil.nom} prend note du manque de soutien`}
                      </p>
                    </div>
                  ) : (
                    <div className={styles.voteActions}>
                      <button className={styles.btnPour} onClick={() => vote(loi.id, 'pour')}>
                        👍 Pour
                      </button>
                      <button className={styles.btnContre} onClick={() => vote(loi.id, 'contre')}>
                        👎 Contre
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'journal' && (
        <div className={styles.journal}>
          <div className={styles.journalHeader}>
            <p className={styles.journalTitle}>JOURNAL OFFICIEL LAPINESQUE</p>
            <p className={styles.journalSub}>République de {profil.nom} — Recueil des lois en vigueur</p>
          </div>

          {adoptees.length === 0 ? (
            <div className={styles.emptyJournal}>
              <span className={styles.emptyEmoji}>📭</span>
              <p className={styles.emptyText}>Aucune loi adoptée pour l'instant.</p>
              <p className={styles.emptySub}>Votez dans la session en cours pour alimenter le Journal Officiel.</p>
            </div>
          ) : (
            <div className={styles.loisAdoptees}>
              {adoptees.map((loi, i) => (
                <div key={loi.id} className={styles.loiAdoptee}>
                  <div className={styles.loiAdopteeHeader}>
                    <span className={styles.loiAdopteeNum}>Art. {String(i + 1).padStart(2, '0')}</span>
                    <span className={styles.loiAdopteeEmoji}>{loi.emoji}</span>
                  </div>
                  <p className={styles.loiAdopteeTitre}>{loi.titre}</p>
                  <p className={styles.loiAdopteeTexte}>{loi.texte}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

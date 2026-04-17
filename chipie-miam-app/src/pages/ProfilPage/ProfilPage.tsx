import { useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { useProfiles } from '../../hooks/useProfiles'
import { useJournal } from '../../hooks/useJournal'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './ProfilPage.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`
const vegetauxMap = new Map(VEGETAUX.map(v => [v.id, v]))
const catMap = new Map(CATEGORIES.map(c => [c.id, c]))

// ── Stickers ──────────────────────────────────────────────────────────────────
interface Sticker { id: string; emoji: string; label: string; desc: string }

const STICKER_DEFS: Sticker[] = [
  { id: 'premiers-repas', emoji: '🌱', label: 'Premiers repas',      desc: '1ère entrée dans le journal' },
  { id: 'cent-repas',     emoji: '🥕', label: '100 repas',           desc: '100 entrées dans le journal' },
  { id: 'sept-jours',     emoji: '📅', label: '7 jours de suite',    desc: 'Journal rempli 7 jours d\'affilée' },
  { id: 'trente-jours',   emoji: '🗓️', label: '30 jours de suivi',  desc: 'Journal rempli sur 30 jours' },
  { id: 'dix-legumes',    emoji: '🌈', label: 'Gourmet',             desc: '10 légumes différents donnés' },
  { id: 'cinquante-leg',  emoji: '👨‍🍳', label: 'Grand chef',        desc: '50 légumes différents donnés' },
  { id: 'anniversaire',   emoji: '🎂', label: 'Joyeux anniversaire', desc: 'Visité l\'app le jour de l\'anniversaire' },
  { id: 'encyclopedie',   emoji: '📖', label: 'Encyclopédiste',      desc: 'Ouvert l\'encyclopédie' },
  { id: 'artiste',        emoji: '✏️', label: 'Artiste',             desc: 'Terminé le dessin guidé' },
  { id: 'voyageur',       emoji: '🌍', label: 'Voyageur des saisons', desc: 'Terminé le Chemin des saisons' },
  { id: 'soignant',       emoji: '🩺', label: 'Soignant',            desc: 'Ajouté un rappel dans le carnet santé' },
  { id: 'expert-quiz',    emoji: '🏆', label: 'Expert Quiz',         desc: 'Score de 100+ pts au Quiz' },
]

function computeUnlocked(
  entries: { vegetalId: string; date: string }[],
  profil: { dateNaissance?: string }
): Set<string> {
  const unlocked = new Set<string>()
  const totalEntries  = entries.length
  const uniqueVeg     = new Set(entries.map(e => e.vegetalId)).size
  const uniqueDays    = new Set(entries.map(e => e.date)).size
  const sortedDates   = [...new Set(entries.map(e => e.date))].sort()

  if (totalEntries >= 1)  unlocked.add('premiers-repas')
  if (totalEntries >= 100) unlocked.add('cent-repas')
  if (uniqueVeg >= 10)    unlocked.add('dix-legumes')
  if (uniqueVeg >= 50)    unlocked.add('cinquante-leg')
  if (uniqueDays >= 30)   unlocked.add('trente-jours')

  // Check 7-day streak
  for (let i = 0; i <= sortedDates.length - 7; i++) {
    let streak = true
    for (let j = 1; j < 7; j++) {
      const prev = new Date(sortedDates[i + j - 1] + 'T00:00:00')
      const curr = new Date(sortedDates[i + j]     + 'T00:00:00')
      const diff = (curr.getTime() - prev.getTime()) / 86400000
      if (diff !== 1) { streak = false; break }
    }
    if (streak) { unlocked.add('sept-jours'); break }
  }

  // Birthday
  if (profil.dateNaissance) {
    const today = new Date()
    const bday  = new Date(profil.dateNaissance + 'T00:00:00')
    if (bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate()) {
      unlocked.add('anniversaire')
    }
  }

  // localStorage flags
  try {
    if (localStorage.getItem('chipie-encyclopedie-visited') === '1') unlocked.add('encyclopedie')
    if (localStorage.getItem('chipie-dessin-done')          === '1') unlocked.add('artiste')
    if (localStorage.getItem('chipie-saisons-done')         === '1') unlocked.add('voyageur')
    const quizBest = parseInt(localStorage.getItem('chipie-quiz-best') || '0', 10)
    if (quizBest >= 100) unlocked.add('expert-quiz')
    // Check carnet santé
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.includes('carnet') && k.includes('reminder')) { unlocked.add('soignant'); break }
    }
  } catch { /* */ }

  return unlocked
}

export default function ProfilPage() {
  const navigate = useNavigate()
  const { profil, updateProfil } = useProfil()
  const { profiles, activeId, switchProfile, addProfile, removeProfile, updateProfileMeta } = useProfiles()
  const { entries } = useJournal()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profil)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const startEdit = () => { setDraft(profil); setEditing(true) }
  const saveEdit = () => {
    updateProfil(draft)
    updateProfileMeta(activeId, { nom: draft.nom, avatar: draft.avatar })
    setEditing(false)
  }
  const cancelEdit = () => setEditing(false)
  const set = (key: keyof typeof draft, value: string) => setDraft(prev => ({ ...prev, [key]: value }))

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = Math.min(img.width, img.height, 200)
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')!
        const sx = (img.width - size) / 2; const sy = (img.height - size) / 2
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size)
        set('avatar', canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleAddProfile = () => { if (newName.trim()) addProfile(newName.trim()) }
  const handleDeleteProfile = () => {
    if (profiles.length <= 1) return
    if (confirm(`Supprimer le profil "${profil.nom}" et toutes ses données ?`)) removeProfile(activeId)
  }

  // ===== Computed stats from journal =====
  const topFoods = useMemo(() => {
    const counts: Record<string, number> = {}
    entries.forEach(e => { counts[e.vegetalId] = (counts[e.vegetalId] || 0) + 1 })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ vegetal: vegetauxMap.get(id), count }))
  }, [entries])

  const catBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    entries.forEach(e => {
      const v = vegetauxMap.get(e.vegetalId)
      if (v) counts[v.categorie] = (counts[v.categorie] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([catId, count]) => ({ cat: catMap.get(catId as never), count }))
  }, [entries])

  const totalUnique = useMemo(() => new Set(entries.map(e => e.vegetalId)).size, [entries])
  const totalDays = useMemo(() => new Set(entries.map(e => e.date)).size, [entries])
  const unlockedStickers = useMemo(() => computeUnlocked(entries, profil), [entries, profil])
  const goToDepenses = useCallback(() => navigate('/depenses'), [navigate])

  const avatarSrc = (editing ? draft.avatar : profil.avatar) || DEFAULT_AVATAR

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      {/* Profile selector */}
      <div className={styles.profileSelector}>
        {profiles.map(p => (
          <button key={p.id}
            className={`${styles.profileChip} ${p.id === activeId ? styles.profileChipActive : ''}`}
            onClick={() => p.id !== activeId && switchProfile(p.id)}>
            <img src={p.avatar || DEFAULT_AVATAR} alt="" className={styles.chipAvatar} />
            <span className={styles.chipName}>{p.nom}</span>
          </button>
        ))}
        <button className={styles.addChip} onClick={() => setShowNewForm(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <path d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {showNewForm && (
        <div className={styles.newForm}>
          <input className={styles.newInput} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom du lapin..." autoFocus />
          <button className={styles.newOk} onClick={handleAddProfile}>Créer</button>
          <button className={styles.newCancel} onClick={() => { setShowNewForm(false); setNewName('') }}>✕</button>
        </div>
      )}

      {/* Avatar */}
      <div className={`${styles.avatar} ${editing ? styles.avatarEditing : ''}`} onClick={editing ? () => fileRef.current?.click() : undefined}>
        <img src={avatarSrc} alt={profil.nom} className={styles.avatarImg} />
        {editing && (
          <div className={styles.avatarOverlay}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className={styles.fileInput} onChange={handleAvatarChange} />
      </div>

      {/* Name & subtitle */}
      {editing ? (
        <>
          <input className={styles.nameInput} value={draft.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Nom" />
          <input className={styles.subtitleInput} value={draft.sousTitre} onChange={(e) => set('sousTitre', e.target.value)} placeholder="Sous-titre" />
        </>
      ) : (
        <>
          <h1 className={styles.name}>{profil.nom}</h1>
          <p className={styles.subtitle}>{profil.sousTitre}</p>
        </>
      )}

      {/* Info grid */}
      <div className={styles.infoGrid}>
        {([
          ['race', 'Race', '🐇'],
          ['couleur', 'Couleur', '🎨'],
          ['age', '\u00c2ge', '\uD83C\uDF82'],
          ['dateNaissance', 'Né(e) le', '📅'],
          ['poids', 'Poids', '⚖️'],
          ['sterilise', 'Stérilisé(e)', '✂️'],
        ] as const).map(([key, label, emoji]) => (
          <div key={key} className={styles.infoCard}>
            <span className={styles.infoEmoji}>{emoji}</span>
            <span className={styles.infoLabel}>{label}</span>
            {editing ? (
              key === 'sterilise' ? (
                <div className={styles.toggleRow}>
                  {['Oui', 'Non'].map(opt => (
                    <button key={opt} className={`${styles.toggleBtn} ${draft.sterilise === opt ? styles.toggleBtnActive : ''}`}
                      onClick={() => set('sterilise', opt)}>{opt}</button>
                  ))}
                </div>
              ) : key === 'dateNaissance' ? (
                <input type="date" className={styles.infoInput} value={draft[key]} onChange={(e) => set(key, e.target.value)} />
              ) : (
                <input className={styles.infoInput} value={draft[key]} onChange={(e) => set(key, e.target.value)} placeholder="\u2014" />
              )
            ) : (
              <span className={styles.infoValue}>{profil[key] || '\u2014'}</span>
            )}
          </div>
        ))}
      </div>

      {/* Veterinaire section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🩺 Vétérinaire</h2>
        {editing ? (
          <div className={styles.vetForm}>
            <input className={styles.vetInput} value={draft.veterinaire} onChange={e => set('veterinaire', e.target.value)} placeholder="Nom du vétérinaire" />
            <input className={styles.vetInput} value={draft.vetTel} onChange={e => set('vetTel', e.target.value)} placeholder="Téléphone" type="tel" />
          </div>
        ) : (
          <div className={styles.vetInfo}>
            {profil.veterinaire ? (
              <>
                <span className={styles.vetName}>{profil.veterinaire}</span>
                {profil.vetTel && <a href={`tel:${profil.vetTel}`} className={styles.vetTel}>📞 {profil.vetTel}</a>}
              </>
            ) : (
              <span className={styles.vetEmpty}>Aucun vétérinaire renseigné</span>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📝 Notes</h2>
        {editing ? (
          <textarea className={styles.notesArea} value={draft.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Allergies, habitudes, infos utiles..." rows={3} />
        ) : (
          <p className={styles.notesText}>{profil.notes || 'Aucune note'}</p>
        )}
      </div>

      {/* Carnet de santé + Dépenses links */}
      {!editing && (
        <div className={styles.quickLinks}>
          <button className={styles.carnetLink} onClick={() => navigate('/carnet-sante')}>
            🩺 Carnet de santé
          </button>
          <button className={styles.carnetLink} onClick={goToDepenses}>
            💰 Carnet de dépenses
          </button>
          <button className={styles.carnetLink} onClick={() => navigate('/anniversaire')}>
            🎂 Anniversaire
          </button>
          <button className={styles.carnetLink} onClick={() => navigate('/carte-identite')}>
            🪪 Carte d'identité
          </button>
          <button className={styles.carnetLink} onClick={() => navigate('/evenements')}>
            📅 Événements
          </button>
        </div>
      )}

      {/* Stickers */}
      {!editing && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🏅 Stickers débloqués</h2>
          <p className={styles.stickersSubtitle}>{unlockedStickers.size} / {STICKER_DEFS.length} débloqués</p>
          <div className={styles.stickersGrid}>
            {STICKER_DEFS.map(s => {
              const on = unlockedStickers.has(s.id)
              return (
                <div key={s.id} className={`${styles.stickerCard} ${on ? styles.stickerOn : styles.stickerOff}`} title={s.desc}>
                  <span className={styles.stickerEmoji}>{s.emoji}</span>
                  <span className={styles.stickerLabel}>{s.label}</span>
                  {!on && <span className={styles.stickerLock}>🔒</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      {editing ? (
        <div className={styles.editActions}>
          <button className={styles.cancelBtn} onClick={cancelEdit}>Annuler</button>
          <button className={styles.saveBtn} onClick={saveEdit}>Enregistrer</button>
        </div>
      ) : (
        <div className={styles.editActions}>
          <button className={styles.editBtn} onClick={startEdit}>Modifier le profil</button>
          {profiles.length > 1 && (
            <button className={styles.deleteProfileBtn} onClick={handleDeleteProfile}>Supprimer ce profil</button>
          )}
        </div>
      )}

      {/* ===== Preferences alimentaires (from journal) ===== */}
      {entries.length > 0 && !editing && (
        <>
          {/* Mini stats */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>📊 Résumé alimentaire</h2>
            <div className={styles.miniStats}>
              <div className={styles.miniStat}>
                <span className={styles.miniStatNum}>{entries.length}</span>
                <span className={styles.miniStatLabel}>repas</span>
              </div>
              <div className={styles.miniStatDivider} />
              <div className={styles.miniStat}>
                <span className={styles.miniStatNum}>{totalUnique}</span>
                <span className={styles.miniStatLabel}>aliments</span>
              </div>
              <div className={styles.miniStatDivider} />
              <div className={styles.miniStat}>
                <span className={styles.miniStatNum}>{totalDays}</span>
                <span className={styles.miniStatLabel}>jours</span>
              </div>
              <div className={styles.miniStatDivider} />
              <div className={styles.miniStat}>
                <span className={styles.miniStatNum}>{catBreakdown.length}</span>
                <span className={styles.miniStatLabel}>catégories</span>
              </div>
            </div>
          </div>

          {/* Top aliments preferes */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>❤️ Aliments préférés</h2>
            <div className={styles.topList}>
              {topFoods.map(({ vegetal, count }, i) => {
                if (!vegetal) return null
                return (
                  <div key={vegetal.id} className={styles.topItem}>
                    <span className={styles.topRank}>#{i + 1}</span>
                    <img src={assetUrl(vegetal.image)} alt="" className={styles.topImg} />
                    <div className={styles.topInfo}>
                      <span className={styles.topName}>{vegetal.nom}</span>
                      <span className={styles.topCat}>{catMap.get(vegetal.categorie as never)?.emoji} {catMap.get(vegetal.categorie as never)?.nom}</span>
                    </div>
                    <span className={styles.topCount}>{count}x</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Categories pie (simplified as bars) */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>🌈 Catégories données</h2>
            <div className={styles.catBars}>
              {catBreakdown.map(({ cat: c, count }) => {
                if (!c) return null
                const maxC = catBreakdown[0]?.count || 1
                return (
                  <div key={c.id} className={styles.catRow}>
                    <span className={styles.catLabel}>{c.emoji} {c.nom}</span>
                    <div className={styles.catTrack}>
                      <div className={styles.catFill} style={{ width: `${(count / maxC) * 100}%` }} />
                    </div>
                    <span className={styles.catCount}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

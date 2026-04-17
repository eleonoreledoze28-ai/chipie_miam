import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { VEGETAUX } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './DocumentairePage.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

function todayStr() { return new Date().toISOString().slice(0, 10) }

function getTimeDesc(): string {
  const h = new Date().getHours()
  if (h < 7)  return 'aux premières lueurs de l\'aube'
  if (h < 12) return 'en ce paisible matin'
  if (h < 15) return 'en ce calme début d\'après-midi'
  if (h < 19) return 'au cœur de l\'après-midi'
  if (h < 22) return 'à l\'heure du crépuscule'
  return 'en cette nuit silencieuse'
}

function getSeason(): string {
  const m = new Date().getMonth()
  if (m >= 2 && m <= 4) return 'printanier'
  if (m >= 5 && m <= 7) return 'estival'
  if (m >= 8 && m <= 10) return 'automnal'
  return 'hivernal'
}

interface SceneData {
  nom: string
  race: string
  poids: string
  topVeg: string
  totalToday: number
  checkedItems: string[]
}

function buildScenes(d: SceneData): { icon: string; titre: string; texte: string }[] {
  const raceDesc = d.race ? `${d.race}` : 'aux origines mystérieuses'
  const poidsDesc = d.poids ? `pesant exactement ${d.poids} kilogrammes` : 'dont le poids reste un sujet délicat'
  const timeDesc = getTimeDesc()
  const season = getSeason()

  return [
    {
      icon: '🎬',
      titre: 'Introduction',
      texte: `Dans cet appartement au cadre ${season}, vit un spécimen fascinant de l'ordre des Lagomorpha. Son nom : ${d.nom}. Sa race : ${raceDesc}. Sa particularité : ${poidsDesc}. Observateurs, restez silencieux. Nous allons perturber le moins possible son quotidien… extraordinaire.`,
    },
    {
      icon: '🌍',
      titre: 'Le territoire',
      texte: `${timeDesc}, ${d.nom} procède à l'inspection méticuleuse de son domaine. Chaque centimètre est reniflé, évalué, validé. La gamelle ? En ordre. Le foin ? ${d.checkedItems.includes('foin') ? 'Renouvelé ce matin — un soulagement visible se lit sur son museau.' : 'Légèrement insuffisant. Un thumping sourd avertit les habitants de la maisonnée.'} Le territoire est, pour l'instant, sous contrôle.`,
    },
    {
      icon: '🥕',
      titre: 'Le rituel du repas',
      texte: `L'heure du repas est un moment d'une solennité particulière. ${d.totalToday > 0 ? `Ce jour, ${d.totalToday} portion${d.totalToday > 1 ? 's' : ''} ${d.totalToday > 1 ? 'ont été' : 'a été'} servie${d.totalToday > 1 ? 's' : ''} avec soin.` : `Hélas, aucune portion n'a encore été présentée. ${d.nom} attend. En silence. Avec cette patience digne des grandes espèces.`} ${d.topVeg ? `Le ${d.topVeg} semble avoir les faveurs du moment — il est approché, reniflé longuement, puis dévoré avec une passion à peine dissimulée.` : `Chaque légume est accueilli comme une invitation diplomatique : acceptée ou déclinée selon l'humeur du jour.`}`,
    },
    {
      icon: '😴',
      titre: 'La sieste sacrée',
      texte: `Après l'effort, le repos. ${d.nom} adopte la position caractéristique dite du "lapin fondu" : corps allongé, pattes arrière étirées, oreilles relâchées. Les scientifiques appellent ça la "position de confiance totale". En clair : ${d.nom} est parfaitement heureux/heureuse. Ou profondément inconscient(e). Les deux hypothèses coexistent.`,
    },
    {
      icon: '🌙',
      titre: 'L\'heure mystérieuse',
      texte: `Mais à la tombée du jour, quelque chose se passe. ${d.nom} se lève d'un bond, court trois fois en cercle sans raison apparente, puis s'arrête net. Un binky ? Une vision ? Un message codé à destination d'autres lapins à travers le monde ? Nous ne le saurons jamais. ${d.nom} regarde le mur. Le mur ne répond pas. La nuit peut commencer.`,
    },
    {
      icon: '🎤',
      titre: 'Épilogue',
      texte: `Dans cet appartement, comme dans tant d'autres, la vie d'un lapin est une symphonie de petits rituels, de regards expressifs, et de coups de patte imprévus. ${d.nom} ne demande pas grand chose : du foin frais, de l'eau claire, quelques légumes bien choisis — et votre présence, même silencieuse. Car au fond, les lapins savent très bien que nous leur appartenons. Pas l'inverse.`,
    },
  ]
}

export default function DocumentairePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [sceneIndex, setSceneIndex] = useState(0)
  const [finished, setFinished] = useState(false)

  const avatarSrc = profil.avatar ? assetUrl(profil.avatar) : DEFAULT_AVATAR

  const sceneData = useMemo((): SceneData => {
    const today = todayStr()
    let entries: { date: string; vegetalId: string }[] = []
    try {
      const raw = localStorage.getItem(`chipie_journal_${getActiveProfileId()}`)
      if (raw) entries = JSON.parse(raw)
    } catch { /* ignore */ }
    const todayEntries = entries.filter(e => e.date === today)

    const counts: Record<string, number> = {}
    todayEntries.forEach(e => { counts[e.vegetalId] = (counts[e.vegetalId] || 0) + 1 })
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topVeg = topId ? (VEGETAUX.find(v => v.id === topId)?.nom ?? '') : ''

    let checkedItems: string[] = []
    try {
      const raw = localStorage.getItem(`chipie-checklist-${today}`)
      if (raw) checkedItems = JSON.parse(raw)
    } catch { /* ignore */ }

    return {
      nom: profil.nom,
      race: profil.race,
      poids: profil.poids,
      topVeg,
      totalToday: todayEntries.length,
      checkedItems,
    }
  }, [profil.nom, profil.race, profil.poids])

  const scenes = useMemo(() => buildScenes(sceneData), [sceneData])

  const next = useCallback(() => {
    if (sceneIndex < scenes.length - 1) setSceneIndex(i => i + 1)
    else setFinished(true)
  }, [sceneIndex, scenes.length])

  const restart = useCallback(() => { setSceneIndex(0); setFinished(false) }, [])

  const scene = scenes[sceneIndex]

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
        <span className={styles.headerEmoji}>🎙️</span>
        <div>
          <h1 className={styles.title}>Documentaire</h1>
          <p className={styles.subtitle}>La vie extraordinaire de {profil.nom}</p>
        </div>
      </div>

      {!finished ? (
        <>
          {/* Progress dots */}
          <div className={styles.dots}>
            {scenes.map((_, i) => (
              <div key={i} className={`${styles.dot} ${i === sceneIndex ? styles.dotActive : i < sceneIndex ? styles.dotDone : ''}`} />
            ))}
          </div>

          {/* Scene card */}
          <div className={styles.sceneCard} key={sceneIndex}>
            <div className={styles.sceneTop}>
              <span className={styles.sceneIcon}>{scene.icon}</span>
              <div>
                <p className={styles.sceneNum}>Scène {sceneIndex + 1} / {scenes.length}</p>
                <h2 className={styles.sceneTitle}>{scene.titre}</h2>
              </div>
            </div>

            <div className={styles.avatarRow}>
              <img src={avatarSrc} alt={profil.nom} className={styles.avatar} />
              <div className={styles.quote}>
                <p className={styles.sceneText}>{scene.texte}</p>
              </div>
            </div>
          </div>

          <button className={styles.nextBtn} onClick={next}>
            {sceneIndex < scenes.length - 1 ? '▶ Scène suivante' : '🎬 Voir la fin'}
          </button>
        </>
      ) : (
        <div className={styles.endCard}>
          <span className={styles.endEmoji}>🏅</span>
          <h2 className={styles.endTitle}>Fin du documentaire</h2>
          <img src={avatarSrc} alt={profil.nom} className={styles.endAvatar} />
          <p className={styles.endText}>
            Merci d'avoir regardé <em>"{profil.nom} — Une vie de lapin"</em>.
            Produit par Chipie Miam Productions. Aucun légume n'a été maltraité lors du tournage.
          </p>
          <button className={styles.restartBtn} onClick={restart}>🔄 Revoir depuis le début</button>
        </div>
      )}
    </div>
  )
}

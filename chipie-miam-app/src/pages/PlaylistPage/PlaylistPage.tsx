import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './PlaylistPage.module.css'

function todayStr() { return new Date().toISOString().slice(0, 10) }

interface Track { titre: string; artiste: string; duree: string }
interface Playlist {
  titreAlbum: string
  genre: string
  mood: string
  albumEmoji: string
  couleur: string
  tracks: Track[]
  description: string
}

const TRACK_POOLS: Record<string, Track[]> = {
  matin: [
    { titre: 'Lever du Foin (version acoustique)', artiste: 'Chipie & les Herbes Folles', duree: '3:14' },
    { titre: 'Inspection du Territoire à l\'Aube', artiste: 'Chipie', duree: '2:47' },
    { titre: 'Regard Fixe sur l\'Humain Endormi', artiste: 'Chipie feat. Le Silence', duree: '4:02' },
    { titre: 'Binky Surprise à 6h47', artiste: 'Chipie', duree: '0:23' },
    { titre: 'Étirements Stratégiques (Intro)', artiste: 'Chipie & Foin Orchestra', duree: '2:11' },
    { titre: 'Attente du Service Matinal', artiste: 'Chipie', duree: '7:33' },
  ],
  actif: [
    { titre: 'Mastication Lente en Sol Mineur', artiste: 'Chipie', duree: '3:58' },
    { titre: 'Thumping Discret pour Réveiller les Consciences', artiste: 'Chipie feat. Le Parquet', duree: '2:02' },
    { titre: 'Contemplation du Mur (Extended Version)', artiste: 'Chipie', duree: '12:44' },
    { titre: 'Course Zoom Zoom Interrompue', artiste: 'Chipie & Le Couloir', duree: '1:07' },
    { titre: 'Méditation Devant le Réfrigérateur', artiste: 'Chipie', duree: '5:20' },
    { titre: 'Grignotage Préventif de Meuble', artiste: 'Chipie ft. Pied de Chaise', duree: '3:45' },
  ],
  sieste: [
    { titre: 'Plongée dans le Foin (Ambient Mix)', artiste: 'Chipie', duree: '8:16' },
    { titre: 'Ne Pas Déranger (feat. Couvre-feu)', artiste: 'Chipie', duree: '6:30' },
    { titre: 'Rêve de Prairies Infinies', artiste: 'Chipie & L\'Inconscient Lapinesque', duree: '11:02' },
    { titre: 'Sieste Interrompue par une Présence Humaine', artiste: 'Chipie', duree: '2:03' },
    { titre: 'Retour au Sommeil (Reprise)', artiste: 'Chipie', duree: '9:47' },
    { titre: 'Chaleur du Soleil sur la Fourrure', artiste: 'Chipie feat. Fenêtre Sud', duree: '7:14' },
  ],
  soir: [
    { titre: 'Coucher de Soleil sur la Gamelle', artiste: 'Chipie', duree: '4:23' },
    { titre: 'Retour du Pissenlit (Reprise)', artiste: 'Chipie', duree: '3:11' },
    { titre: 'Câlin Toléré (Durée Limitée)', artiste: 'Chipie ft. L\'Humain', duree: '0:12' },
    { titre: 'Bouderie Post-Légumes Insuffisants', artiste: 'Chipie', duree: '5:59' },
    { titre: 'Patrouille Nocturne du Couloir', artiste: 'Chipie & Les Ombres', duree: '4:48' },
    { titre: 'Thumping Préventif pour le Lendemain', artiste: 'Chipie', duree: '1:30' },
  ],
  nuit: [
    { titre: 'Couvre-feu Acoustique n°3', artiste: 'Chipie', duree: '6:02' },
    { titre: 'Activité Mystérieuse à 3h du Matin', artiste: 'Chipie (anon.)', duree: '???:??'},
    { titre: 'Surveillance du Couloir (Nuit)', artiste: 'Chipie feat. L\'Obscurité', duree: '4:17' },
    { titre: 'Bruit Inexpliqué (Ce N\'était Pas Moi)', artiste: 'Chipie', duree: '0:07' },
    { titre: 'Préparation Mentale du Lendemain', artiste: 'Chipie', duree: '3:33' },
    { titre: 'Le Grand Silence Lapinesque', artiste: 'Chipie & Le Cosmos', duree: '∞' },
  ],
}

const PLAYLISTS_BY_HOUR: Record<string, Omit<Playlist, 'tracks'>> = {
  matin:  { titreAlbum: 'Morning Binky Sessions', genre: 'Wake-up Foin-core', mood: 'Éveillé·e et légèrement suspicieux·se', albumEmoji: '🌅', couleur: '#f0a53a', description: 'Pour démarrer la journée avec l\'énergie d\'un lapin qui a bien dormi et qui attend son foin.' },
  actif:  { titreAlbum: 'Productivité Lapinesque', genre: 'Post-binky Ambiant', mood: 'Actif·ve et légèrement territorial·e', albumEmoji: '⚡', couleur: '#a855f7', description: 'La playlist idéale pour grignoter, inspecter, et gérer ses affaires avec efficacité.' },
  sieste: { titreAlbum: 'Deep Siesta Vol. III', genre: 'Ambient Sieste Profonde', mood: 'Somnolent·e et intouchable', albumEmoji: '💤', couleur: '#3b82f6', description: 'Interdit de bruit. Cette playlist est protégée par la Constitution Lapinesque de 2024.' },
  soir:   { titreAlbum: 'Soir de Gamelle', genre: 'Post-repas Contemplatif', mood: 'Repu·e et philosophe', albumEmoji: '🌙', couleur: '#22c55e', description: 'Pour digérer en paix et réfléchir au sens profond de l\'existence lapinesque.' },
  nuit:   { titreAlbum: 'Nocturnes Suspects', genre: 'Couvre-feu Wave', mood: 'Mystérieux·se et insaisissable', albumEmoji: '🌑', couleur: '#64748b', description: 'Ce que Chipie écoute la nuit. Ne pose pas de questions. Tu ne veux pas savoir.' },
}

function getMoment(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 10) return 'matin'
  if (h >= 10 && h < 14) return 'actif'
  if (h >= 14 && h < 17) return 'sieste'
  if (h >= 17 && h < 21) return 'soir'
  return 'nuit'
}

function buildPlaylist(nom: string): Playlist {
  const moment = getMoment()
  const meta = PLAYLISTS_BY_HOUR[moment]
  const baseTracks = TRACK_POOLS[moment]

  // Add data-driven bonus tracks
  const bonusTracks: Track[] = []
  try {
    const raw = localStorage.getItem(`chipie_journal_${getActiveProfileId()}`)
    const entries: { date: string }[] = raw ? JSON.parse(raw) : []
    if (entries.filter(e => e.date === todayStr()).length >= 3) {
      bonusTracks.push({ titre: `Festin de ${nom} (Live Recording)`, artiste: 'Chipie feat. La Gamelle', duree: '4:44' })
    }
  } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem(`chipie-foin-${getActiveProfileId()}`)
    if (raw) {
      const total = JSON.parse(raw).reduce((s: number, a: { kg: number }) => s + a.kg * 1000, 0)
      if (total < 400) bonusTracks.push({ titre: 'Urgence Alimentaire en Ré Bémol', artiste: 'Chipie (en colère)', duree: '2:22' })
      else bonusTracks.push({ titre: 'Abondance du Foin (Satisfaction Mix)', artiste: 'Chipie', duree: '3:03' })
    }
  } catch { /* ignore */ }

  const seed = new Date().getDate()
  const shuffled = [...baseTracks].sort((a, b) => {
    const ha = (seed * a.titre.charCodeAt(0)) % 97
    const hb = (seed * b.titre.charCodeAt(0)) % 97
    return ha - hb
  })

  return {
    ...meta,
    tracks: [...shuffled.slice(0, 4), ...bonusTracks],
    titreAlbum: meta.titreAlbum.replace('{nom}', nom),
  }
}

export default function PlaylistPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [playing, setPlaying] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const playlist = useMemo(() => buildPlaylist(profil.nom), [profil.nom])

  useEffect(() => {
    if (playing !== null) {
      setProgress(0)
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(intervalRef.current!)
            setPlaying(null)
            return 0
          }
          return p + 0.8
        })
      }, 80)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing])

  function togglePlay(i: number) {
    if (playing === i) { setPlaying(null); setProgress(0) }
    else setPlaying(i)
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

      {/* Album header */}
      <div className={styles.albumHeader} style={{ background: `linear-gradient(160deg, ${playlist.couleur}22, transparent)` }}>
        <div className={styles.albumArt} style={{ background: `linear-gradient(135deg, ${playlist.couleur}66, ${playlist.couleur}22)`, borderColor: `${playlist.couleur}44` }}>
          <span className={styles.albumEmoji}>{playlist.albumEmoji}</span>
          <span className={styles.nowPlayingDot} style={{ background: playlist.couleur }} />
        </div>
        <div className={styles.albumInfo}>
          <p className={styles.albumLabel}>PLAYLIST DU JOUR</p>
          <h1 className={styles.albumTitle}>{playlist.titreAlbum}</h1>
          <p className={styles.albumArtist}>{profil.nom} · Curator officielle</p>
          <span className={styles.genreBadge} style={{ background: `${playlist.couleur}22`, color: playlist.couleur, borderColor: `${playlist.couleur}44` }}>
            {playlist.genre}
          </span>
        </div>
      </div>

      {/* Mood */}
      <div className={styles.moodBanner}>
        <span className={styles.moodEmoji}>🎭</span>
        <div>
          <p className={styles.moodLabel}>HUMEUR DU MOMENT</p>
          <p className={styles.moodText}>{playlist.mood}</p>
        </div>
      </div>

      <p className={styles.description}>{playlist.description}</p>

      {/* Track list */}
      <div className={styles.trackList}>
        {playlist.tracks.map((track, i) => {
          const isPlaying = playing === i
          return (
            <div key={i} className={`${styles.trackRow} ${isPlaying ? styles.trackActive : ''}`} onClick={() => togglePlay(i)}>
              <div className={styles.trackNum}>
                {isPlaying
                  ? <span className={styles.playingBars}><span /><span /><span /></span>
                  : <span className={styles.numText}>{i + 1}</span>
                }
              </div>
              <div className={styles.trackInfo}>
                <p className={styles.trackTitle} style={isPlaying ? { color: playlist.couleur } : {}}>{track.titre}</p>
                <p className={styles.trackArtiste}>{track.artiste}</p>
                {isPlaying && (
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progress}%`, background: playlist.couleur }} />
                  </div>
                )}
              </div>
              <span className={styles.trackDuree}>{isPlaying ? `${Math.floor(progress / 100 * 3)}:${String(Math.floor((progress / 100 * 60) % 60)).padStart(2, '0')}` : track.duree}</span>
            </div>
          )
        })}
      </div>

      {/* Genre explorer */}
      <div className={styles.genres}>
        <p className={styles.genresTitle}>Autres genres lapinesques</p>
        <div className={styles.genresList}>
          {['Foin-core Ambiant', 'Tapis Destruction Wave', 'Mélancolie de Gamelle', 'Jazz Post-Binky', 'Indie Cécotrophe', 'Shoegaze Lapinesque'].map((g, i) => (
            <span key={i} className={styles.genreTag}>{g}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

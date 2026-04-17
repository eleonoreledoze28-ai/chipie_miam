import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import styles from './CartePostalePage.module.css'

function getWeekNumber(): number {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7)
}

interface Destination {
  pays: string
  flag: string
  bg: string
  sceneEmoji: string
  message: string
  note: number
  tampon: string
  dateVisite: string
}

const DESTINATIONS: Destination[] = [
  { pays: 'Japon', flag: '🇯🇵', bg: 'linear-gradient(135deg, #ff6b6b, #feca57)', sceneEmoji: '⛩️', message: 'Le wasabi est un légume raté. Les toilettes sont trop compliquées. Le foin est introuvable dans un rayon de 3 km. Les chats sont célébrés ici — situation à surveiller.', note: 2, tampon: 'TOKYO', dateVisite: '14 AVR' },
  { pays: 'Suisse', flag: '🇨🇭', bg: 'linear-gradient(135deg, #a8edea, #fed6e3)', sceneEmoji: '🏔️', message: 'Tout est propre. Tout est silencieux. Le foin est trié par taille et senteur. Les humains disent "pardon" avant d\'approcher. C\'est exactement ce que je veux dans ma vie.', note: 9, tampon: 'BERNE', dateVisite: '21 AVR' },
  { pays: 'Australie', flag: '🇦🇺', bg: 'linear-gradient(135deg, #f7971e, #ffd200)', sceneEmoji: '🦘', message: 'Les kangourous me regardent bizarrement. Je les regarde aussi. Personne ne cède. Duel de 40 minutes. Match nul. Le soleil est trop enthousiaste.', note: 4, tampon: 'SYDNEY', dateVisite: '28 AVR' },
  { pays: 'Canada', flag: '🇨🇦', bg: 'linear-gradient(135deg, #c94b4b, #4b134f)', sceneEmoji: '🍁', message: 'Les érables sont là. Le foin aussi. Les gens disent "sorry" quand je les regarde fixement. C\'est une civilisation correcte. Je note pour référence future.', note: 7, tampon: 'MONTRÉAL', dateVisite: '5 MAI' },
  { pays: 'Islande', flag: '🇮🇸', bg: 'linear-gradient(135deg, #0f2027, #203a43)', sceneEmoji: '🌋', message: 'Trop froid. Trop blanc. Les volcans sont bruyants et ne servent à rien sur le plan alimentaire. Les aurores boréales sont jolies mais incomestibles.', note: 3, tampon: 'REYKJAVIK', dateVisite: '12 MAI' },
  { pays: 'Portugal', flag: '🇵🇹', bg: 'linear-gradient(135deg, #11998e, #38ef7d)', sceneEmoji: '🏖️', message: 'Le soleil est acceptable. Les azulejos sont beaux mais froids sous les pattes. Le foin local a un parfum subtil et légèrement agreste. Je valide.', note: 7, tampon: 'LISBONNE', dateVisite: '19 MAI' },
  { pays: 'Maroc', flag: '🇲🇦', bg: 'linear-gradient(135deg, #e96c1b, #c0392b)', sceneEmoji: '🕌', message: 'Les souks sentent la menthe fraîche. J\'ai failli acheter. J\'ai résisté. Presque. Les couleurs me stressent légèrement. La coriandre est omniprésente. Je signale.', note: 6, tampon: 'MARRAKECH', dateVisite: '26 MAI' },
  { pays: 'Norvège', flag: '🇳🇴', bg: 'linear-gradient(135deg, #1a1a2e, #16213e)', sceneEmoji: '🏔️', message: 'Les fjords sont majestueux mais incomestibles. Les Norvégiens sont silencieux. Je les respecte profondément. Le foin est de qualité nordique — c\'est un compliment.', note: 7, tampon: 'OSLO', dateVisite: '2 JUIN' },
  { pays: 'Italie', flag: '🇮🇹', bg: 'linear-gradient(135deg, #56ab2f, #a8e063)', sceneEmoji: '🏛️', message: 'Les Italiens gesticulent. J\'ai mimé "foin" avec les mains pendant 20 minutes dans une épicerie. Échec total. Les pâtes sont décoratives et sans intérêt pour moi.', note: 3, tampon: 'ROME', dateVisite: '9 JUIN' },
  { pays: 'Nouvelle-Zélande', flag: '🇳🇿', bg: 'linear-gradient(135deg, #0ba360, #3cba92)', sceneEmoji: '🌿', message: 'Les moutons sont partout. Je me sens relativement bien représentée dans le paysage. Le foin est local et de qualité irréprochable. C\'est mon pays préféré à ce jour.', note: 9, tampon: 'WELLINGTON', dateVisite: '16 JUIN' },
  { pays: 'Mexique', flag: '🇲🇽', bg: 'linear-gradient(135deg, #f7971e, #e74c3c)', sceneEmoji: '🌵', message: 'Le cactus est un légume acceptable en dernier recours selon mes propres standards évolutifs. Les pyramides sont impressionnantes mais difficiles à grignoter.', note: 5, tampon: 'OAXACA', dateVisite: '23 JUIN' },
  { pays: 'Écosse', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', bg: 'linear-gradient(135deg, #2c3e50, #3498db)', sceneEmoji: '🏰', message: 'Il pleut. Le foin est humide. Les châteaux sont courants d\'air. Mais les Écossais ne touchent pas mes oreilles sans autorisation. Je note ce détail culturel précieux.', note: 6, tampon: 'EDINBURGH', dateVisite: '30 JUIN' },
  { pays: 'Grèce', flag: '🇬🇷', bg: 'linear-gradient(135deg, #3a7bd5, #3a6073)', sceneEmoji: '🏛️', message: 'Les ruines sont impressionnantes. J\'en ai vu de pires (le tapis du couloir). Les olives sont correctes. La mer est bleue et formellement incomestible.', note: 6, tampon: 'ATHÈNES', dateVisite: '7 JUIL' },
  { pays: 'Inde', flag: '🇮🇳', bg: 'linear-gradient(135deg, #f7971e, #e74c3c)', sceneEmoji: '🕌', message: 'Les couleurs me déstabilisent légèrement. La coriandre est envahissante — je l\'avais signalé au Maroc, le problème est manifestement mondial. Le curry m\'intéresse en théorie.', note: 5, tampon: 'JAIPUR', dateVisite: '14 JUIL' },
  { pays: 'Égypte', flag: '🇪🇬', bg: 'linear-gradient(135deg, #c79a00, #8b6900)', sceneEmoji: '🐪', message: 'Les pyramides sont respectables. Les chameaux sont condescendants — je les comprends. Les chats sont vénérés ici. Situation à surveiller de très près.', note: 5, tampon: 'LOUXOR', dateVisite: '21 JUIL' },
  { pays: 'Brésil', flag: '🇧🇷', bg: 'linear-gradient(135deg, #11998e, #38ef7d)', sceneEmoji: '🌴', message: 'Trop chaud. Trop de bruit. Les forêts sont magnifiques mais il manque un distributeur de foin dans un rayon de 200 km. La samba est perturbante pour la sieste.', note: 4, tampon: 'SALVADOR', dateVisite: '28 JUIL' },
  { pays: 'Thaïlande', flag: '🇹🇭', bg: 'linear-gradient(135deg, #f953c6, #b91d73)', sceneEmoji: '🛕', message: 'Les temples sont d\'un calme appréciable. La chaleur moins. Une grenouille m\'a regardée fixement pendant 7 minutes. J\'ai gagné le concours. Comme toujours.', note: 6, tampon: 'CHIANG MAI', dateVisite: '4 AOÛT' },
  { pays: 'Argentine', flag: '🇦🇷', bg: 'linear-gradient(135deg, #74b9ff, #0984e3)', sceneEmoji: '🥩', message: 'Le tango m\'intéresse dans l\'idée mais pas dans les faits. Le bœuf est omniprésent et irrespectueux envers mon mode de vie. Les pampas ont du foin. C\'est tout.', note: 4, tampon: 'MENDOZA', dateVisite: '11 AOÛT' },
  { pays: 'Chine', flag: '🇨🇳', bg: 'linear-gradient(135deg, #e74c3c, #c0392b)', sceneEmoji: '🐉', message: 'La Grande Muraille est longue. J\'ai évalué sa pertinence comme zone de déambulation lapinesque. Elle est acceptable. Les pandas me regardent avec sympathie. C\'est nouveau.', note: 7, tampon: 'GUILIN', dateVisite: '18 AOÛT' },
  { pays: 'Kenya', flag: '🇰🇪', bg: 'linear-gradient(135deg, #f09819, #edde5d)', sceneEmoji: '🦁', message: 'Les lions m\'ont regardée. Je les ai regardés. Ils ont détourné les yeux en premier. Victoire. Les savanes ont du foin à perte de vue. Je n\'en reviens toujours pas.', note: 8, tampon: 'NAIROBI', dateVisite: '25 AOÛT' },
]

export default function CartePostalePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [flipped, setFlipped] = useState(false)

  const destination = useMemo(() => {
    const week = getWeekNumber()
    return DESTINATIONS[week % DESTINATIONS.length]
  }, [])

  const noteStars = Array.from({ length: 10 }, (_, i) => i < destination.note ? '★' : '☆').join('')
  const noteLabel = destination.note >= 8 ? 'Recommandé fortement' : destination.note >= 6 ? 'Acceptable' : destination.note >= 4 ? 'Mitigé' : 'Déconseillé'

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
        <span className={styles.headerEmoji}>✈️</span>
        <div>
          <h1 className={styles.title}>Carte postale de {profil.nom}</h1>
          <p className={styles.subtitle}>Destination de la semaine</p>
        </div>
      </div>

      {/* Postcard flip */}
      <div className={styles.cardScene} onClick={() => setFlipped(f => !f)}>
        <div className={`${styles.card} ${flipped ? styles.cardFlipped : ''}`}>

          {/* Front — photo side */}
          <div className={styles.cardFront}>
            <div className={styles.photo} style={{ background: destination.bg }}>
              <span className={styles.photoEmoji}>{destination.sceneEmoji}</span>
              <span className={styles.photoFlag}>{destination.flag}</span>
              <div className={styles.photoPays}>{destination.pays}</div>
            </div>
            <div className={styles.frontBottom}>
              <p className={styles.tapHint}>Retourner →</p>
              <p className={styles.paysLabel}>{destination.flag} {destination.pays}</p>
            </div>
          </div>

          {/* Back — message side */}
          <div className={styles.cardBack}>
            <div className={styles.backLeft}>
              <p className={styles.backTo}>À l'attention de :</p>
              <p className={styles.backName}>{profil.nom}</p>
              <p className={styles.backAddr}>Son territoire habituel</p>
              <div className={styles.divider} />
              <p className={styles.backMessage}>« {destination.message} »</p>
              <div className={styles.backNote}>
                <span className={styles.noteStars}>{noteStars}</span>
                <span className={styles.noteLabel}>{destination.note}/10 — {noteLabel}</span>
              </div>
            </div>
            <div className={styles.backRight}>
              <div className={styles.stamp}>
                <span className={styles.stampEmoji}>{destination.sceneEmoji}</span>
                <span className={styles.stampPays}>{destination.pays.toUpperCase()}</span>
              </div>
              <div className={styles.tampon}>
                <p className={styles.tamponLine}>{destination.tampon}</p>
                <p className={styles.tamponDate}>{destination.dateVisite} {new Date().getFullYear()}</p>
              </div>
              <p className={styles.backTap}>← Retourner</p>
            </div>
          </div>

        </div>
      </div>

      {/* Next destination teaser */}
      <div className={styles.nextCard}>
        <span className={styles.nextEmoji}>🗺️</span>
        <div>
          <p className={styles.nextTitle}>Prochaine destination</p>
          <p className={styles.nextSub}>
            {DESTINATIONS[(getWeekNumber() + 1) % DESTINATIONS.length].flag}{' '}
            {DESTINATIONS[(getWeekNumber() + 1) % DESTINATIONS.length].pays} — disponible dans{' '}
            {7 - new Date().getDay() === 0 ? 7 : 7 - new Date().getDay()} jour{(7 - new Date().getDay()) > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Collection */}
      <div className={styles.collection}>
        <p className={styles.collectionTitle}>Collection de timbres</p>
        <div className={styles.stampsGrid}>
          {DESTINATIONS.slice(0, 10).map((d, i) => (
            <div key={i} className={`${styles.stampMini} ${i === getWeekNumber() % DESTINATIONS.length ? styles.stampActive : i < getWeekNumber() % DESTINATIONS.length ? styles.stampVisited : styles.stampLocked}`}>
              <span className={styles.stampMiniFlag}>{d.flag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

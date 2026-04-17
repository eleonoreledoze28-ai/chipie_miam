import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { assetUrl } from '../../utils/assetUrl'
import styles from './CartePostalePage.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

function getWeekNumber(): number {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7)
}

interface Destination {
  pays: string
  flag: string
  bg: string
  bgAccent: string
  scene: string[]
  message: string
  note: number
  tampon: string
  codePostal: string
  sticker: string
  souvenir: string
}

const DESTINATIONS: Destination[] = [
  { pays: 'Japon', flag: '🇯🇵', bg: '#c0392b', bgAccent: '#e74c3c', scene: ['⛩️','🌸','🗻'], message: 'Le wasabi est un légume raté. Les toilettes sont trop compliquées. Le foin est introuvable dans un rayon de 3 km. Les chats sont célébrés ici — situation à surveiller de très près.', note: 2, tampon: 'TOKYO', codePostal: '100-0001', sticker: '🗾', souvenir: 'Un bâton de wasabi non consommé' },
  { pays: 'Suisse', flag: '🇨🇭', bg: '#1a6b3a', bgAccent: '#27ae60', scene: ['🏔️','🧀','⌚'], message: 'Tout est propre. Tout est silencieux. Le foin est trié par taille et par senteur. Les humains disent "pardon" avant d\'approcher. C\'est exactement la civilisation que j\'attendais.', note: 9, tampon: 'BERNE', codePostal: '3000', sticker: '🎿', souvenir: 'Foin local — qualité horlogère' },
  { pays: 'Australie', flag: '🇦🇺', bg: '#c0770a', bgAccent: '#f39c12', scene: ['🦘','🏄','☀️'], message: 'Un kangourou m\'a regardée fixement pendant 40 minutes. J\'ai tenu bon. Le soleil est beaucoup trop enthousiaste. Le foin sèche en 4 minutes — c\'est irresponsable.', note: 4, tampon: 'SYDNEY', codePostal: '2000', sticker: '🦘', souvenir: 'Graines d\'eucalyptus (incomestibles)' },
  { pays: 'Canada', flag: '🇨🇦', bg: '#8b1a1a', bgAccent: '#c0392b', scene: ['🍁','🐻','🏔️'], message: 'Les érables sont là. Le foin aussi, en abondance. Les gens disent "sorry" quand je les regarde fixement. C\'est une civilisation correcte. Je note pour référence future.', note: 7, tampon: 'MONTRÉAL', codePostal: 'H2Y 1C6', sticker: '🍁', souvenir: 'Sirop d\'érable non testé' },
  { pays: 'Islande', flag: '🇮🇸', bg: '#1a2744', bgAccent: '#2c3e7a', scene: ['🌋','🌌','🐑'], message: 'Trop froid. Trop blanc. Les volcans sont bruyants et incomestibles. Les aurores boréales sont jolies mais ne remplacent pas le foin. Les moutons parlent peu. Respect.', note: 3, tampon: 'REYKJAVIK', codePostal: '101', sticker: '🌋', souvenir: 'Pierre volcanique (non mâchée)' },
  { pays: 'Portugal', flag: '🇵🇹', bg: '#0d5c3a', bgAccent: '#27ae60', scene: ['🏖️','🐟','🍊'], message: 'Le soleil est acceptable. Les azulejos sont beaux mais froids sous les pattes. Le foin local a un parfum subtil et légèrement agreste. Je valide officiellement cette destination.', note: 7, tampon: 'LISBONNE', codePostal: '1100-001', sticker: '🐓', souvenir: 'Pastéis de nata (refusés)' },
  { pays: 'Maroc', flag: '🇲🇦', bg: '#8b2000', bgAccent: '#c0392b', scene: ['🕌','🌴','🐪'], message: 'Les souks sentent la menthe fraîche. J\'ai failli acheter. J\'ai résisté. Presque. Les couleurs me déstabilisent légèrement. La coriandre est mondiale et omniprésente. Signalé.', note: 6, tampon: 'MARRAKECH', codePostal: '40000', sticker: '🏺', souvenir: 'Sachet de menthe séchée' },
  { pays: 'Norvège', flag: '🇳🇴', bg: '#1a2744', bgAccent: '#2d4a7a', scene: ['🏔️','🐋','🌊'], message: 'Les fjords sont majestueux. Les Norvégiens sont silencieux. Je les respecte profondément. Le foin est de qualité nordique — c\'est le plus grand compliment que je puisse formuler.', note: 8, tampon: 'OSLO', codePostal: '0010', sticker: '⚓', souvenir: 'Photo d\'un fjord (impressionnant)' },
  { pays: 'Italie', flag: '🇮🇹', bg: '#1a5c1a', bgAccent: '#27ae60', scene: ['🏛️','🍕','⛲'], message: 'Les Italiens gesticulent beaucoup. J\'ai mimé "foin" avec les mains pendant 20 minutes dans une épicerie de Rome. Incompréhension totale des deux côtés. Les pâtes me laissent froide.', note: 3, tampon: 'ROME', codePostal: '00100', sticker: '🏺', souvenir: 'Fettuccine (décoratives)' },
  { pays: 'Nouvelle-Zélande', flag: '🇳🇿', bg: '#1a5c3a', bgAccent: '#2ecc71', scene: ['🌿','🐑','🌋'], message: 'Les moutons sont partout. Je me sens représentée dans le paysage. Le foin est local, abondant, de qualité exceptionnelle. C\'est mon pays préféré. Je reviens l\'année prochaine.', note: 10, tampon: 'WELLINGTON', codePostal: '6011', sticker: '🥝', souvenir: 'Foin néo-zélandais premium' },
  { pays: 'Mexique', flag: '🇲🇽', bg: '#7a1a00', bgAccent: '#e74c3c', scene: ['🌵','🎭','🏜️'], message: 'Le cactus est un légume acceptable en dernier recours selon mes propres standards. Les pyramides sont impressionnantes. Le soleil est agressif. Le foin est trop pimenté dans ce pays.', note: 5, tampon: 'OAXACA', codePostal: '68000', sticker: '🌵', souvenir: 'Piment séché (inutilisable)' },
  { pays: 'Écosse', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', bg: '#1a2a4a', bgAccent: '#2c3e6a', scene: ['🏰','🌧️','🥃'], message: 'Il pleut. Le foin est humide. Les châteaux ont des courants d\'air. Mais les Écossais ne touchent pas mes oreilles sans autorisation. C\'est un détail culturel que j\'apprécie profondément.', note: 6, tampon: 'EDINBURGH', codePostal: 'EH1 1YZ', sticker: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', souvenir: 'Plaid en tartan (acceptable)' },
  { pays: 'Grèce', flag: '🇬🇷', bg: '#1a3a6a', bgAccent: '#3498db', scene: ['🏛️','🌊','🫒'], message: 'Les ruines antiques sont impressionnantes. J\'en ai vu de pires (le couloir après le zoom zoom). Les olives sont correctes. La mer est bleue, incomestible et trop grande.', note: 6, tampon: 'ATHÈNES', codePostal: '10557', sticker: '🦉', souvenir: 'Feuilles d\'olivier séchées' },
  { pays: 'Inde', flag: '🇮🇳', bg: '#7a4400', bgAccent: '#e67e22', scene: ['🕌','🐘','🌶️'], message: 'Les couleurs me déstabilisent légèrement. La coriandre est omniprésente — c\'est un problème mondial que j\'ai signalé au Maroc déjà. Les éléphants sont grands. Trop grands.', note: 5, tampon: 'JAIPUR', codePostal: '302001', sticker: '🐘', souvenir: 'Tissu brodé (non grignoté)' },
  { pays: 'Égypte', flag: '🇪🇬', bg: '#7a5c00', bgAccent: '#f39c12', scene: ['🐪','🏺','☀️'], message: 'Les pyramides sont respectables. Les chameaux sont condescendants — je les comprends. Les chats sont vénérés ici. Situation que je surveille avec la plus grande attention.', note: 5, tampon: 'LOUXOR', codePostal: '85511', sticker: '🐱', souvenir: 'Papyrus décoratif' },
  { pays: 'Brésil', flag: '🇧🇷', bg: '#1a6b1a', bgAccent: '#27ae60', scene: ['🌴','🦜','🌊'], message: 'Trop chaud. Trop bruyant. Les forêts sont d\'une beauté troublante mais il manque un distributeur de foin dans un rayon de 200 km. La samba perturbe mes siestes réglementaires.', note: 4, tampon: 'SALVADOR', codePostal: '40000-000', sticker: '🦜', souvenir: 'Noix de coco (trop lourde)' },
  { pays: 'Thaïlande', flag: '🇹🇭', bg: '#7a1a4a', bgAccent: '#9b59b6', scene: ['🛕','🐘','🌺'], message: 'Les temples sont d\'un calme extraordinaire. La chaleur moins. Une grenouille m\'a regardée fixement pendant 7 minutes. J\'ai gagné le concours. Comme toujours. Partout.', note: 6, tampon: 'CHIANG MAI', codePostal: '50000', sticker: '🌺', souvenir: 'Jasmin séché (parfumé)' },
  { pays: 'Chine', flag: '🇨🇳', bg: '#8b0000', bgAccent: '#c0392b', scene: ['🐉','🏯','🎎'], message: 'La Grande Muraille est longue. J\'ai évalué sa pertinence comme zone de déambulation lapinesque. Elle est acceptable. Les pandas m\'ont regardée avec sympathie. C\'est nouveau et inhabituel.', note: 7, tampon: 'GUILIN', codePostal: '541001', sticker: '🐼', souvenir: 'Thé vert (non testé)' },
  { pays: 'Kenya', flag: '🇰🇪', bg: '#3a5c00', bgAccent: '#27ae60', scene: ['🦁','🌅','🐘'], message: 'Les lions m\'ont regardée. Je les ai regardés. Ils ont détourné les yeux en premier. Victoire totale. Les savanes ont du foin à perte de vue. Je n\'en reviens toujours pas. 10/10.', note: 9, tampon: 'NAIROBI', codePostal: '00100', sticker: '🦁', souvenir: 'Herbe de savane (premium)' },
  { pays: 'Russie', flag: '🇷🇺', bg: '#1a1a3a', bgAccent: '#2c2c5a', scene: ['❄️','🏰','🎡'], message: 'Très froid. Les dômes en or sont impressionnants mais non comestibles. Le foin est sous la neige — on me dit qu\'il existe. Je n\'en suis pas certaine. Le silence est total et idéal.', note: 5, tampon: 'SAINT-PÉTERSBOURG', codePostal: '190000', sticker: '🪆', souvenir: 'Matriochka (non dévorée)' },
]

const MONTHS_FR = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']

export default function CartePostalePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [flipped, setFlipped] = useState(false)
  const [tab, setTab] = useState<'carte' | 'collection'>('carte')

  const avatarSrc = profil.avatar ? assetUrl(profil.avatar) : DEFAULT_AVATAR

  const week = getWeekNumber()
  const destination = useMemo(() => DESTINATIONS[week % DESTINATIONS.length], [week])
  const nextDest = DESTINATIONS[(week + 1) % DESTINATIONS.length]

  const today = new Date()
  const dateStr = `${today.getDate()} ${MONTHS_FR[today.getMonth()]} ${today.getFullYear()}`
  const daysLeft = 7 - today.getDay() || 7

  const noteEmojis = destination.note >= 8 ? '★★★★★' : destination.note >= 6 ? '★★★★☆' : destination.note >= 4 ? '★★★☆☆' : '★★☆☆☆'
  const noteVerdict = destination.note >= 9 ? 'Coup de cœur absolu' : destination.note >= 7 ? 'Recommandé' : destination.note >= 5 ? 'Mitigé' : 'Déconseillé'

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
          <h1 className={styles.title}>Chipie World Tour</h1>
          <p className={styles.subtitle}>Semaine {week} · {destination.flag} {destination.pays}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'carte' ? styles.tabActive : ''}`} onClick={() => setTab('carte')}>
          📬 La carte
        </button>
        <button className={`${styles.tab} ${tab === 'collection' ? styles.tabActive : ''}`} onClick={() => setTab('collection')}>
          📮 Collection
        </button>
      </div>

      {tab === 'carte' && (
        <>
          {/* Flip hint */}
          <p className={styles.flipHint}>Appuie sur la carte pour la retourner</p>

          {/* Postcard */}
          <div className={styles.cardScene} onClick={() => setFlipped(f => !f)}>
            <div className={`${styles.card} ${flipped ? styles.cardFlipped : ''}`}>

              {/* ── RECTO ── */}
              <div className={styles.cardFront}>
                {/* Photo area */}
                <div className={styles.photo} style={{ background: `linear-gradient(160deg, ${destination.bg}, ${destination.bgAccent})` }}>
                  {/* Scene emojis */}
                  <div className={styles.sceneLayer}>
                    {destination.scene.map((e, i) => (
                      <span key={i} className={styles.sceneEmoji} style={{ '--i': i } as React.CSSProperties}>{e}</span>
                    ))}
                  </div>

                  {/* CHIPIE MIAM WORLD TOUR label */}
                  <div className={styles.worldTourBadge}>
                    <span className={styles.worldTourText}>CHIPIE MIAM WORLD TOUR</span>
                  </div>

                  {/* Chipie selfie avatar */}
                  <div className={styles.selfieWrap}>
                    <img src={avatarSrc} alt={profil.nom} className={styles.selfieAvatar} />
                    <div className={styles.selfieFlag}>{destination.flag}</div>
                  </div>

                  {/* Country overlay */}
                  <div className={styles.photoOverlay}>
                    <p className={styles.paysName}>{destination.pays.toUpperCase()}</p>
                    <p className={styles.paysSubline}>Greetings from {destination.pays}</p>
                  </div>
                </div>

                {/* White strip */}
                <div className={styles.frontStrip}>
                  <span className={styles.stripHint}>← Retourner →</span>
                  <span className={styles.stripNote}>{noteEmojis}</span>
                </div>
              </div>

              {/* ── VERSO ── */}
              <div className={styles.cardBack}>
                {/* Left: message */}
                <div className={styles.backMessage}>
                  <div className={styles.lines}>
                    {Array.from({ length: 7 }).map((_, i) => <div key={i} className={styles.line} />)}
                  </div>
                  <div className={styles.messageContent}>
                    <p className={styles.backTo}>À l'attention de {profil.nom} 🐰</p>
                    <p className={styles.messageText}>« {destination.message} »</p>
                    <p className={styles.messageSign}>— {profil.nom}, {destination.pays}</p>
                    <div className={styles.noteRow}>
                      <span className={styles.noteStars}>{noteEmojis}</span>
                      <span className={styles.noteVerdict}>{destination.note}/10 — {noteVerdict}</span>
                    </div>
                    <p className={styles.souvenir}>🎁 Souvenir : {destination.souvenir}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className={styles.backDivider} />

                {/* Right: postal elements */}
                <div className={styles.backPostal}>
                  {/* Stamp */}
                  <div className={styles.stamp}>
                    <div className={styles.stampInner} style={{ background: `linear-gradient(135deg, ${destination.bg}, ${destination.bgAccent})` }}>
                      <span className={styles.stampEmoji}>{destination.sticker}</span>
                      <span className={styles.stampPays}>{destination.pays.toUpperCase().slice(0, 8)}</span>
                    </div>
                  </div>

                  {/* Postmark */}
                  <div className={styles.postmark}>
                    <div className={styles.postmarkCircle}>
                      <span className={styles.postmarkCity}>{destination.tampon}</span>
                      <div className={styles.postmarkLines}>
                        <span /><span /><span />
                      </div>
                      <span className={styles.postmarkDate}>{dateStr}</span>
                    </div>
                  </div>

                  {/* Address */}
                  <div className={styles.address}>
                    <p className={styles.addrTo}>Pour :</p>
                    <p className={styles.addrName}>{profil.nom}</p>
                    <div className={styles.addrLine} />
                    <div className={styles.addrLine} />
                    <p className={styles.addrCode}>{destination.codePostal}</p>
                  </div>

                  <span className={styles.backHint}>← Retourner</span>
                </div>
              </div>

            </div>
          </div>

          {/* Next destination */}
          <div className={styles.nextCard}>
            <div className={styles.nextLeft}>
              <p className={styles.nextLabel}>✈️ Prochaine destination</p>
              <p className={styles.nextName}>{nextDest.flag} {nextDest.pays}</p>
              <p className={styles.nextDays}>Dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}</p>
            </div>
            <div className={styles.nextPreview} style={{ background: `linear-gradient(135deg, ${nextDest.bg}, ${nextDest.bgAccent})` }}>
              <span>{nextDest.scene[0]}</span>
            </div>
          </div>
        </>
      )}

      {tab === 'collection' && (
        <div className={styles.collection}>
          <p className={styles.collectionDesc}>
            {Math.min(week, DESTINATIONS.length)} destination{week > 1 ? 's' : ''} visitée{week > 1 ? 's' : ''} sur {DESTINATIONS.length}
          </p>
          <div className={styles.collectionGrid}>
            {DESTINATIONS.map((d, i) => {
              const w = i
              const isCurrent = w === week % DESTINATIONS.length
              const isVisited = w < week % DESTINATIONS.length
              return (
                <div
                  key={i}
                  className={`${styles.miniCard} ${isCurrent ? styles.miniCurrent : isVisited ? styles.miniVisited : styles.miniFuture}`}
                >
                  <div
                    className={styles.miniPhoto}
                    style={isCurrent || isVisited ? { background: `linear-gradient(135deg, ${d.bg}, ${d.bgAccent})` } : {}}
                  >
                    <span className={styles.miniScene}>{isCurrent || isVisited ? d.scene[0] : '?'}</span>
                  </div>
                  <p className={styles.miniFlag}>{isCurrent || isVisited ? d.flag : '🔒'}</p>
                  <p className={styles.miniPays}>{isCurrent || isVisited ? d.pays : '???'}</p>
                  {isCurrent && <span className={styles.miniCurrentBadge}>EN COURS</span>}
                  {isVisited && <p className={styles.miniNote}>{'★'.repeat(Math.round(d.note / 2))}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

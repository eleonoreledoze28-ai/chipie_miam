import { useId } from 'react'
import styles from './ChipieCharacter.module.css'

export type ChipieMood = 'happy' | 'sleep' | 'eat' | 'surprised' | 'love' | 'sad'

interface Props {
  mood?: ChipieMood
  /** Largeur en pixels (la hauteur suit) */
  size?: number
  /** Clignement, oreilles, respiration… (désactivé si l'écran demande de réduire les animations) */
  animated?: boolean
  className?: string
}

const LABELS: Record<ChipieMood, string> = {
  happy: 'Chipie, contente',
  sleep: 'Chipie dort',
  eat: 'Chipie grignote une carotte',
  surprised: 'Chipie, surprise',
  love: 'Chipie, amoureuse',
  sad: 'Chipie, triste',
}

// Couleurs inspirées de sa photo : pelage noir, museau fauve, intérieur des oreilles brun, pattes crème
const FUR = '#14161d'
const FUR_LIGHT = '#2a2e3b'
const TAN = '#a98d6b'
const TAN_LIGHT = '#d2bb97'
const EAR_INNER = '#6b4d3a'
const CREAM = '#e3d3b4'

/** Chipie dessinée : lapin bélier noir au museau fauve, avec plusieurs expressions. */
export default function ChipieCharacter({ mood = 'happy', size = 160, animated = true, className = '' }: Props) {
  const uid = useId().replace(/:/g, '')
  const gBody = `body-${uid}`
  const gHead = `head-${uid}`
  const gMuzzle = `muzzle-${uid}`
  const closedEyes = mood === 'sleep'
  const bigEyes = mood === 'surprised'

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`${styles.chipie} ${animated ? styles.animated : ''} ${className}`}
      role="img"
      aria-label={LABELS[mood]}
    >
      <defs>
        <radialGradient id={gBody} cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor={FUR_LIGHT} />
          <stop offset="100%" stopColor={FUR} />
        </radialGradient>
        <radialGradient id={gHead} cx="45%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#343948" />
          <stop offset="55%" stopColor={FUR_LIGHT} />
          <stop offset="100%" stopColor="#0f1117" />
        </radialGradient>
        <radialGradient id={gMuzzle} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={TAN_LIGHT} />
          <stop offset="100%" stopColor={TAN} />
        </radialGradient>
      </defs>

      {/* ombre au sol */}
      <ellipse cx="100" cy="188" rx="54" ry="7" fill="rgba(0,0,0,0.28)" />

      <g className={styles.body}>
        {/* pattes arrière */}
        <ellipse cx="62" cy="176" rx="22" ry="11" fill={FUR} />
        <ellipse cx="138" cy="176" rx="22" ry="11" fill={FUR} />
        <ellipse cx="50" cy="180" rx="9" ry="5" fill={CREAM} opacity="0.85" />
        <ellipse cx="150" cy="180" rx="9" ry="5" fill={CREAM} opacity="0.85" />

        {/* corps */}
        <ellipse cx="100" cy="142" rx="54" ry="46" fill={`url(#${gBody})`} />
        <ellipse cx="100" cy="152" rx="32" ry="30" fill="#2d3140" opacity="0.55" />

        {/* pattes avant */}
        <ellipse cx="82" cy="172" rx="10" ry="15" fill={FUR} />
        <ellipse cx="118" cy="172" rx="10" ry="15" fill={FUR} />
        <ellipse cx="82" cy="182" rx="8" ry="4.5" fill={CREAM} />
        <ellipse cx="118" cy="182" rx="8" ry="4.5" fill={CREAM} />
      </g>

      {/* oreilles tombantes (derrière la tête) */}
      <g className={styles.earLeft}>
        <ellipse cx="52" cy="100" rx="18" ry="46" transform="rotate(14 52 100)" fill={FUR} />
        <ellipse cx="57" cy="104" rx="9" ry="34" transform="rotate(14 57 104)" fill={EAR_INNER} opacity="0.75" />
      </g>
      <g className={styles.earRight}>
        <ellipse cx="148" cy="100" rx="18" ry="46" transform="rotate(-14 148 100)" fill={FUR} />
        <ellipse cx="143" cy="104" rx="9" ry="34" transform="rotate(-14 143 104)" fill={EAR_INNER} opacity="0.75" />
      </g>

      {/* tête */}
      <circle cx="100" cy="84" r="45" fill={`url(#${gHead})`} />
      <ellipse cx="88" cy="58" rx="17" ry="8" fill="rgba(255,255,255,0.07)" transform="rotate(-16 88 58)" />

      {/* museau fauve */}
      <ellipse cx="100" cy="103" rx="26" ry="19" fill={`url(#${gMuzzle})`} />

      {/* joues */}
      {(mood === 'happy' || mood === 'eat' || mood === 'love') && (
        <>
          <ellipse cx="70" cy="95" rx="8" ry="5" fill="rgba(214,120,112,0.30)" />
          <ellipse cx="130" cy="95" rx="8" ry="5" fill="rgba(214,120,112,0.30)" />
        </>
      )}

      {/* yeux */}
      <g className={styles.eyes}>
        {closedEyes ? (
          <>
            <path d="M70 78 q9 7 18 0" stroke={CREAM} strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M112 78 q9 7 18 0" stroke={CREAM} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </>
        ) : mood === 'love' ? (
          <>
            <path d="M79 84 C70 77 70 70 76 70 C79 70 79 73 79 74 C79 73 80 70 83 70 C89 70 89 77 79 84 Z" fill="#ff6b8b" />
            <path d="M121 84 C112 77 112 70 118 70 C121 70 121 73 121 74 C121 73 122 70 125 70 C131 70 131 77 121 84 Z" fill="#ff6b8b" />
          </>
        ) : (
          <>
            {[80, 120].map(cx => (
              <g key={cx}>
                <ellipse cx={cx} cy="77" rx={bigEyes ? 9 : 7.5} ry={bigEyes ? 11.5 : 9.5} fill="#07070a" />
                <circle cx={cx} cy="78" r={bigEyes ? 6.5 : 5.2} fill="#4b2f22" />
                <circle cx={cx} cy="78" r={bigEyes ? 3.6 : 3} fill="#050506" />
                <circle cx={cx - 2.4} cy="74" r="2.3" fill="#fff" />
                <circle cx={cx + 2.2} cy="80.5" r="1" fill="#fff" opacity="0.8" />
                <path d={`M${cx - 6} ${bigEyes ? 88 : 86} q6 4 12 0`} stroke="#bdae95" strokeWidth="1.4" fill="none" opacity="0.55" strokeLinecap="round" />
              </g>
            ))}
          </>
        )}
      </g>

      {/* sourcils tristes */}
      {mood === 'sad' && (
        <>
          {/* extrémités intérieures relevées : l'air triste, pas fâché */}
          <path d="M70 69 L88 63" stroke={CREAM} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
          <path d="M130 69 L112 63" stroke={CREAM} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
        </>
      )}

      {/* nez */}
      <path d="M94 95 Q100 91 106 95 Q103 101 100 101 Q97 101 94 95 Z" fill="#5a3d34" />
      <ellipse cx="98" cy="94.4" rx="2.4" ry="1.2" fill="rgba(255,255,255,0.45)" />

      {/* bouche */}
      {mood === 'surprised' ? (
        <ellipse cx="100" cy="110" rx="4" ry="5.5" fill="#3a2823" />
      ) : mood === 'sad' ? (
        <path d="M100 101 V104 M100 104 q-7 -5 -14 1 M100 104 q7 -5 14 1" stroke="#4a342d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : mood === 'eat' ? (
        <g className={styles.chew}>
          <path d="M100 101 V104" stroke="#4a342d" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M92 108 Q100 116 108 108 Q100 111 92 108 Z" fill="#3a2823" />
        </g>
      ) : (
        <path d="M100 101 V105 M100 105 q-8 7 -15 0 M100 105 q8 7 15 0" stroke="#4a342d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      )}

      {/* moustaches */}
      <g stroke="rgba(255,255,255,0.38)" strokeWidth="1.1" strokeLinecap="round">
        <path d="M78 100 L46 94" /><path d="M78 105 L44 107" /><path d="M80 109 L52 119" />
        <path d="M122 100 L154 94" /><path d="M122 105 L156 107" /><path d="M120 109 L148 119" />
      </g>

      {/* carotte */}
      {mood === 'eat' && (
        <g className={styles.carrot}>
          {/* la pointe est dans la bouche, les fanes vertes sont de l'autre côté */}
          <path d="M103 110 L142 144 L152 136 L110 106 Z" fill="#f08a2e" />
          <path d="M103 110 L142 144 L146 140 L108 107 Z" fill="#ffa84f" opacity="0.7" />
          <path d="M120 120 l5 -4 M127 127 l5 -4 M134 134 l5 -4" stroke="#c96a1c" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M148 140 q8 -2 14 -10 q-1 8 -6 12 q8 0 14 -2 q-6 6 -14 6 q4 4 3 9 q-8 -2 -11 -8 q-2 -4 0 -7 Z" fill="#4cd964" />
        </g>
      )}

      {/* zzz */}
      {mood === 'sleep' && (
        <g className={styles.zzz} fill={CREAM} fontWeight="800" fontFamily="var(--font-heading), sans-serif">
          <text x="150" y="52" fontSize="22">z</text>
          <text x="164" y="34" fontSize="16" className={styles.z2}>z</text>
          <text x="174" y="20" fontSize="11" className={styles.z3}>z</text>
        </g>
      )}

      {/* cœurs */}
      {mood === 'love' && (
        <g className={styles.hearts} fill="#ff6b8b">
          <path d="M152 44 c-5 -5 -9 -1 -6 3 l6 6 l6 -6 c3 -4 -1 -8 -6 -3 Z" />
          <path d="M44 38 c-4 -4 -7 -1 -5 2 l5 5 l5 -5 c2 -3 -1 -6 -5 -2 Z" className={styles.h2} />
        </g>
      )}
    </svg>
  )
}

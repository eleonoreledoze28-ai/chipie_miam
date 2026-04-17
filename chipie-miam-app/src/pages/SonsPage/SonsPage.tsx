import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './SonsPage.module.css'

// ── Data ──────────────────────────────────────────────────────────────────────
type Sentiment = 'positif' | 'neutre' | 'attention' | 'urgent'

interface Son {
  id: string
  nom: string
  emoji: string
  sentiment: Sentiment
  signification: string
  contexte: string
  quoiFaire: string
  synth: (ctx: AudioContext) => void
}

const SENTIMENT_INFO: Record<Sentiment, { label: string; color: string; bg: string }> = {
  positif:   { label: '😊 Positif',   color: '#4cd964', bg: 'rgba(76,217,100,0.1)' },
  neutre:    { label: '🔵 Neutre',    color: '#5AC8FA', bg: 'rgba(90,200,250,0.1)' },
  attention: { label: '⚠️ Attention', color: '#F0A53A', bg: 'rgba(240,165,58,0.1)' },
  urgent:    { label: '🚨 Urgent',    color: '#ff3b30', bg: 'rgba(255,59,48,0.1)'  },
}

// ── Web Audio synthesizers ────────────────────────────────────────────────────
function playRonronnement(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.frequency.value = 25
  lfoGain.gain.value = 0.4
  lfo.connect(lfoGain)
  lfoGain.connect(gain.gain)
  osc.type = 'sine'
  osc.frequency.value = 65
  gain.gain.value = 0.5
  osc.connect(gain)
  gain.connect(ctx.destination)
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.5, t + 0.2)
  gain.gain.setValueAtTime(0.5, t + 1.6)
  gain.gain.linearRampToValueAtTime(0, t + 2)
  lfo.start(t); lfo.stop(t + 2)
  osc.start(t); osc.stop(t + 2)
}

function playBruxisme(ctx: AudioContext) {
  for (let i = 0; i < 5; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = 350 + Math.random() * 100
    gain.gain.value = 0
    osc.connect(gain); gain.connect(ctx.destination)
    const t = ctx.currentTime + i * 0.12
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.3, t + 0.02)
    gain.gain.linearRampToValueAtTime(0, t + 0.09)
    osc.start(t); osc.stop(t + 0.1)
  }
}

function playGrognement(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 300
  osc.type = 'sawtooth'
  osc.frequency.value = 110
  gain.gain.value = 0
  osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.6, t + 0.08)
  gain.gain.setValueAtTime(0.6, t + 0.35)
  gain.gain.linearRampToValueAtTime(0, t + 0.5)
  osc.start(t); osc.stop(t + 0.6)
}

function playThumping(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const env = Math.exp(-i / (ctx.sampleRate * 0.05))
    data[i] = (Math.sin(2 * Math.PI * 55 * i / ctx.sampleRate)) * env
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  const gain = ctx.createGain()
  gain.gain.value = 1.2
  src.connect(gain); gain.connect(ctx.destination)
  src.start(ctx.currentTime)
  // second thump
  const src2 = ctx.createBufferSource()
  src2.buffer = buf
  src2.connect(gain)
  src2.start(ctx.currentTime + 0.5)
}

function playCouinement(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 900
  osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3)
  gain.gain.value = 0
  osc.connect(gain); gain.connect(ctx.destination)
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.4, t + 0.05)
  gain.gain.setValueAtTime(0.4, t + 0.25)
  gain.gain.linearRampToValueAtTime(0, t + 0.4)
  osc.start(t); osc.stop(t + 0.5)
}

function playReniflements(ctx: AudioContext) {
  for (let i = 0; i < 6; i++) {
    const bufSize = Math.floor(ctx.sampleRate * 0.06)
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let j = 0; j < data.length; j++) {
      const env = Math.sin(Math.PI * j / data.length)
      data[j] = (Math.random() * 2 - 1) * env * 0.5
    }
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 600 + Math.random() * 200
    filter.Q.value = 2
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(filter); filter.connect(ctx.destination)
    src.start(ctx.currentTime + i * 0.18)
  }
}

function playSoupir(ctx: AudioContext) {
  const bufSize = ctx.sampleRate * 1.2
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const env = Math.sin(Math.PI * i / data.length) * 0.3
    data[i] = (Math.random() * 2 - 1) * env
  }
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 400
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(filter); filter.connect(ctx.destination)
  src.start(ctx.currentTime)
}

function playCri(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.value = 700
  osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.6)
  gain.gain.value = 0
  osc.connect(gain); gain.connect(ctx.destination)
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.5, t + 0.05)
  gain.gain.setValueAtTime(0.5, t + 0.5)
  gain.gain.linearRampToValueAtTime(0, t + 0.7)
  osc.start(t); osc.stop(t + 0.8)
}

function playGloussement(ctx: AudioContext) {
  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 200 + i * 30
    gain.gain.value = 0
    osc.connect(gain); gain.connect(ctx.destination)
    const t = ctx.currentTime + i * 0.15
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.25, t + 0.04)
    gain.gain.linearRampToValueAtTime(0, t + 0.1)
    osc.start(t); osc.stop(t + 0.15)
  }
}

const SONS: Son[] = [
  {
    id: 'ronronnement',
    nom: 'Ronronnement dentaire',
    emoji: '😊',
    sentiment: 'positif',
    signification: 'Ton lapin est heureux et détendu. C\'est l\'équivalent du ronronnement d\'un chat.',
    contexte: 'Pendant les câlins, après un bon repas, lorsqu\'il est confortablement installé.',
    quoiFaire: 'Continue ce que tu fais — Chipie est bien ! C\'est bon signe.',
    synth: playRonronnement,
  },
  {
    id: 'bruxisme',
    nom: 'Bruxisme (grincement fort)',
    emoji: '😣',
    sentiment: 'urgent',
    signification: 'Grincement intense et fort des dents. Signal de douleur ou d\'inconfort grave.',
    contexte: 'À ne pas confondre avec le ronronnement doux. Le bruxisme est plus fort, plus irrégulier.',
    quoiFaire: 'Consulter un vétérinaire rapidement. Peut signaler des problèmes dentaires, une stase GI ou une douleur interne.',
    synth: playBruxisme,
  },
  {
    id: 'grognement',
    nom: 'Grognement',
    emoji: '😤',
    sentiment: 'attention',
    signification: 'Mécontentement ou avertissement. Le lapin se sent menacé ou dérange.',
    contexte: 'Si tu touches sa cage, son territoire, ou si quelqu\'un l\'approche trop vite.',
    quoiFaire: 'Respecte son espace. Approche-toi lentement, laisse-le venir à toi. Peut s\'améliorer avec la stérilisation.',
    synth: playGrognement,
  },
  {
    id: 'thumping',
    nom: 'Thumping (frappe du sol)',
    emoji: '🦶',
    sentiment: 'attention',
    signification: 'Signal d\'alarme. Le lapin perçoit un danger et avertit — instinct de lapin sauvage.',
    contexte: 'Bruit inhabituel, animal inconnu, changement dans l\'environnement, odeur étrange.',
    quoiFaire: 'Vérifie qu\'il n\'y a pas de danger réel. Rassure Chipie avec une voix calme. Évite les sources de stress.',
    synth: playThumping,
  },
  {
    id: 'couinement',
    nom: 'Couinement aigu',
    emoji: '😱',
    sentiment: 'urgent',
    signification: 'Douleur ou peur intense. Le lapin crie rarement — quand il le fait, c\'est sérieux.',
    contexte: 'Blessure, manipulation trop brusque, douleur aiguë, prédateur.',
    quoiFaire: 'Arrête immédiatement ce que tu fais. Vérifie s\'il est blessé. Si ça persiste, appelle le vétérinaire en urgence.',
    synth: playCouinement,
  },
  {
    id: 'reniflements',
    nom: 'Reniflements rapides',
    emoji: '👃',
    sentiment: 'neutre',
    signification: 'Exploration et curiosité. Le lapin analyse son environnement avec son odorat très développé.',
    contexte: 'Découverte d\'un nouvel objet, d\'une personne inconnue, après un changement dans la pièce.',
    quoiFaire: 'Rien à faire — c\'est son comportement naturel d\'exploration. Laisse-le explorer à son rythme.',
    synth: playReniflements,
  },
  {
    id: 'soupir',
    nom: 'Soupir / Soufflement',
    emoji: '😌',
    sentiment: 'positif',
    signification: 'Profond relâchement. Le lapin est complètement à l\'aise et se détend.',
    contexte: 'En s\'allongeant, après une longue session de toilettage, dans un environnement connu et sûr.',
    quoiFaire: 'Profite du moment — Chipie est en confiance totale !',
    synth: playSoupir,
  },
  {
    id: 'cri',
    nom: 'Cri perçant',
    emoji: '🆘',
    sentiment: 'urgent',
    signification: 'Son le plus rare et le plus alarmant. Peur ou douleur extrême. À prendre très au sérieux.',
    contexte: 'Accident, blessure grave, prédateur, prise en charge violente.',
    quoiFaire: 'Urgence absolue. Vérifie l\'état de Chipie immédiatement et appelle le vétérinaire.',
    synth: playCri,
  },
  {
    id: 'gloussement',
    nom: 'Gloussements / Clicks',
    emoji: '💬',
    sentiment: 'neutre',
    signification: 'Communication sociale. Le lapin interagit avec toi ou avec un congénère.',
    contexte: 'Lors du jeu, de la rencontre avec un autre animal, ou pour attirer ton attention.',
    quoiFaire: 'Réponds à son invitation ! C\'est un signe d\'interaction sociale positive.',
    synth: playGloussement,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function SonsPage() {
  const navigate = useNavigate()
  const [playing, setPlaying] = useState<string | null>(null)
  const [filter, setFilter] = useState<Sentiment | 'all'>('all')
  const audioCtxRef = useRef<AudioContext | null>(null)

  const playSound = useCallback((son: Son) => {
    if (playing === son.id) return
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()
    setPlaying(son.id)
    son.synth(ctx)
    setTimeout(() => setPlaying(null), 2200)
  }, [playing])

  const filtered = filter === 'all' ? SONS : SONS.filter(s => s.sentiment === filter)

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
        <span className={styles.headerEmoji}>🔊</span>
        <div>
          <h1 className={styles.title}>Sons de lapin</h1>
          <p className={styles.subtitle}>Comprendre ce que dit Chipie</p>
        </div>
      </div>

      <div className={styles.intro}>
        <p>Les lapins communiquent beaucoup avec des sons subtils. Appuie sur ▶ pour écouter une simulation synthétique de chaque son.</p>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <button className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`} onClick={() => setFilter('all')}>Tous</button>
        {(Object.keys(SENTIMENT_INFO) as Sentiment[]).map(s => {
          const info = SENTIMENT_INFO[s]
          return (
            <button
              key={s}
              className={`${styles.filterBtn} ${filter === s ? styles.filterActive : ''}`}
              style={filter === s ? { borderColor: info.color, background: info.bg, color: info.color } as React.CSSProperties : undefined}
              onClick={() => setFilter(s)}
            >
              {info.label}
            </button>
          )
        })}
      </div>

      {/* Sound cards */}
      <div className={styles.list}>
        {filtered.map(son => {
          const info = SENTIMENT_INFO[son.sentiment]
          const isPlaying = playing === son.id
          return (
            <div key={son.id} className={styles.card} style={{ '--sc': info.color } as React.CSSProperties}>
              <div className={styles.cardTop}>
                <button
                  className={`${styles.playBtn} ${isPlaying ? styles.playBtnActive : ''}`}
                  onClick={() => playSound(son)}
                  aria-label={`Écouter ${son.nom}`}
                >
                  {isPlaying ? (
                    <span className={styles.wave}>
                      <span /><span /><span /><span />
                    </span>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                  )}
                </button>
                <div className={styles.cardInfo}>
                  <div className={styles.cardNameRow}>
                    <span className={styles.cardEmoji}>{son.emoji}</span>
                    <span className={styles.cardName}>{son.nom}</span>
                  </div>
                  <span className={styles.sentimentBadge} style={{ color: info.color, background: info.bg } as React.CSSProperties}>
                    {info.label}
                  </span>
                </div>
              </div>

              <p className={styles.signification}>{son.signification}</p>

              <div className={styles.details}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>📍 Contexte</span>
                  <span className={styles.detailText}>{son.contexte}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>✅ Que faire ?</span>
                  <span className={styles.detailText}>{son.quoiFaire}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJournal } from '../../hooks/useJournal'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { useSpeechRecognition, isRecognitionSupported } from '../../hooks/useSpeechRecognition'
import { useTilt } from '../../hooks/useTilt'
import { EXAMPLES, interpret } from '../../services/assistant'
import type { Answer } from '../../services/assistant'
import { haptic } from '../../services/haptics'
import { playSfx } from '../../services/sfx'
import { isSpeechSupported, loadVoiceOn, saveVoiceOn, speak, stopSpeaking } from '../../services/voice'
import { addDays, todayStr } from '../../utils/dates'
import styles from './DisChipiePage.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`
const RECENT_DAYS = 3
const MAX_HISTORY = 8

interface Exchange {
  id: number
  question: string
  answer: Answer
  loggedIds: string[]   // entrées de journal ajoutées par cette réponse (pour pouvoir annuler)
  undone: boolean
}

export default function DisChipiePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const { entries, addEntry, removeEntry } = useJournal()
  const [history, setHistory] = useState<Exchange[]>([])
  const [typed, setTyped] = useState('')
  const [voiceOn, setVoiceOn] = useState(loadVoiceOn)
  const nextId = useRef(1)
  const avatarRef = useTilt<HTMLDivElement>({ max: 14 })

  const avatar = profil.avatar || DEFAULT_AVATAR
  const recognitionOk = isRecognitionSupported()
  const speechOk = isSpeechSupported()
  const rabbitName = profil.nom || 'Chipie'

  const recentIds = useMemo(() => {
    const since = addDays(todayStr(), -RECENT_DAYS)
    return new Set(entries.filter(e => e.date >= since).map(e => e.vegetalId))
  }, [entries])

  const ask = useCallback((question: string) => {
    const text = question.trim()
    if (!text) return
    stopSpeaking()

    const today = todayStr()
    const answer = interpret(text, {
      profileId: getActiveProfileId(),
      rabbitName,
      today,
      recentVegetalIds: recentIds,
    })

    // Ajout au journal si la phrase le demandait (annulable)
    const loggedIds: string[] = []
    if (answer.log) {
      for (const v of answer.log.vegetals) {
        const entry = addEntry({
          vegetalId: v.id, date: today, quantite: '1 portion', notes: 'Ajouté à la voix', appetit: answer.log.appetit,
        })
        loggedIds.push(entry.id)
      }
    }

    setHistory(prev => [
      { id: nextId.current++, question: text, answer, loggedIds, undone: false },
      ...prev,
    ].slice(0, MAX_HISTORY))

    playSfx(answer.tone === 'bad' ? 'error' : 'pop')
    haptic(answer.tone === 'bad' ? 'error' : answer.tone === 'warn' ? 'tap' : 'soft')
    if (voiceOn) speak(answer.speech)
  }, [addEntry, recentIds, rabbitName, voiceOn])

  const { listening, interim, error, start, stop } = useSpeechRecognition(ask)

  const undo = useCallback((exchange: Exchange) => {
    exchange.loggedIds.forEach(id => removeEntry(id))
    setHistory(prev => prev.map(x => (x.id === exchange.id ? { ...x, undone: true } : x)))
    haptic('soft')
  }, [removeEntry])

  const toggleVoice = useCallback(() => {
    setVoiceOn(prev => {
      const next = !prev
      saveVoiceOn(next)
      if (!next) stopSpeaking()
      return next
    })
  }, [])

  const toggleMic = useCallback(() => {
    stopSpeaking()
    if (listening) { stop(); return }
    haptic('tap')
    start()
  }, [listening, start, stop])

  const submitTyped = useCallback(() => {
    ask(typed)
    setTyped('')
  }, [ask, typed])

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Retour
        </button>
        {speechOk && (
          <button className={styles.voiceToggle} onClick={toggleVoice} aria-pressed={voiceOn}>
            {voiceOn ? '🔊 Voix' : '🔇 Muet'}
          </button>
        )}
      </div>

      <h1 className={styles.title}>Dis {rabbitName} !</h1>
      <p className={styles.subtitle}>Pose une question à voix haute, ou écris-la.</p>

      {/* Chipie + micro */}
      <div className={styles.stage}>
        <div className={`${styles.rings} ${listening ? styles.ringsOn : ''}`} aria-hidden="true" />
        <div ref={avatarRef} className={styles.avatar}>
          <img src={avatar} alt={rabbitName} className={styles.avatarImg} draggable={false} />
        </div>
        {recognitionOk && (
          <button
            className={`${styles.mic} ${listening ? styles.micOn : ''}`}
            onClick={toggleMic}
            aria-label={listening ? 'Arrêter l’écoute' : 'Parler'}
          >
            {listening ? '⏹️' : '🎤'}
          </button>
        )}
      </div>

      <p className={styles.status} role="status">
        {listening
          ? (interim || 'Je t’écoute…')
          : recognitionOk ? 'Touche le micro pour parler' : 'La dictée vocale n’est pas disponible ici : écris ta question.'}
      </p>
      {error && <p className={styles.error}>{error}</p>}

      {/* Question écrite */}
      <form className={styles.form} onSubmit={e => { e.preventDefault(); submitTyped() }}>
        <input
          className={styles.input}
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder={`Ex : ${rabbitName} peut manger du fenouil ?`}
          aria-label="Ta question"
          enterKeyHint="send"
        />
        <button className={styles.send} type="submit" disabled={typed.trim() === ''}>Envoyer</button>
      </form>

      {/* Exemples */}
      {history.length === 0 && (
        <div className={styles.examples}>
          <p className={styles.examplesTitle}>Essaie :</p>
          {EXAMPLES.map(example => (
            <button key={example} className={styles.chip} onClick={() => ask(example)}>{example}</button>
          ))}
        </div>
      )}

      {/* Réponses */}
      <div className={styles.history}>
        {history.map(x => (
          <div key={x.id} className={styles.exchange}>
            <p className={styles.question}>🗣️ {x.question}</p>
            <div className={`${styles.answer} ${styles[`tone_${x.answer.tone}`]}`}>
              <p className={styles.answerText}>
                <span className={styles.answerEmoji}>{x.answer.emoji}</span> {x.answer.text}
              </p>

              {x.loggedIds.length > 0 && (
                x.undone
                  ? <p className={styles.undone}>Annulé : retiré du journal.</p>
                  : <button className={styles.undoBtn} onClick={() => undo(x)}>↩️ Annuler</button>
              )}

              {x.answer.vegetals && x.answer.vegetals.length > 0 && (
                <div className={styles.links}>
                  {x.answer.vegetals.slice(0, 6).map(v => (
                    <button key={v.id} className={styles.linkChip} onClick={() => navigate(`/detail/${v.id}`)}>{v.nom}</button>
                  ))}
                </div>
              )}
              {x.answer.link && (
                <button className={styles.linkChip} onClick={() => navigate(x.answer.link!.to)}>{x.answer.link.label} →</button>
              )}
              {speechOk && (
                <button className={styles.replay} onClick={() => speak(x.answer.speech)} aria-label="Réécouter">🔁 Réécouter</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className={styles.privacy}>
        Sur Chrome, la dictée vocale est faite par un service de Google : ta voix lui est envoyée pour être
        transcrite. Les réponses, elles, viennent uniquement des données de l'app. Tu peux toujours écrire ta question.
      </p>
    </div>
  )
}

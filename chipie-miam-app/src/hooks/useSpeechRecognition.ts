import { useCallback, useEffect, useRef, useState } from 'react'

// Types minimaux : la reconnaissance vocale n'est pas dans les types TypeScript standard
interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface RecognitionErrorEvent { error: string }

interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type RecognitionCtor = new () => RecognitionLike

function getCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isRecognitionSupported(): boolean {
  return getCtor() !== null
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Micro refusé. Autorise-le dans les paramètres du site, ou écris ta question.',
  'service-not-allowed': 'Micro refusé. Autorise-le dans les paramètres du site, ou écris ta question.',
  'no-speech': 'Je n’ai rien entendu. Réessaie en parlant près du micro.',
  'audio-capture': 'Aucun micro trouvé. Tu peux écrire ta question.',
  'network': 'Pas de connexion : la dictée vocale a besoin d’internet. Tu peux écrire ta question.',
  'language-not-supported': 'La dictée en français n’est pas disponible sur cet appareil.',
}

/** Dictée vocale en français : renvoie la phrase finale à `onFinal`. */
export function useSpeechRecognition(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<RecognitionLike | null>(null)
  const finalRef = useRef(onFinal)

  useEffect(() => { finalRef.current = onFinal })
  useEffect(() => () => { recRef.current?.abort() }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) return
    recRef.current?.abort()

    const rec = new Ctor()
    rec.lang = 'fr-FR'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1

    let finalText = ''
    rec.onresult = e => {
      let partial = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else partial += r[0].transcript
      }
      setInterim(finalText + partial)
    }
    rec.onerror = e => {
      setError(ERRORS[e.error] ?? 'La dictée vocale a échoué. Tu peux écrire ta question.')
      finalText = ''
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
      recRef.current = null
      const text = finalText.trim()
      if (text) finalRef.current(text)
    }

    setError(null)
    setInterim('')
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setError('Impossible de démarrer le micro. Réessaie.')
      recRef.current = null
    }
  }, [])

  const stop = useCallback(() => { recRef.current?.stop() }, [])

  return { listening, interim, error, start, stop }
}

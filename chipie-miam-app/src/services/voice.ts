/** Lecture des réponses à voix haute (synthèse vocale du navigateur, en français). */

const VOICE_KEY = 'chipie_voice_on'

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function loadVoiceOn(): boolean {
  try { return localStorage.getItem(VOICE_KEY) !== '0' } catch { return true }
}

export function saveVoiceOn(on: boolean): void {
  try { localStorage.setItem(VOICE_KEY, on ? '1' : '0') } catch { /* stockage indisponible */ }
}

// On ne lit ni les emojis ni les guillemets typographiques
function cleanForSpeech(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}

export function speak(text: string): void {
  if (!isSpeechSupported()) return
  const clean = cleanForSpeech(text)
  if (!clean) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(clean)
  utterance.lang = 'fr-FR'
  utterance.rate = 1.02
  const french = synth.getVoices().find(v => v.lang.toLowerCase().startsWith('fr'))
  if (french) utterance.voice = french
  synth.speak(utterance)
}

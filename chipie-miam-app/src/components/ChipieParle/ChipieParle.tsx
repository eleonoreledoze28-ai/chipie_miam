import { useState, useEffect, useCallback } from 'react'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { assetUrl } from '../../utils/assetUrl'
import styles from './ChipieParle.module.css'

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function buildMessages(nom: string): string[] {
  const msgs: string[] = []
  const h = new Date().getHours()
  const today = todayStr()

  // Time-based greeting
  if (h >= 5 && h < 12)  msgs.push(`Bonjour ! 🌅 Prêt(e) pour nourrir ${nom} ?`)
  else if (h >= 12 && h < 18) msgs.push(`Coucou ! ☀️ ${nom} pense à toi.`)
  else if (h >= 18 && h < 22) msgs.push(`Bonsoir ! 🌆 ${nom} attend son repas du soir.`)
  else msgs.push(`Il est tard… 🌙 ${nom} dort (enfin, essaie).`)

  // Journal check
  try {
    const raw = localStorage.getItem(`chipie_journal_${getActiveProfileId()}`)
    const entries: { date: string }[] = raw ? JSON.parse(raw) : []
    const todayCount = entries.filter(e => e.date === today).length
    if (todayCount === 0) {
      msgs.push(`Psst… j'ai pas encore eu mes légumes aujourd'hui 🥕`)
      msgs.push(`Tu m'oublies pas hein ? J'ai faim ! 😢`)
    } else if (todayCount < 3) {
      msgs.push(`Merci pour les légumes ! J'en reprendrais bien encore 😋`)
    } else {
      msgs.push(`Miam miam ! Aujourd'hui c'était un festin 🎉`)
      msgs.push(`${todayCount} portions aujourd'hui — je suis comblé(e) ! 🥬`)
    }
  } catch { /* ignore */ }

  // Checklist check
  try {
    const raw = localStorage.getItem(`chipie-checklist-${today}`)
    const done: string[] = raw ? JSON.parse(raw) : []
    if (!done.includes('foin'))  msgs.push(`Mon foin est renouvelé aujourd'hui ? 🌾`)
    if (!done.includes('eau'))   msgs.push(`J'aurais bien besoin d'eau fraîche 💧`)
    if (!done.includes('sortie')) msgs.push(`Une petite sortie de cage ça te tente ? 🐇`)
    if (done.length === 4)       msgs.push(`Toute la checklist faite ! Tu es le/la meilleur(e) 🏆`)
  } catch { /* ignore */ }

  // Foin stock check
  try {
    const raw = localStorage.getItem(`chipie-foin-${getActiveProfileId()}`)
    if (raw) {
      const achats: { kg: number }[] = JSON.parse(raw)
      const totalG = achats.reduce((s, a) => s + a.kg * 1000, 0)
      if (totalG < 500) msgs.push(`Mon stock de foin est presque vide ! 🌾`)
    }
  } catch { /* ignore */ }

  // Random cute
  msgs.push(`Je t'aime ! ❤️`)
  msgs.push(`Tu as vu comme je suis mignon(ne) ? 🥰`)
  msgs.push(`Ronron ronron… 😌`)
  msgs.push(`J'ai exploré toute ma cage aujourd'hui ! 🐇`)
  msgs.push(`Tu veux jouer ? 🎾`)
  msgs.push(`Un câlin, ça te dit ? 🤗`)
  msgs.push(`Je grignote mon foin tranquillement 🌾`)
  msgs.push(`Le pissenlit c'était vraiment top aujourd'hui 🌼`)

  // Shuffle
  return msgs.sort(() => Math.random() - 0.5)
}

const SESSION_KEY = 'chipie-parle-dismissed'

export default function ChipieParle() {
  const { profil } = useProfil()
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem(SESSION_KEY) === '1'
  )
  const [messages, setMessages] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (dismissed) return
    const msgs = buildMessages(profil.nom)
    setMessages(msgs)
    // Show after a short delay on load
    const t = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(t)
  }, [profil.nom, profil.avatar, dismissed])

  // Auto-cycle every 10s
  useEffect(() => {
    if (!visible || dismissed || messages.length === 0) return
    const t = setInterval(() => {
      setIndex(i => (i + 1) % messages.length)
    }, 10000)
    return () => clearInterval(t)
  }, [visible, dismissed, messages.length])

  const next = useCallback(() => {
    setIndex(i => (i + 1) % messages.length)
  }, [messages.length])

  const dismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setVisible(false)
    setTimeout(() => {
      setDismissed(true)
      sessionStorage.setItem(SESSION_KEY, '1')
    }, 300)
  }, [])

  if (dismissed || !visible || messages.length === 0) return null

  const avatarSrc = profil.avatar
    ? assetUrl(profil.avatar)
    : DEFAULT_AVATAR

  return (
    <div className={`${styles.wrap} ${visible ? styles.wrapIn : ''}`} onClick={next}>
      <div className={styles.bubble}>
        <p className={styles.text}>{messages[index]}</p>
        <button className={styles.close} onClick={dismiss}>✕</button>
      </div>
      <div className={styles.avatarWrap}>
        <img src={avatarSrc} alt={profil.nom} className={styles.avatar}
          style={profil.couleur ? { borderColor: profil.couleur } as React.CSSProperties : undefined} />
      </div>
    </div>
  )
}

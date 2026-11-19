import { getStatut } from '../utils/stock'
import type { StockItem } from '../utils/stock'
import { getFx } from './fxSettings'
import { refreshWeather } from './weather'

const SETTINGS_KEY = 'chipie_notif_settings'

export interface NotifSettings {
  feedingEnabled: boolean
  feedingTime: string      // "HH:MM"
  feedingFiredDate: string // "YYYY-MM-DD" — last day feeding notif was shown
  weighEnabled: boolean         // rappel de pesée mensuelle
  pharmacieEnabled: boolean     // pharmacie : péremption, stock bas
  weatherAlertEnabled: boolean  // chaleur / gel (nécessite la météo réelle)
  weatherFiredDate: string      // "YYYY-MM-DD" — dernier jour où l'alerte météo a été montrée
}

const DEFAULTS: NotifSettings = {
  feedingEnabled: true,
  feedingTime: '08:00',
  feedingFiredDate: '',
  weighEnabled: true,
  pharmacieEnabled: true,
  weatherAlertEnabled: true,
  weatherFiredDate: '',
}

// Seuils des rappels intelligents
export const WEIGH_EVERY_DAYS = 30        // pesée recommandée au moins une fois par mois
const WEIGH_REPEAT_DAYS = 7               // ne pas rappeler plus d'une fois par semaine
const PHARMACIE_WARNING_DAYS = 7          // péremption proche : prévenir 7 jours avant
export const HEAT_ALERT_C = 28            // un lapin supporte mal plus de ~25 °C
export const FROST_ALERT_C = 0

export function getSettings(): NotifSettings {
  try {
    const s = localStorage.getItem(SETTINGS_KEY)
    if (!s) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(s) as Partial<NotifSettings>) }
  } catch { return { ...DEFAULTS } }
}

export function saveSettings(s: NotifSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch { /* */ }
}

export function getPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return await Notification.requestPermission()
}

async function showNotif(
  title: string,
  options: NotificationOptions & { data?: unknown }
): Promise<void> {
  if (getPermission() !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg?.showNotification) {
      await reg.showNotification(title, options)
    } else {
      new Notification(title, options)
    }
  } catch { /* */ }
}

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const icon = `${import.meta.env.BASE_URL}icon-192.png`

// Check carnet santé reminders — fires for any due/overdue reminder not yet notified today
async function checkCarnetReminders(today: string): Promise<void> {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('chipie_reminders_')) continue
    try {
      const reminders = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{
        id: string; title: string; date?: string; done?: boolean
      }>
      for (const r of reminders) {
        if (r.done || !r.date) continue
        const reminderDate = r.date.slice(0, 10)
        if (reminderDate > today) continue

        const firedKey = `chipie_notif_fired_${r.id}`
        if (localStorage.getItem(firedKey) === today) continue

        const daysDiff = Math.round(
          (new Date(today).getTime() - new Date(reminderDate).getTime()) / 86400000
        )
        const body =
          daysDiff === 0
            ? "Rappel prévu aujourd'hui"
            : `En retard de ${daysDiff} jour${daysDiff > 1 ? 's' : ''}`

        await showNotif(`🐰 ${r.title}`, {
          body,
          icon,
          badge: icon,
          tag: `carnet-${r.id}`,
          data: { url: '/carnet-sante' },
        })
        try { localStorage.setItem(firedKey, today) } catch { /* */ }
      }
    } catch { /* */ }
  }
}

let feedingTimer: number | null = null

// Schedule or fire the daily feeding reminder
async function checkFeedingReminder(today: string): Promise<void> {
  const settings = getSettings()
  if (!settings.feedingEnabled) return
  if (settings.feedingFiredDate === today) return

  const now = new Date()
  const [hh, mm] = settings.feedingTime.split(':').map(Number)
  const fireTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0)
  const msUntil = fireTime.getTime() - now.getTime()

  const doFire = async () => {
    await showNotif("🥕 C'est l'heure pour Chipie !", {
      body: "N'oublie pas de nourrir Chipie aujourd'hui 🐰",
      icon,
      badge: icon,
      tag: 'chipie-feeding',
      data: { url: '/journal' },
    })
    saveSettings({ ...getSettings(), feedingFiredDate: todayLocal() })
  }

  if (feedingTimer !== null) { window.clearTimeout(feedingTimer); feedingTimer = null }

  if (msUntil <= 0) {
    await doFire()
  } else {
    feedingTimer = window.setTimeout(() => {
      feedingTimer = null
      const fresh = getSettings()
      if (fresh.feedingEnabled && fresh.feedingFiredDate !== todayLocal()) {
        void doFire()
      }
    }, msUntil)
  }
}

const FASTING_FIRED_KEY = 'chipie_fasting_notif_fired'

// Alert if no journal entry has been recorded in the last 12 hours
async function checkFastingAlert(): Promise<void> {
  const firedKey = FASTING_FIRED_KEY
  const lastFired = localStorage.getItem(firedKey)
  const now = Date.now()

  // Don't fire more than once every 12 hours
  if (lastFired && now - Number(lastFired) < 12 * 60 * 60 * 1000) return

  // Find the most recent journal entry across all profiles
  let latestTimestamp = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('chipie_journal_')) continue
    try {
      const entries = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ timestamp?: number }>
      for (const e of entries) {
        if (e.timestamp && e.timestamp > latestTimestamp) latestTimestamp = e.timestamp
      }
    } catch { /* */ }
  }

  // No entries at all → no alert (new user)
  if (latestTimestamp === 0) return

  const hoursSince = (now - latestTimestamp) / (1000 * 60 * 60)
  if (hoursSince < 12) return

  await showNotif('⚠️ Chipie n\'a pas mangé !', {
    body: `Aucun repas enregistré depuis ${Math.floor(hoursSince)}h. Tout va bien ? 🐰`,
    icon,
    badge: icon,
    tag: 'chipie-fasting',
    data: { url: '/journal' },
  })
  try { localStorage.setItem(firedKey, String(now)) } catch { /* */ }
}

// Prénom du lapin d'un profil (pour personnaliser les messages)
function rabbitName(profileId: string): string {
  try {
    const raw = localStorage.getItem(`chipie_profil_${profileId}`)
    const nom = raw ? (JSON.parse(raw) as { nom?: string }).nom : ''
    return nom || 'Chipie'
  } catch {
    return 'Chipie'
  }
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86_400_000)
}

// Pesée : prévient si la dernière pesée date de plus de 30 jours (au plus une fois par semaine)
async function checkWeighReminder(today: string): Promise<void> {
  if (!getSettings().weighEnabled) return
  const PREFIX = 'chipie_weights_'
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(PREFIX)) continue
    const profileId = key.slice(PREFIX.length)
    try {
      const weights = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ date?: string }>
      const last = weights.reduce((max, w) => (w.date && w.date > max ? w.date : max), '')
      if (!last) continue // aucune pesée enregistrée : rien à rappeler

      const since = daysBetween(last, today)
      if (since < WEIGH_EVERY_DAYS) continue

      const firedKey = `chipie_notif_weigh_${profileId}`
      const lastFired = localStorage.getItem(firedKey)
      if (lastFired && daysBetween(lastFired, today) < WEIGH_REPEAT_DAYS) continue

      const nom = rabbitName(profileId)
      await showNotif(`⚖️ Pesée du mois pour ${nom}`, {
        body: `La dernière pesée date de ${since} jours. Un poids régulier est le meilleur signe de bonne santé.`,
        icon,
        badge: icon,
        tag: `chipie-weigh-${profileId}`,
        data: { url: '/carnet-sante' },
      })
      try { localStorage.setItem(firedKey, today) } catch { /* */ }
    } catch { /* */ }
  }
}

// Pharmacie : articles périmés, bientôt périmés, épuisés ou en stock bas (une fois par jour et par profil)
async function checkPharmacie(today: string): Promise<void> {
  if (!getSettings().pharmacieEnabled) return
  const PREFIX = 'chipie-pharmacie-'
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(PREFIX)) continue
    const profileId = key.slice(PREFIX.length)
    try {
      const firedKey = `chipie_notif_pharma_${profileId}`
      if (localStorage.getItem(firedKey) === today) continue

      const items = JSON.parse(localStorage.getItem(key) ?? '[]') as StockItem[]
      const issues = items
        .map(item => ({ item, statut: getStatut(item, today, PHARMACIE_WARNING_DAYS) }))
        .filter(x => x.statut !== 'ok')
      if (issues.length === 0) continue

      const LABELS = { perime: 'périmé', rupture: 'épuisé', bientot: 'bientôt périmé', bas: 'stock bas', ok: '' }
      const shown = issues.slice(0, 3).map(x => `${x.item.nom} (${LABELS[x.statut]})`)
      const more = issues.length > 3 ? ` et ${issues.length - 3} autre${issues.length - 3 > 1 ? 's' : ''}` : ''

      await showNotif('💊 Pharmacie à vérifier', {
        body: `${shown.join(', ')}${more}`,
        icon,
        badge: icon,
        tag: `chipie-pharmacie-${profileId}`,
        data: { url: '/pharmacie' },
      })
      try { localStorage.setItem(firedKey, today) } catch { /* */ }
    } catch { /* */ }
  }
}

// Météo : forte chaleur ou gel (une fois par jour, seulement si la météo réelle est activée)
async function checkWeatherAlert(today: string): Promise<void> {
  const settings = getSettings()
  if (!settings.weatherAlertEnabled || !getFx().weather) return
  if (settings.weatherFiredDate === today) return

  const weather = await refreshWeather()
  if (!weather) return

  let title = ''
  let body = ''
  if (weather.maxC >= HEAT_ALERT_C) {
    title = '🌡️ Forte chaleur prévue'
    body = `${Math.round(weather.maxC)} °C aujourd'hui : eau fraîche, pièce à l'ombre, bouteille d'eau congelée à côté de la cage. Un lapin supporte mal plus de 25 °C.`
  } else if (weather.minC <= FROST_ALERT_C) {
    title = '🥶 Gel prévu'
    body = `${Math.round(weather.minC)} °C cette nuit : abri bien sec et à l'abri du vent, litière épaisse, eau qui ne gèle pas.`
  } else {
    return
  }

  await showNotif(title, { body, icon, badge: icon, tag: 'chipie-weather', data: { url: '/conseils-saison' } })
  saveSettings({ ...getSettings(), weatherFiredDate: today })
}

// Call once on app start (and when the app comes back to the foreground) — fires any pending notifications
export async function checkAndFirePending(): Promise<void> {
  if (getPermission() !== 'granted') return
  const today = todayLocal()
  await Promise.all([
    checkCarnetReminders(today),
    checkFeedingReminder(today),
    checkFastingAlert(),
    checkWeighReminder(today),
    checkPharmacie(today),
    checkWeatherAlert(today),
  ])
}

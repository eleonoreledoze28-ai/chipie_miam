const SETTINGS_KEY = 'chipie_notif_settings'

export interface NotifSettings {
  feedingEnabled: boolean
  feedingTime: string      // "HH:MM"
  feedingFiredDate: string // "YYYY-MM-DD" — last day feeding notif was shown
}

const DEFAULTS: NotifSettings = {
  feedingEnabled: true,
  feedingTime: '08:00',
  feedingFiredDate: '',
}

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

  if (msUntil <= 0) {
    await doFire()
  } else {
    setTimeout(() => {
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

// Call once on app start — fires any pending notifications
export async function checkAndFirePending(): Promise<void> {
  if (getPermission() !== 'granted') return
  const today = todayLocal()
  await Promise.all([
    checkCarnetReminders(today),
    checkFeedingReminder(today),
    checkFastingAlert(),
  ])
}

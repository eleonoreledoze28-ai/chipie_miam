const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const JOURS_COURTS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${JOURS_COURTS[d.getDay()]} ${d.getDate()}`
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

export function formatMonthFr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const m = MOIS[d.getMonth()]
  return `${m.charAt(0).toUpperCase() + m.slice(1)} ${d.getFullYear()}`
}

export function getMonthDays(dateInMonth: string): string[] {
  const d = new Date(dateInMonth + 'T00:00:00')
  const year = d.getFullYear()
  const month = d.getMonth()

  // First day of month
  const first = new Date(year, month, 1)
  // Offset to Monday-start: 0=Mon, 1=Tue, ..., 6=Sun
  const startOffset = (first.getDay() + 6) % 7

  // Last day of month
  const last = new Date(year, month + 1, 0)
  const totalDays = last.getDate()

  // Padding end to complete the last week
  const endOffset = (7 - ((startOffset + totalDays) % 7)) % 7

  const days: string[] = []

  // Padding before (previous month)
  for (let i = startOffset - 1; i >= 0; i--) {
    const dd = new Date(year, month, -i)
    days.push(dd.toISOString().split('T')[0])
  }

  // Days of month
  for (let i = 1; i <= totalDays; i++) {
    const dd = new Date(year, month, i)
    days.push(dd.toISOString().split('T')[0])
  }

  // Padding after (next month)
  for (let i = 1; i <= endOffset; i++) {
    const dd = new Date(year, month + 1, i)
    days.push(dd.toISOString().split('T')[0])
  }

  return days
}

export function getWeekDays(dateInWeek: string): string[] {
  const d = new Date(dateInWeek + 'T00:00:00')
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))

  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    days.push(dd.toISOString().split('T')[0])
  }
  return days
}

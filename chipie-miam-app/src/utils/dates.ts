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

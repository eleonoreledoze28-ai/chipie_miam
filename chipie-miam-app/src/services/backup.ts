/**
 * Sauvegarde et restauration de toutes les données de l'app (stockées dans le navigateur).
 *
 * Format v2 : { format, version, exportedAt, data: { clé: "texte brut" } }
 * Les valeurs sont gardées telles quelles (texte brut), ce qui évite de les abîmer à la restauration.
 * Le format v1 (ancienne sauvegarde : { clé: valeur }) reste lisible.
 */

export const BACKUP_FORMAT = 'chipie-miam-backup'
export const BACKUP_VERSION = 2
const LAST_BACKUP_KEY = 'chipie_last_backup'

// Les données de l'app commencent toutes par « chipie » (quelques anciennes clés de jeux n'ont pas ce préfixe)
const LEGACY_KEYS = new Set(['soin_best', 'marche_best'])

// Ne jamais sauvegarder : la position (vie privée), les caches, et les marqueurs « notification déjà envoyée »
const EXCLUDED = [
  /^chipie_weather_/,
  /^chipie_notif_(fired|weigh|pharma)_/,
  /^chipie_fasting_notif_fired$/,
  /^chipie-last-open-/,
  /^chipie-parle-dismissed$/,
  /^chipie-checklist-/,   // coches du jour
  /^chipie_last_backup$/,
]

export function isBackupKey(key: string): boolean {
  if (EXCLUDED.some(re => re.test(key))) return false
  return key.startsWith('chipie_') || key.startsWith('chipie-') || LEGACY_KEYS.has(key)
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  data: Record<string, string>
}

export interface BackupSummary {
  count: number
  bytes: number
}

export function createBackup(): { file: BackupFile; summary: BackupSummary } {
  const data: Record<string, string> = {}
  let bytes = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !isBackupKey(key)) continue
    const value = localStorage.getItem(key)
    if (value === null) continue
    data[key] = value
    bytes += key.length + value.length
  }
  const file: BackupFile = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }
  return { file, summary: { count: Object.keys(data).length, bytes } }
}

/** Télécharge un fichier de sauvegarde et retient la date de la dernière sauvegarde. */
export function downloadBackup(): BackupSummary {
  const { file, summary } = createBackup()
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chipie-miam-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()) } catch { /* stockage indisponible */ }
  return summary
}

export function getLastBackupDate(): string | null {
  try { return localStorage.getItem(LAST_BACKUP_KEY) } catch { return null }
}

export class BackupError extends Error {}

/** Lit le contenu d'un fichier de sauvegarde (v2 ou ancien format) et renvoie les valeurs à restaurer. */
export function parseBackup(text: string): Record<string, string> {
  let json: unknown
  try { json = JSON.parse(text) } catch { throw new BackupError('Ce fichier n’est pas une sauvegarde valide.') }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new BackupError('Ce fichier n’est pas une sauvegarde valide.')
  }

  const root = json as Record<string, unknown>
  const entries: Record<string, string> = {}

  if (root.format === BACKUP_FORMAT) {
    if (typeof root.version === 'number' && root.version > BACKUP_VERSION) {
      throw new BackupError('Cette sauvegarde vient d’une version plus récente de l’app. Mets l’app à jour puis réessaie.')
    }
    const data = root.data
    if (typeof data !== 'object' || data === null) throw new BackupError('La sauvegarde est vide ou abîmée.')
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isBackupKey(key) && typeof value === 'string') entries[key] = value
    }
  } else {
    // Ancien format : { clé: valeur déjà décodée }
    for (const [key, value] of Object.entries(root)) {
      if (!isBackupKey(key)) continue
      entries[key] = typeof value === 'string' ? value : JSON.stringify(value)
    }
  }

  if (Object.keys(entries).length === 0) throw new BackupError('Aucune donnée de Chipie Miam trouvée dans ce fichier.')
  return entries
}

export interface RestoreResult {
  restored: number
  failed: string[]
}

/** Écrit les données dans le navigateur. Les clés absentes de la sauvegarde ne sont pas touchées. */
export function restoreBackup(entries: Record<string, string>): RestoreResult {
  const failed: string[] = []
  let restored = 0
  for (const [key, value] of Object.entries(entries)) {
    try {
      localStorage.setItem(key, value)
      restored++
    } catch {
      failed.push(key) // en général : stockage plein (beaucoup de photos)
    }
  }

  // La position n'est jamais sauvegardée : on ne laisse pas la météo « activée » sans position
  try {
    const raw = localStorage.getItem('chipie_fx_settings')
    if (raw) {
      const fx = JSON.parse(raw) as Record<string, unknown>
      if (fx.weather) localStorage.setItem('chipie_fx_settings', JSON.stringify({ ...fx, weather: false }))
    }
  } catch { /* réglages abîmés : ignorés */ }

  return { restored, failed }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

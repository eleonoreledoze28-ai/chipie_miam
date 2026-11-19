import { addDays } from './dates'

export type TypeStock = 'medicament' | 'soin' | 'aliment' | 'litiere' | 'autre'

export interface StockItem {
  id: string
  nom: string
  type: TypeStock
  quantite: number
  unite: string
  seuil: number          // alerte quand quantite <= seuil
  peremption: string     // YYYY-MM-DD, '' si non applicable
  notes: string
}

export type Statut = 'perime' | 'rupture' | 'bientot' | 'bas' | 'ok'

/** Nombre de jours avant la péremption à partir duquel un article est « bientôt périmé ». */
export const EXPIRY_WARNING_DAYS = 30

export function getStatut(item: StockItem, today: string, warningDays = EXPIRY_WARNING_DAYS): Statut {
  if (item.peremption && item.peremption < today) return 'perime'
  if (item.quantite <= 0) return 'rupture'
  if (item.peremption && item.peremption <= addDays(today, warningDays)) return 'bientot'
  if (item.seuil > 0 && item.quantite <= item.seuil) return 'bas'
  return 'ok'
}

export function loadStock(profileId: string): StockItem[] {
  try {
    const raw = localStorage.getItem(`chipie-pharmacie-${profileId}`)
    return raw ? (JSON.parse(raw) as StockItem[]) : []
  } catch {
    return []
  }
}

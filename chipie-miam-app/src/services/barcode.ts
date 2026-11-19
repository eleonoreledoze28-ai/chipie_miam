import type { TypeStock } from '../utils/stock'

/**
 * Codes-barres : catalogue personnel (retenu sur l'appareil) puis recherche du nom du produit
 * dans Open Pet Food Facts et Open Food Facts (bases ouvertes et gratuites).
 * Seul le numéro du code-barres est envoyé à ces services, uniquement quand on scanne.
 */

export interface Product {
  nom: string
  type: TypeStock
  quantite?: number
  unite?: string
  source: 'local' | 'openpetfoodfacts' | 'openfoodfacts'
}

interface CatalogEntry { nom: string; type: TypeStock; unite: string }

const CATALOG_KEY = 'chipie_barcodes'
const TIMEOUT_MS = 6000

// ── Catalogue personnel ──────────────────────────────────────────────────────
function loadCatalog(): Record<string, CatalogEntry> {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    return raw ? (JSON.parse(raw) as Record<string, CatalogEntry>) : {}
  } catch {
    return {}
  }
}

/** Retient le nom d'un code-barres pour le reconnaître au prochain scan (même sans réseau). */
export function rememberProduct(code: string, entry: CatalogEntry): void {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify({ ...loadCatalog(), [code]: entry }))
  } catch { /* stockage indisponible */ }
}

// ── Codes ────────────────────────────────────────────────────────────────────
/** Nettoie un code saisi ou lu : renvoie null s'il n'a pas la forme d'un code-barres. */
export function normalizeCode(raw: string): string | null {
  const code = raw.replace(/\s+/g, '').toUpperCase()
  return /^[0-9A-Z-]{6,40}$/.test(code) ? code : null
}

// ── Recherche en ligne ───────────────────────────────────────────────────────
interface OffResponse {
  status?: number
  product?: { product_name?: string; brands?: string; quantity?: string }
}

async function fetchOff(host: string, code: string): Promise<OffResponse | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,quantity`,
      { signal: controller.signal },
    )
    return res.ok ? ((await res.json()) as OffResponse) : null
  } catch {
    return null // hors-ligne, délai dépassé ou service indisponible
  } finally {
    window.clearTimeout(timer)
  }
}

// « 2 kg », « 500 g », « 1,5 l »… → { quantite: 2, unite: 'kg' }
function parseQuantity(text: string | undefined): { quantite: number; unite: string } | null {
  const m = text?.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|cl)\b/i)
  if (!m) return null
  const quantite = parseFloat(m[1].replace(',', '.'))
  return Number.isFinite(quantite) && quantite > 0 ? { quantite, unite: m[2].toLowerCase() } : null
}

function toProduct(data: OffResponse | null, source: Product['source']): Product | null {
  if (!data || data.status !== 1 || !data.product?.product_name?.trim()) return null
  const brand = data.product.brands?.split(',')[0]?.trim()
  const name = data.product.product_name.trim()
  const nom = (brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${name}` : name).slice(0, 60)
  return { nom, type: 'aliment', ...parseQuantity(data.product.quantity), source }
}

/** Cherche un produit : catalogue personnel d'abord, puis les bases ouvertes (en parallèle). */
export async function lookupProduct(code: string): Promise<Product | null> {
  const known = loadCatalog()[code]
  if (known) return { nom: known.nom, type: known.type, unite: known.unite, source: 'local' }

  const [pet, food] = await Promise.all([
    fetchOff('world.openpetfoodfacts.org', code),
    fetchOff('world.openfoodfacts.org', code),
  ])
  return toProduct(pet, 'openpetfoodfacts') ?? toProduct(food, 'openfoodfacts')
}

// ── Caméra ───────────────────────────────────────────────────────────────────
export interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>
}

type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike

export const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']

/** Le scan par caméra dépend de l'appareil (Chrome sur Android : oui ; iPhone et Firefox : non). */
export function getBarcodeDetector(): BarcodeDetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  return ctor && typeof navigator.mediaDevices?.getUserMedia === 'function' ? ctor : null
}

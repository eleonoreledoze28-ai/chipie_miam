import { CATEGORIES } from '../data/vegetaux'
import type { Vegetal } from '../data/vegetaux'

/**
 * Recherche de texte pour toute l'app : sans accents ni majuscules, tolérante aux pluriels
 * (« carottes »), aux fautes de frappe (« carrote ») et aux saisies incomplètes (« epina »).
 */

// ── Briques de base ──────────────────────────────────────────────────────────
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Singulier approximatif : « carottes » → « carotte », « choux » → « chou ». */
export function stemWord(token: string): string {
  return token.length > 3 && /[sx]$/.test(token) ? token.slice(0, -1) : token
}

export function tokenize(text: string): string[] {
  const n = normalizeText(text)
  return n ? n.split(' ').map(stemWord) : []
}

/** Distance de Levenshtein : nombre minimal d'insertions, suppressions et remplacements. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

// ── Comparaison mot à mot ────────────────────────────────────────────────────
// Lettres doublées réduites pour comparer : « carrote » et « carotte » deviennent « carote »
const collapse = (s: string) => s.replace(/(.)\1+/g, '$1')

/** 3 : identique · 2 : début du mot · 1,5 : contenu dans le mot · 1 : une faute · 0,8 : début avec une faute · 0 : rien */
function tokenScore(q: string, t: string): number {
  if (q === t) return 3
  if (t.startsWith(q)) return 2
  if (q.length >= 4 && t.includes(q)) return 1.5
  const allowed = q.length >= 9 ? 2 : q.length >= 5 ? 1 : 0
  if (allowed > 0) {
    const cq = collapse(q)
    if (editDistance(cq, collapse(t)) <= allowed) return 1
    // saisie incomplète avec une faute : « carro » ~ « carotte »
    if (t.length > q.length && editDistance(cq, collapse(t.slice(0, q.length))) <= 1) return 0.8
  }
  return 0
}

/** Note d'une requête sur un texte : tous les mots de la requête doivent se retrouver (0 sinon). */
function scoreTokens(query: string[], text: string[]): number {
  if (query.length === 0 || text.length === 0) return 0
  let total = 0
  for (const q of query) {
    let best = 0
    for (const t of text) best = Math.max(best, tokenScore(q, t))
    if (best === 0) return 0
    total += best
  }
  return total / query.length
}

/** Vrai si tous les mots de la requête se retrouvent (à une faute près) dans l'un des textes. */
export function fuzzyIncludes(query: string, ...texts: string[]): boolean {
  const q = tokenize(query)
  if (q.length === 0) return true
  return scoreTokens(q, texts.flatMap(tokenize)) > 0
}

// ── Aliments ─────────────────────────────────────────────────────────────────
// Noms courants qui ne sont pas ceux de la fiche (clé : nom de la fiche, sans accent, en minuscules).
// « carotte » ne mène qu'aux fanes : la racine n'est pas dans la liste.
const SYNONYMES: Record<string, string[]> = {
  'fanes de carottes': ['carotte'],
  'fanes de fenouil': ['fenouil'],
  'fanes de radis': ['radis'],
  'fanes de navet': ['navet'],
  'fanes de betterave': ['betterave'],
  'pissenlit': ['dent de lion'],
  'racine de pissenlit': ['dent de lion'],
  'mache': ['doucette', 'rampon'],
  'roquette': ['rucola', 'arugula'],
  'topinambour': ['artichaut de jerusalem'],
  'souci': ['calendula'],
  'romaine': ['laitue'],
  'batavia': ['laitue'],
  'lollo rossa': ['laitue'],
  'rougette': ['laitue'],
  'feuille de chene': ['laitue'],
  'reine des glaces': ['laitue'],
}

type Via = 'nom' | 'synonyme' | 'latin' | 'categorie' | 'notes'

export interface VegetalHit {
  vegetal: Vegetal
  score: number
  via: Via
}

export interface VegetalSearch {
  results: VegetalHit[]
  /** Vrai si au moins un nom correspond directement (le début d'un nom compte) */
  exact: boolean
}

const WEIGHTS: Record<Via, number> = { nom: 1, synonyme: 0.85, latin: 0.7, categorie: 0.4, notes: 0.3 }
const MIN_SCORE = 0.7

interface Indexed { vegetal: Vegetal; nom: string[]; latin: string[]; synonymes: string[][]; categorie: string[]; notes: string[] }

const catById = new Map(CATEGORIES.map(c => [c.id, c]))
const indexCache = new WeakMap<readonly Vegetal[], Indexed[]>()

function indexOf(pool: readonly Vegetal[]): Indexed[] {
  let idx = indexCache.get(pool)
  if (!idx) {
    idx = pool.map(vegetal => ({
      vegetal,
      nom: tokenize(vegetal.nom),
      latin: tokenize(vegetal.nomLatin),
      synonymes: (SYNONYMES[normalizeText(vegetal.nom)] ?? []).map(tokenize),
      categorie: tokenize(catById.get(vegetal.categorie)?.nom ?? ''),
      notes: tokenize(vegetal.notes),
    }))
    indexCache.set(pool, idx)
  }
  return idx
}

/** Cherche des aliments : les meilleurs résultats d'abord, avec la raison pour laquelle ils sortent. */
export function searchVegetaux(query: string, pool: readonly Vegetal[]): VegetalSearch {
  const q = tokenize(query)
  if (q.length === 0) return { results: pool.map(vegetal => ({ vegetal, score: 1, via: 'nom' as Via })), exact: true }

  const strict = searchTokens(q, pool)
  if (strict.length > 0 || q.length === 1) {
    return { results: strict, exact: strict.some(r => r.via === 'nom' && r.score >= 2) }
  }

  // Rien avec tous les mots (« menthe poivrée ») : on retente mot par mot, en moins bien classé
  const merged = new Map<string, VegetalHit>()
  for (const word of q) {
    for (const hit of searchTokens([word], pool)) {
      const score = hit.score * 0.7
      const known = merged.get(hit.vegetal.id)
      if (!known || score > known.score) merged.set(hit.vegetal.id, { ...hit, score })
    }
  }
  const partial = [...merged.values()].sort((a, b) => b.score - a.score || a.vegetal.nom.localeCompare(b.vegetal.nom, 'fr'))
  return { results: partial, exact: false }
}

function searchTokens(q: string[], pool: readonly Vegetal[]): VegetalHit[] {
  const results: VegetalHit[] = []
  for (const item of indexOf(pool)) {
    const candidates: Array<[Via, number]> = [
      ['nom', scoreTokens(q, item.nom)],
      ['latin', scoreTokens(q, item.latin)],
      ['categorie', scoreTokens(q, item.categorie)],
      // les notes ne comptent que pour un mot entier : sinon trop de résultats parasites
      ['notes', q.every(t => t.length >= 4 && item.notes.includes(t)) ? 3 : 0],
    ]
    for (const syn of item.synonymes) candidates.push(['synonyme', scoreTokens(q, syn)])

    let best: VegetalHit | null = null
    for (const [via, raw] of candidates) {
      const score = raw * WEIGHTS[via]
      if (score >= MIN_SCORE && (!best || score > best.score)) best = { vegetal: item.vegetal, score, via }
    }
    if (best) results.push(best)
  }

  return results.sort((a, b) => b.score - a.score || a.vegetal.nom.localeCompare(b.vegetal.nom, 'fr'))
}

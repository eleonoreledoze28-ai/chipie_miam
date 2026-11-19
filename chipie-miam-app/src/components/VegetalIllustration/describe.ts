import type { Vegetal } from '../../data/vegetaux'
import { normalizeText } from '../../utils/textSearch'

/**
 * Décide comment dessiner un aliment : sa famille de forme, ses couleurs et une graine pour que deux
 * aliments de la même famille ne se ressemblent pas trait pour trait (mais restent identiques d'un affichage à l'autre).
 */

export type Family =
  | 'sprig' | 'feathery' | 'rosette' | 'leaf' | 'tops' | 'root' | 'tuber' | 'twig' | 'flower'
  | 'apple' | 'pear' | 'banana' | 'strawberry' | 'cherry' | 'grapes' | 'berries' | 'stone'
  | 'watermelon' | 'kiwi' | 'pineapple' | 'mango' | 'tomato' | 'melon'
  | 'pepper' | 'cucumber' | 'broccoli' | 'cabbage' | 'pod' | 'beans' | 'grain' | 'stalks' | 'chard'

export interface Look {
  family: Family
  seed: number
  /** Couleur principale du dessin */
  color: string
  /** Couleur secondaire (feuillage, intérieur, fleur…) */
  accent: string
  /** Teinte du fond (selon la catégorie) */
  tint: string
  /** Variantes de forme */
  rootShape?: 'round' | 'long'
  flower?: 'daisy' | 'pom' | 'spike' | 'mallow' | 'clover' | 'bell' | 'none'
}

// Graine stable à partir du texte (hash simple)
export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const TINT: Record<string, string> = {
  aromatiques: '#2f6b4f', potageres: '#3d7a3a', sauvages: '#5f7f2f', branchages: '#6b5a3a',
  salades: '#3f8f5a', racines: '#8a5a3a', fruits: '#b0543d',
}

const GREENS = ['#4cae4f', '#3e9a4a', '#5bb85d', '#2f8a47', '#6cc070']

function greenFor(seed: number): string {
  return GREENS[seed % GREENS.length]
}

const has = (n: string, ...words: string[]) => words.some(w => n.includes(w))

// Fruits : forme + couleur principale + couleur secondaire
const FRUITS: Array<[string[], Family, string, string]> = [
  [['pomme'], 'apple', '#d63a3a', '#e8f3c8'],
  [['poire'], 'pear', '#b9c94a', '#f2f0c4'],
  [['banane'], 'banana', '#f4d03f', '#8a6a1f'],
  [['fraise'], 'strawberry', '#e63950', '#4cae4f'],
  [['cerise'], 'cherry', '#b3122f', '#4cae4f'],
  [['raisin'], 'grapes', '#6a3d9a', '#4cae4f'],
  [['framboise'], 'berries', '#d81e5b', '#4cae4f'],
  [['mure'], 'berries', '#3a1c4a', '#4cae4f'],
  [['myrtille'], 'berries', '#3b4a9e', '#4cae4f'],
  [['peche'], 'stone', '#f6a06a', '#e6785a'],
  [['nectarine'], 'stone', '#f08a4b', '#d9602f'],
  [['abricot'], 'stone', '#f5a742', '#e0842a'],
  [['prune'], 'stone', '#6a2f6a', '#4a1f4a'],
  [['pasteque'], 'watermelon', '#e84b5b', '#2e8b3d'],
  [['kiwi'], 'kiwi', '#8bbf3a', '#6b4a2a'],
  [['ananas'], 'pineapple', '#f2b632', '#4cae4f'],
  [['mangue'], 'mango', '#f59a2c', '#e0702a'],
  [['papaye'], 'mango', '#f48a3c', '#e8601f'],
  [['melon'], 'melon', '#f2c46d', '#8bbf3a'],
  [['tomate'], 'tomato', '#e0382d', '#4cae4f'],
]

// Racines : forme + couleur
const ROOTS: Array<[string[], 'round' | 'long' | 'tuber', string, string]> = [
  [['betterave'], 'round', '#8b1a4a', '#4cae4f'],
  [['navet', 'rutabaga'], 'round', '#efe6f2', '#b57bd0'],
  [['celeri rave'], 'round', '#d9c9a3', '#4cae4f'],
  [['panais'], 'long', '#efe2c0', '#4cae4f'],
  [['persil tubereux'], 'long', '#eadbb8', '#4cae4f'],
  [['racine de pissenlit'], 'long', '#b08c63', '#6b4a2a'],
  [['topinambour'], 'tuber', '#b98a5a', '#8a6a3a'],
]

export function describe(v: Vegetal): Look {
  const n = normalizeText(v.nom)
  const seed = hashSeed(v.id)
  const tint = TINT[v.categorie] ?? '#3d7a3a'
  const base = { seed, tint }

  for (const [words, family, color, accent] of FRUITS) {
    if (has(n, ...words) && v.categorie === 'fruits') return { ...base, family, color, accent }
  }
  if (v.categorie === 'potageres' && has(n, 'tomate')) return { ...base, family: 'tomato', color: '#e0382d', accent: '#4cae4f' }

  for (const [words, shape, color, accent] of ROOTS) {
    if (has(n, ...words)) return { ...base, family: shape === 'tuber' ? 'tuber' : 'root', rootShape: shape === 'long' ? 'long' : 'round', color, accent }
  }

  // Légumes reconnaissables
  if (has(n, 'poivron')) return { ...base, family: 'pepper', color: '#e0382d', accent: '#4cae4f' }
  if (has(n, 'concombre')) return { ...base, family: 'cucumber', color: '#4a9a3f', accent: '#cfe8a8' }
  if (has(n, 'courgette')) return { ...base, family: 'cucumber', color: '#3a7f3a', accent: '#bfe0a0' }
  if (has(n, 'brocoli')) return { ...base, family: 'broccoli', color: '#2f8a47', accent: '#8bc34a' }
  if (n.split(' ').some(w => w === 'chou' || w === 'choux')) return { ...base, family: 'cabbage', color: '#7fbf6a', accent: '#d8efc2' }
  if (has(n, 'cosse', 'pois gourmand')) return { ...base, family: 'pod', color: '#6cc070', accent: '#a8e08a' }
  if (has(n, 'haricot')) return { ...base, family: 'beans', color: '#4cae4f', accent: '#8bd070' }
  // « ble » doit être un mot entier (sinon « blettes » ou « bleuet » seraient du blé)
  if (n.split(' ').includes('ble') || has(n, 'avoine')) return { ...base, family: 'grain', color: '#e0b84a', accent: '#c89a2a' }
  if (has(n, 'blette')) return { ...base, family: 'chard', color: '#2f8a47', accent: '#f4f0e0' }
  if (has(n, 'celeri branche')) return { ...base, family: 'stalks', color: '#9ccf6a', accent: '#5bb85d' }

  // Parties de plantes
  if (n.startsWith('fanes')) return { ...base, family: 'tops', color: greenFor(seed), accent: '#7fd070' }
  if (n.startsWith('feuille')) return { ...base, family: 'leaf', color: greenFor(seed), accent: '#8bd070' }
  if (has(n, 'aneth', 'fenouil', 'cerfeuil', 'carotte')) return { ...base, family: 'feathery', color: '#5bb85d', accent: '#a8e08a' }

  // Salades : couleur selon le nom
  if (v.categorie === 'salades') {
    const color = has(n, 'rougette', 'lollo', 'trevise') ? '#a83a5a' : has(n, 'endive') ? '#f0ecc0' : has(n, 'frisee', 'scarole') ? '#a8d070' : '#5bb85d'
    return { ...base, family: 'rosette', color, accent: has(n, 'rougette', 'lollo', 'trevise') ? '#d86a8a' : '#c8e8a0' }
  }

  // Fleurs sauvages : fleur selon le nom
  if (v.categorie === 'sauvages') {
    const flowers: Array<[string[], Look['flower'], string]> = [
      [['pissenlit'], 'pom', '#f7d21c'],
      [['camomille', 'achillee', 'echinacee'], 'daisy', '#fdfdf0'],
      [['souci'], 'daisy', '#f59a2c'],
      [['bleuet', 'bourrache', 'buglosse'], 'daisy', '#4a7fd8'],
      [['lavande', 'buddleia', 'consoude'], 'spike', '#9a6fd0'],
      [['mauve'], 'mallow', '#d878b8'],
      [['trefle'], 'clover', '#e888b8'],
      [['plantain', 'ortie', 'laiteron', 'tussilage', 'pourpier', 'mouron', 'luzerne', 'maceron', 'aigremoine', 'benoite', 'bourse', 'chicoree'], 'none', '#e8e8d0'],
    ]
    for (const [words, flower, color] of flowers) {
      if (has(n, ...words)) return { ...base, family: 'flower', flower, color: greenFor(seed), accent: color }
    }
    return { ...base, family: 'flower', flower: 'daisy', color: greenFor(seed), accent: '#f2e45a' }
  }

  if (v.categorie === 'branchages') {
    const autumn = has(n, 'erable', 'hetre', 'charme')
    return { ...base, family: 'twig', color: autumn ? '#c8742a' : greenFor(seed), accent: '#7a5a3a' }
  }
  if (v.categorie === 'fruits') return { ...base, family: 'apple', color: '#d6783a', accent: '#4cae4f' }
  if (v.categorie === 'racines') return { ...base, family: 'root', rootShape: 'round', color: '#d9b080', accent: '#4cae4f' }
  if (v.categorie === 'aromatiques') {
    const color = has(n, 'thym', 'sarriette', 'serpolet', 'origan', 'marjolaine') ? '#6f9a6a' : has(n, 'romarin') ? '#4a7a52' : greenFor(seed)
    return { ...base, family: 'sprig', color, accent: '#9ad88a' }
  }
  return { ...base, family: 'leaf', color: greenFor(seed), accent: '#8bd070' }
}

// Petit générateur pseudo-aléatoire reproductible
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

import { VEGETAUX } from '../data/vegetaux'
import type { Vegetal } from '../data/vegetaux'
import { getStatut, loadStock } from '../utils/stock'
import type { Appetit } from '../hooks/useJournal'

/**
 * Cerveau de « Dis Chipie ! » : comprend une phrase (dictée ou tapée) et répond avec les données
 * de l'app. Tout se passe sur l'appareil, sans service en ligne ni IA externe.
 */

export type Tone = 'ok' | 'warn' | 'bad' | 'info'

export interface Answer {
  tone: Tone
  emoji: string
  /** Texte affiché */
  text: string
  /** Texte lu à voix haute (sans emojis) */
  speech: string
  /** Aliments concernés (pour proposer un accès à leur fiche) */
  vegetals?: Vegetal[]
  /** Si présent, l'écran doit ajouter ces aliments au journal d'aujourd'hui */
  log?: { vegetals: Vegetal[]; appetit: Appetit }
  link?: { label: string; to: string }
}

export interface AssistantContext {
  profileId: string
  rabbitName: string
  today: string                 // YYYY-MM-DD
  recentVegetalIds: Set<string> // aliments donnés ces derniers jours (pour varier les idées de repas)
}

// ── Texte ────────────────────────────────────────────────────────────────────
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Singulier approximatif : « carottes » → « carotte », « choux » → « chou »
function stem(token: string): string {
  return token.length > 3 && /[sx]$/.test(token) ? token.slice(0, -1) : token
}

function tokens(text: string): string[] {
  const n = normalize(text)
  return n ? n.split(' ').map(stem) : []
}

function distance(a: string, b: string): number {
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

// Mots qui ne sont jamais des aliments (et ne doivent pas être pris pour des fautes de frappe)
const STOP = new Set([
  'chipie', 'peut', 'peux', 'puis', 'elle', 'lui', 'mange', 'manger', 'donne', 'donner', 'grignote', 'aime',
  'veut', 'est', 'ce', 'que', 'qu', 'il', 'le', 'la', 'les', 'des', 'du', 'de', 'un', 'une', 'au', 'aux',
  'et', 'ou', 'pour', 'dans', 'sur', 'avec', 'sans', 'bon', 'bien', 'mauvais', 'droit', 'aujourd', 'hui',
  'legume', 'fruit', 'plante', 'herbe', 'aliment', 'je', 'tu', 'on', 'a', 'ai', 'ont', 'pas', 'plus', 'tres',
  'moi', 'mon', 'ma', 'son', 'sa', 'ses', 'mes', 'ca', 'cela', 'tout', 'quoi', 'comment', 'journal',
  'avoir', 'avez', 'avons', 'refuse', 'boude', 'voulu', 'aime', 'dernier', 'derniere', 'manque', 'pharmacie',
  'poids', 'stock', 'dangereux', 'toxique', 'ajoute', 'ajouter', 'note', 'noter', 'mets', 'mettre', 'moitie',
])

// ── Index des aliments ───────────────────────────────────────────────────────
interface IndexEntry { vegetal: Vegetal; key: string[] }

function keysOf(nom: string): string[][] {
  const variants = new Set<string>()
  for (const part of nom.split('/')) {
    const withoutParens = part.replace(/\(.*?\)/g, ' ')
    variants.add(withoutParens)
    variants.add(part.replace(/[()]/g, ' ')) // « Navet (bulbe) » → « navet bulbe »
  }
  for (const v of [...variants]) {
    const t = tokens(v)
    // « Betterave crue » / « Haricots verts crus » : « crue » n'est pas utile pour reconnaître l'aliment
    if (t.length > 1 && /^cru(e)?$/.test(t[t.length - 1])) variants.add(t.slice(0, -1).join(' '))
  }
  return [...variants].map(v => tokens(v)).filter(k => k.length > 0)
}

const INDEX: IndexEntry[] = VEGETAUX
  .flatMap(vegetal => keysOf(vegetal.nom).map(key => ({ vegetal, key })))
  .sort((a, b) => b.key.length - a.key.length || b.key.join('').length - a.key.join('').length)

/** Retrouve les aliments cités dans une phrase (pluriels et petites erreurs de dictée tolérés). */
export function findVegetals(text: string): Vegetal[] {
  const toks = tokens(text)
  const used = new Array<boolean>(toks.length).fill(false)
  const found: Array<{ v: Vegetal; pos: number }> = []
  const add = (v: Vegetal, pos: number) => { if (!found.some(f => f.v === v)) found.push({ v, pos }) }

  // 1) Correspondance exacte, des noms les plus longs aux plus courts (« fanes de carottes » avant « carotte »)
  for (const { vegetal, key } of INDEX) {
    for (let i = 0; i + key.length <= toks.length; i++) {
      if (used.slice(i, i + key.length).some(Boolean)) continue
      if (key.every((k, j) => toks[i + j] === k)) {
        for (let j = 0; j < key.length; j++) used[i + j] = true
        add(vegetal, i)
        break
      }
    }
  }

  // 2) Une lettre de différence, pour les mots d'au moins 7 lettres (« estragon » dicté « estragone »)
  toks.forEach((tok, i) => {
    if (used[i] || tok.length < 7 || STOP.has(tok)) return
    let best: { vegetal: Vegetal; d: number } | null = null
    for (const { vegetal, key } of INDEX) {
      if (key.length !== 1 || key[0].length < 7) continue
      const d = distance(tok, key[0])
      if (d === 1 && (!best || d < best.d)) best = { vegetal, d }
    }
    if (best) { used[i] = true; add(best.vegetal, i) }
  })

  return found.sort((a, b) => a.pos - b.pos).map(f => f.v)
}

// Aliments dont un mot de la phrase fait partie du nom (pour proposer une alternative)
function similarTo(text: string): Vegetal[] {
  const candidates = tokens(text).filter(t => t.length >= 4 && !STOP.has(t))
  if (candidates.length === 0) return []
  const out: Vegetal[] = []
  for (const { vegetal, key } of INDEX) {
    if (key.some(k => candidates.includes(k)) && !out.includes(vegetal)) out.push(vegetal)
  }
  return out.slice(0, 4)
}

function candidateWord(text: string): string | null {
  const words = normalize(text).split(' ').filter(t => t.length >= 4 && !STOP.has(stem(t)))
  if (words.length === 0) return null
  const known = words.find(w => similarTo(w).length > 0)
  return known ?? words[words.length - 1]
}

// ── Aide à la rédaction des réponses ────────────────────────────────────────
function firstSentence(text: string): string {
  const s = text.trim()
  const end = s.search(/[.!?](\s|$)/)
  return end === -1 ? s : s.slice(0, end + 1)
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}

function lowerFirst(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1)
}

const PRESENT_TONE: Record<Vegetal['restriction'], Tone> = { aucune: 'ok', petite_quantite: 'warn', a_eviter: 'bad' }

function verdict(v: Vegetal): string {
  const sugar = v.niveauSucre === 'eleve' ? ' Attention, c’est riche en sucre.' : ''
  const note = v.notes ? ` ${firstSentence(v.notes)}` : ''
  if (v.restriction === 'aucune') return `${v.nom} : oui, sans restriction particulière.${note}${sugar}`
  if (v.restriction === 'petite_quantite') return `${v.nom} : oui, mais en petite quantité seulement.${note}${sugar}`
  return `${v.nom} : non, à éviter.${note}`
}

const WORST: Tone[] = ['ok', 'info', 'warn', 'bad']
function worst(tones: Tone[]): Tone {
  return tones.reduce((a, b) => (WORST.indexOf(b) > WORST.indexOf(a) ? b : a), 'ok' as Tone)
}

function emojiFor(tone: Tone): string {
  return { ok: '✅', warn: '⚠️', bad: '⛔', info: '💡' }[tone]
}

// ── Intentions ───────────────────────────────────────────────────────────────
const LOG_VERBS = /\b(a mange|ont mange|a grignote|a pris|a refuse|a boude|n a pas voulu|n a pas mange|n a pas aime|j ai donne|je lui ai donne|on lui a donne|ajoute|ajouter|note|noter|enregistre|enregistrer|mets|mettre|inscris)\b/
const SUGGEST = /\b(quoi|que|idee|idees|menu|propose|conseille|suggere|suggestion)\b.*\b(donner|manger|repas|aujourd|lui|ce soir|ce midi|ce matin)\b|\b(idee|idees|menu)\b/
const DANGER = /\b(dangereu|toxique|interdit|eviter|poison|mortel)/
const WEIGHT = /\b(poids|pese|peser|pesee|kilo|kilos|grammes?)\b/
const PHARMACY = /\b(pharmacie|stock|manque|medicament|medicaments|perime|peremption)\b/
const HELLO = /\b(aide|aider|bonjour|salut|coucou|hello|que sais|que peux)\b/

export const EXAMPLES = [
  'Chipie peut manger du fenouil ?',
  'Elle a mangé du persil',
  'Que lui donner aujourd’hui ?',
  'Quels aliments sont dangereux ?',
  'Quel est son dernier poids ?',
  'Qu’est-ce qui manque dans la pharmacie ?',
]

function detectAppetit(norm: string): Appetit {
  if (/\b(refuse|n a pas voulu|n a pas mange|pas aime|a boude|dedaigne)\b/.test(norm)) return 'refuse'
  if (/\b(moitie|un peu|a moitie|quelques)\b/.test(norm)) return 'moitie'
  return 'tout'
}

function answerQuery(vegs: Vegetal[]): Answer {
  const tone = worst(vegs.map(v => PRESENT_TONE[v.restriction]))
  const lines = vegs.map(verdict)
  const text = lines.join('\n')
  return { tone, emoji: emojiFor(tone), text, speech: lines.join(' '), vegetals: vegs }
}

function answerLog(vegs: Vegetal[], norm: string, name: string): Answer {
  const appetit = detectAppetit(norm)
  const names = list(vegs.map(v => v.nom))
  const risky = vegs.filter(v => v.restriction !== 'aucune')
  const mood = appetit === 'refuse' ? ` ${name} a refusé.` : appetit === 'moitie' ? ` ${name} n'en a mangé que la moitié.` : ''
  const warn = risky.length > 0
    ? ' ' + risky.map(v => v.restriction === 'a_eviter'
      ? `Attention : ${lowerFirst(v.nom)} est à éviter.`
      : `Attention : ${lowerFirst(v.nom)} se donne en petite quantité.`).join(' ')
    : ''
  const tone: Tone = risky.some(v => v.restriction === 'a_eviter') ? 'bad' : risky.length > 0 ? 'warn' : 'ok'
  const text = `C'est noté dans le journal : ${names}.${mood}${warn}`
  return { tone, emoji: tone === 'ok' ? '📝' : emojiFor(tone), text, speech: text, vegetals: vegs, log: { vegetals: vegs, appetit } }
}

function answerSuggest(ctx: AssistantContext): Answer {
  const pool = VEGETAUX.filter(v =>
    v.restriction === 'aucune'
    && (v.categorie === 'potageres' || v.categorie === 'aromatiques' || v.categorie === 'salades' || v.categorie === 'sauvages')
    && !ctx.recentVegetalIds.has(v.id))
  // une idée par catégorie, au hasard, pour varier la ration
  const byCat = new Map<string, Vegetal[]>()
  pool.forEach(v => byCat.set(v.categorie, [...(byCat.get(v.categorie) ?? []), v]))
  const picks = [...byCat.values()]
    .map(group => group[Math.floor(Math.random() * group.length)])
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  if (picks.length === 0) {
    const text = 'Tu as déjà donné beaucoup de choses ces derniers jours. Un peu de foin et de l’eau fraîche, c’est parfait !'
    return { tone: 'info', emoji: '💡', text, speech: text }
  }
  const text = `Pour varier : ${list(picks.map(v => lowerFirst(v.nom)))}. Aucun n'a été donné ces derniers jours.`
  return { tone: 'info', emoji: '💡', text, speech: text, vegetals: picks }
}

function answerDanger(): Answer {
  const bad = VEGETAUX.filter(v => v.restriction === 'a_eviter').map(v => lowerFirst(v.nom))
  const little = VEGETAUX.filter(v => v.restriction === 'petite_quantite').map(v => lowerFirst(v.nom))
  const parts = []
  if (bad.length) parts.push(`À éviter : ${list(bad)}.`)
  if (little.length) parts.push(`À petite dose seulement : ${list(little)}.`)
  const text = `${parts.join(' ')} En cas de doute ou de malaise, appelle ton vétérinaire.`
  return {
    tone: 'warn', emoji: '⚠️', text, speech: text,
    vegetals: VEGETAUX.filter(v => v.restriction !== 'aucune'),
    link: { label: 'Voir les dangers', to: '/danger' },
  }
}

function answerWeight(ctx: AssistantContext): Answer {
  let weights: Array<{ date: string; weight: number }> = []
  try {
    weights = JSON.parse(localStorage.getItem(`chipie_weights_${ctx.profileId}`) ?? '[]') as typeof weights
  } catch { /* données abîmées : ignorées */ }
  const sorted = weights.filter(w => w.date && typeof w.weight === 'number').sort((a, b) => a.date.localeCompare(b.date))
  const link = { label: 'Ouvrir le carnet de santé', to: '/carnet-sante' }
  if (sorted.length === 0) {
    const text = `Aucune pesée enregistrée pour ${ctx.rabbitName}. Tu peux en ajouter une dans le carnet de santé.`
    return { tone: 'info', emoji: '⚖️', text, speech: text, link }
  }
  const last = sorted[sorted.length - 1]
  const prev = sorted[sorted.length - 2]
  const date = new Date(last.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  let change = ''
  if (prev) {
    const d = Math.round((last.weight - prev.weight) * 10) / 10
    change = d === 0 ? ' Pas de changement depuis la pesée précédente.' : ` ${d > 0 ? 'Plus' : 'Moins'} ${Math.abs(d)} grammes depuis la pesée précédente.`
  }
  const text = `Le dernier poids de ${ctx.rabbitName} est de ${last.weight} grammes, le ${date}.${change}`
  return { tone: 'info', emoji: '⚖️', text, speech: text, link }
}

function answerPharmacy(ctx: AssistantContext): Answer {
  const link = { label: 'Ouvrir la pharmacie', to: '/pharmacie' }
  const items = loadStock(ctx.profileId)
  if (items.length === 0) {
    const text = 'Ta pharmacie est vide pour le moment. Tu peux scanner ou ajouter des articles.'
    return { tone: 'info', emoji: '💊', text, speech: text, link }
  }
  const LABEL = { perime: 'périmé', rupture: 'épuisé', bientot: 'bientôt périmé', bas: 'stock bas', ok: '' }
  const issues = items.map(i => ({ i, s: getStatut(i, ctx.today, 7) })).filter(x => x.s !== 'ok')
  if (issues.length === 0) {
    const text = `Tout est en ordre : ${items.length} article${items.length > 1 ? 's' : ''}, aucun périmé ni en manque.`
    return { tone: 'ok', emoji: '✅', text, speech: text, link }
  }
  const text = `À vérifier : ${list(issues.slice(0, 5).map(x => `${lowerFirst(x.i.nom)} (${LABEL[x.s]})`))}.`
  return { tone: 'warn', emoji: '💊', text, speech: text, link }
}

function answerHelp(): Answer {
  const text = 'Je peux dire si un aliment est bon pour Chipie, noter ce qu’elle a mangé, proposer des idées de repas, rappeler son poids ou l’état de la pharmacie. Essaie : « peut-elle manger du fenouil ? ».'
  return { tone: 'info', emoji: '🐰', text, speech: text }
}

/** Comprend une phrase et prépare la réponse. */
export function interpret(input: string, ctx: AssistantContext): Answer {
  const norm = normalize(input)
  if (!norm) return answerHelp()

  const vegs = findVegetals(input)

  if (LOG_VERBS.test(norm)) {
    if (vegs.length > 0) return answerLog(vegs, norm, ctx.rabbitName)
    const word = candidateWord(input)
    const text = word
      ? `Je n'ai pas reconnu « ${word} » dans ma liste, donc je n'ai rien ajouté au journal.`
      : 'Je n’ai pas reconnu l’aliment. Dis par exemple : « elle a mangé du persil ».'
    return { tone: 'info', emoji: '🤔', text, speech: text }
  }
  if (vegs.length > 0) return answerQuery(vegs)
  if (SUGGEST.test(norm)) return answerSuggest(ctx)
  if (DANGER.test(norm)) return answerDanger()
  if (WEIGHT.test(norm)) return answerWeight(ctx)
  if (PHARMACY.test(norm)) return answerPharmacy(ctx)
  if (HELLO.test(norm)) return answerHelp()

  const word = candidateWord(input)
  const similar = similarTo(input)
  const sim = similar.length > 0 ? ` Dans ma liste, il y a : ${list(similar.map(v => lowerFirst(v.nom)))}.` : ''
  const text = word
    ? `Je ne connais pas « ${word} » dans ma liste d'aliments.${sim} Dans le doute, demande à ton vétérinaire.`
    : 'Je n’ai pas bien compris. Essaie : « peut-elle manger du fenouil ? ».'
  return { tone: 'info', emoji: '🤔', text, speech: text, vegetals: similar.length > 0 ? similar : undefined }
}

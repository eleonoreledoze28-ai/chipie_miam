// ===== Saisons & Météo =====
export type Season = 'printemps' | 'ete' | 'automne' | 'hiver'
export type Weather = 'soleil' | 'nuages' | 'pluie' | 'neige' | 'orage'

export const SEASONS: Record<Season, { label: string; emoji: string; colors: { sky1: string; sky2: string; ground1: string; ground2: string } }> = {
  printemps: { label: 'Printemps', emoji: '🌸', colors: { sky1: '#E8F5FD', sky2: '#B3E5FC', ground1: '#81C784', ground2: '#4CAF50' } },
  ete: { label: 'Été', emoji: '☀️', colors: { sky1: '#FFF8E1', sky2: '#FFECB3', ground1: '#8BC34A', ground2: '#689F38' } },
  automne: { label: 'Automne', emoji: '🍂', colors: { sky1: '#FFF3E0', sky2: '#FFCC80', ground1: '#A1887F', ground2: '#8D6E63' } },
  hiver: { label: 'Hiver', emoji: '❄️', colors: { sky1: '#ECEFF1', sky2: '#CFD8DC', ground1: '#E0E0E0', ground2: '#BDBDBD' } },
}

export const WEATHER_BY_SEASON: Record<Season, Weather[]> = {
  printemps: ['soleil', 'nuages', 'pluie', 'soleil', 'soleil', 'nuages'],
  ete: ['soleil', 'soleil', 'soleil', 'nuages', 'orage', 'soleil'],
  automne: ['nuages', 'pluie', 'nuages', 'soleil', 'pluie', 'nuages'],
  hiver: ['neige', 'nuages', 'neige', 'soleil', 'nuages', 'neige'],
}

export const WEATHER_INFO: Record<Weather, { emoji: string; label: string; bonheurMod: number }> = {
  soleil: { emoji: '☀️', label: 'Ensoleillé', bonheurMod: 2 },
  nuages: { emoji: '☁️', label: 'Nuageux', bonheurMod: 0 },
  pluie: { emoji: '🌧️', label: 'Pluvieux', bonheurMod: -1 },
  neige: { emoji: '🌨️', label: 'Neigeux', bonheurMod: 1 },
  orage: { emoji: '⛈️', label: 'Orageux', bonheurMod: -2 },
}

// ===== Quêtes journalières =====
export interface Quest {
  id: string
  text: string
  icon: string
  target: number
  trackKey: string // key to track progress in daily counters
  rewardCoins: number
  rewardXp: number
}

export const QUEST_POOL: Quest[] = [
  { id: 'feed3', text: 'Nourrir Chipie 3 fois', icon: '🥬', target: 3, trackKey: 'feeds', rewardCoins: 15, rewardXp: 10 },
  { id: 'feed5', text: 'Nourrir Chipie 5 fois', icon: '🥬', target: 5, trackKey: 'feeds', rewardCoins: 25, rewardXp: 20 },
  { id: 'water3', text: 'Donner de l\'eau 3 fois', icon: '💧', target: 3, trackKey: 'waters', rewardCoins: 12, rewardXp: 8 },
  { id: 'pet3', text: 'Caresser Chipie 3 fois', icon: '🤗', target: 3, trackKey: 'pets', rewardCoins: 12, rewardXp: 8 },
  { id: 'brush2', text: 'Brosser Chipie 2 fois', icon: '🧹', target: 2, trackKey: 'brushes', rewardCoins: 15, rewardXp: 10 },
  { id: 'sleep2', text: 'Faire dormir Chipie 2 fois', icon: '💤', target: 2, trackKey: 'sleeps', rewardCoins: 10, rewardXp: 8 },
  { id: 'fruit1', text: 'Donner un fruit à Chipie', icon: '🍎', target: 1, trackKey: 'fruits', rewardCoins: 10, rewardXp: 5 },
  { id: 'hay3', text: 'Donner du foin 3 fois', icon: '🌾', target: 3, trackKey: 'hays', rewardCoins: 12, rewardXp: 8 },
  { id: 'allstats', text: 'Toutes les stats au-dessus de 70%', icon: '⭐', target: 1, trackKey: 'allHigh', rewardCoins: 30, rewardXp: 25 },
  { id: 'play2', text: 'Jouer avec Chipie 2 fois', icon: '🎾', target: 2, trackKey: 'plays', rewardCoins: 15, rewardXp: 10 },
]

// ===== Succès / Achievements =====
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  condition: (state: AchievementCheckState) => boolean
  rewardCoins: number
}

export interface AchievementCheckState {
  totalFed: number
  totalDays: number
  uniqueFoods: string[]
  coins: number
  allStatsAbove90: boolean
  allStatsAbove50: boolean
  currentHour: number
  totalPets: number
  totalBrushes: number
  totalPlays: number
  itemsOwned: number
  questsCompleted: number
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_meal', name: 'Premier repas', description: 'Nourrir Chipie pour la première fois', icon: '🥕', condition: s => s.totalFed >= 1, rewardCoins: 5 },
  { id: 'fed_10', name: 'Petit chef', description: 'Servir 10 repas à Chipie', icon: '👨‍🍳', condition: s => s.totalFed >= 10, rewardCoins: 15 },
  { id: 'fed_50', name: 'Cuisinier confirmé', description: 'Servir 50 repas', icon: '🍽️', condition: s => s.totalFed >= 50, rewardCoins: 30 },
  { id: 'fed_100', name: 'Grand gourmet', description: 'Servir 100 repas', icon: '🏆', condition: s => s.totalFed >= 100, rewardCoins: 50 },
  { id: 'fed_300', name: 'Chef étoilé', description: 'Servir 300 repas', icon: '⭐', condition: s => s.totalFed >= 300, rewardCoins: 100 },
  { id: 'week1', name: 'Une semaine ensemble', description: 'Chipie est avec toi depuis 7 jours', icon: '📅', condition: s => s.totalDays >= 7, rewardCoins: 25 },
  { id: 'month1', name: 'Un mois d\'amour', description: 'Chipie est avec toi depuis 30 jours', icon: '❤️', condition: s => s.totalDays >= 30, rewardCoins: 75 },
  { id: 'herbalist', name: 'Herboriste', description: 'Donner 10 aliments différents', icon: '🌿', condition: s => s.uniqueFoods.length >= 10, rewardCoins: 20 },
  { id: 'master_herb', name: 'Maître herboriste', description: 'Donner 30 aliments différents', icon: '🧙', condition: s => s.uniqueFoods.length >= 30, rewardCoins: 50 },
  { id: 'top_stats', name: 'Chipie au top', description: 'Toutes les stats au-dessus de 90%', icon: '🌟', condition: s => s.allStatsAbove90, rewardCoins: 40 },
  { id: 'night_owl', name: 'Noctambule', description: 'Jouer après 22h', icon: '🦉', condition: s => s.currentHour >= 22, rewardCoins: 10 },
  { id: 'early_bird', name: 'Lève-tôt', description: 'Jouer avant 7h', icon: '🐦', condition: s => s.currentHour < 7, rewardCoins: 10 },
  { id: 'cuddle_master', name: 'Roi des câlins', description: 'Caresser Chipie 50 fois', icon: '🥰', condition: s => s.totalPets >= 50, rewardCoins: 25 },
  { id: 'clean_bunny', name: 'Lapin propre', description: 'Brosser Chipie 20 fois', icon: '✨', condition: s => s.totalBrushes >= 20, rewardCoins: 20 },
  { id: 'shopaholic', name: 'Shopping addict', description: 'Posséder 5 objets', icon: '🛍️', condition: s => s.itemsOwned >= 5, rewardCoins: 30 },
  { id: 'quest_master', name: 'Aventurier', description: 'Compléter 10 quêtes', icon: '🗺️', condition: s => s.questsCompleted >= 10, rewardCoins: 35 },
]

// ===== Boutique / Items =====
export type ItemCategory = 'accessoire' | 'decoration' | 'fond'

export interface ShopItem {
  id: string
  name: string
  icon: string
  category: ItemCategory
  price: number
  description: string
}

export const SHOP_ITEMS: ShopItem[] = [
  // Accessoires
  { id: 'bow_tie', name: 'Nœud papillon', icon: '🎀', category: 'accessoire', price: 30, description: 'Un élégant nœud papillon rouge' },
  { id: 'top_hat', name: 'Petit chapeau', icon: '🎩', category: 'accessoire', price: 45, description: 'Un chapeau haut-de-forme miniature' },
  { id: 'glasses', name: 'Lunettes rondes', icon: '👓', category: 'accessoire', price: 25, description: 'Des lunettes de petit intellectuel' },
  { id: 'flower_crown', name: 'Couronne de fleurs', icon: '💐', category: 'accessoire', price: 35, description: 'Une jolie couronne printanière' },
  { id: 'scarf', name: 'Écharpe', icon: '🧣', category: 'accessoire', price: 30, description: 'Une écharpe bien chaude pour l\'hiver' },
  { id: 'bandana', name: 'Bandana', icon: '🏴‍☠️', category: 'accessoire', price: 20, description: 'Un bandana de petit aventurier' },

  // Décorations
  { id: 'mushrooms', name: 'Champignons', icon: '🍄', category: 'decoration', price: 15, description: 'Des champignons colorés' },
  { id: 'flowers', name: 'Parterre de fleurs', icon: '🌺', category: 'decoration', price: 20, description: 'De jolies fleurs autour de Chipie' },
  { id: 'butterflies', name: 'Papillons', icon: '🦋', category: 'decoration', price: 25, description: 'Des papillons qui volent autour' },
  { id: 'ball', name: 'Balle de jeu', icon: '🎾', category: 'decoration', price: 15, description: 'Une petite balle pour jouer' },
  { id: 'carrot_pile', name: 'Tas de carottes', icon: '🥕', category: 'decoration', price: 20, description: 'Un stock de délicieuses carottes' },
  { id: 'lanterns', name: 'Lanternes', icon: '🏮', category: 'decoration', price: 30, description: 'Des lanternes féeriques' },

  // Fonds
  { id: 'bg_garden', name: 'Jardin fleuri', icon: '🌻', category: 'fond', price: 50, description: 'Un beau jardin avec des tournesols' },
  { id: 'bg_forest', name: 'Forêt enchantée', icon: '🌲', category: 'fond', price: 60, description: 'Une mystérieuse forêt de sapins' },
  { id: 'bg_beach', name: 'Plage', icon: '🏖️', category: 'fond', price: 55, description: 'Une plage tropicale au coucher du soleil' },
  { id: 'bg_night', name: 'Nuit étoilée', icon: '🌙', category: 'fond', price: 65, description: 'Un ciel nocturne scintillant' },
]

// ===== Niveaux =====
export const LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 80, 120, 170, 230, 300, 400, 520, 660, 820, 1000]
export const LEVEL_TITLES = [
  'Débutant', 'Apprenti', 'Soigneur', 'Nourricier', 'Gardien',
  'Protecteur', 'Expert', 'Maître', 'Champion', 'Légende',
  'Héros', 'Mythique', 'Divin', 'Transcendant', 'Ultime'
]

export function getLevel(totalFed: number) {
  let level = 0
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalFed >= LEVEL_THRESHOLDS[i]) { level = i; break }
  }
  const xp = totalFed - LEVEL_THRESHOLDS[level]
  const xpNeeded = (LEVEL_THRESHOLDS[level + 1] || LEVEL_THRESHOLDS[level] + 150) - LEVEL_THRESHOLDS[level]
  return { level: level + 1, xp, xpNeeded, title: LEVEL_TITLES[level] || 'Ultime' }
}

// ===== Mood =====
export function getMood(avg: number) {
  if (avg >= 85) return { emoji: '😍', label: 'Aux anges !' }
  if (avg >= 70) return { emoji: '😊', label: 'Très content' }
  if (avg >= 55) return { emoji: '🙂', label: 'Content' }
  if (avg >= 40) return { emoji: '😐', label: 'Ça va...' }
  if (avg >= 25) return { emoji: '😟', label: 'Pas bien...' }
  if (avg >= 10) return { emoji: '😢', label: 'Triste' }
  return { emoji: '😭', label: 'Au secours !' }
}

// ===== Random Events =====
export const RANDOM_EVENTS = [
  { text: '🌞 Il fait beau ! Chipie se prélasse au soleil.', stat: 'bonheur' as const, value: 3 },
  { text: '🦋 Un papillon se pose sur le nez de Chipie !', stat: 'bonheur' as const, value: 5 },
  { text: '🏃 Chipie fait des binkies ! Elle est euphorique !', stat: 'bonheur' as const, value: 4 },
  { text: '🔍 Chipie explore un nouveau coin de son enclos.', stat: 'bonheur' as const, value: 3 },
  { text: '🥱 Chipie bâille longuement...', stat: 'energie' as const, value: -3 },
  { text: '💨 Chipie court partout à toute vitesse !', stat: 'energie' as const, value: -5 },
  { text: '🌿 Chipie grignote un brin d\'herbe.', stat: 'faim' as const, value: 2 },
  { text: '💧 Chipie trouve une petite flaque d\'eau.', stat: 'soif' as const, value: 3 },
  { text: '🐾 Chipie se frotte contre ta main.', stat: 'bonheur' as const, value: 4 },
  { text: '🌙 Chipie ferme doucement les yeux...', stat: 'energie' as const, value: 3 },
]

// ===== Helpers =====
export function getSeason(dayNumber: number): Season {
  const cycle = Math.floor((dayNumber % 28) / 7)
  const seasons: Season[] = ['printemps', 'ete', 'automne', 'hiver']
  return seasons[cycle]
}

export function getWeather(dayNumber: number, season: Season): Weather {
  const pool = WEATHER_BY_SEASON[season]
  const idx = dayNumber % pool.length
  return pool[idx]
}

export function getTimeOfDay(): 'nuit' | 'aube' | 'matin' | 'aprem' | 'soir' | 'crepuscule' {
  const h = new Date().getHours()
  if (h < 5) return 'nuit'
  if (h < 7) return 'aube'
  if (h < 12) return 'matin'
  if (h < 17) return 'aprem'
  if (h < 20) return 'soir'
  if (h < 22) return 'crepuscule'
  return 'nuit'
}

export function pickDailyQuests(seed: string): Quest[] {
  // Deterministic pick based on date string
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  const pool = [...QUEST_POOL]
  const picked: Quest[] = []
  for (let i = 0; i < 3; i++) {
    const idx = Math.abs(hash + i * 7) % pool.length
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}

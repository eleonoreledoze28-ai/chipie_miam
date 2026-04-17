import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './SurnomPage.module.css'

interface SurnomEntry {
  nom: string
  savedAt: string
}

function storageKey() { return `chipie-surnoms-${getActiveProfileId()}` }

function loadFavoris(): SurnomEntry[] {
  try {
    const raw = localStorage.getItem(storageKey())
    return raw ? (JSON.parse(raw) as SurnomEntry[]) : []
  } catch { return [] }
}

function saveFavoris(list: SurnomEntry[]) {
  localStorage.setItem(storageKey(), JSON.stringify(list))
}

// ── Surnom pools ──────────────────────────────────────────────────────────────
const TENDRES = ['Doudou', 'Câlin', 'Mignon', 'Chéri', 'Tendre', 'Sucre', 'Bonbon', 'Velours']
const PELAGE_CLAIR = ['Nuage', 'Neige', 'Lait', 'Perle', 'Coton', 'Blanc-Blanc', 'Craie', 'Ivoire']
const PELAGE_FONCE = ['Noisette', 'Cacao', 'Réglisse', 'Moka', 'Truffe', 'Chocolat', 'Café']
const PELAGE_ROUX = ['Cannelle', 'Miel', 'Caramel', 'Rouquin', 'Ambre', 'Safran', 'Paprika']
const ACTIF = ['Filou', 'Bolide', 'Turbo', 'Sprint', 'Foudre', 'Comète', 'Flash', 'Rocket']
const CALME = ['Sieste', 'Rêveur', 'Paisible', 'Zen', 'Cosy', 'Duvet', 'Nuage']
const GOURMAND = ['Croquette', 'Grignotin', 'Mâchouille', 'Friandise', 'Casse-Croûte', 'Glouton']
const MIGNON = ['Pompom', 'Bouboule', 'Fluffou', 'Bibou', 'Nounours', 'Peluche', 'Bouclette']
const RACE_NAIN = ['Mini-Moi', 'Microbe', 'Minot', 'Petit Prince', 'Lilliput', 'Nainot']
const RACE_BELIER = ['Grandes-Oreilles', 'Floppy', 'Oreillon', 'Pendouille', 'Casque']
const RACE_ANGORA = ['Frisette', 'Moumoute', 'Toison', 'Laineux', 'Peluchon', 'Flocon']
const SAISONS = ['Feuille', 'Bourgeon', 'Givre', 'Rosée', 'Brume', 'Pollen', 'Solstice']
const ASTROS = ['Étoile', 'Luna', 'Cosmos', 'Comète', 'Nébula', 'Aurore', 'Polaris', 'Nova']
const FRUITS = ['Kiwi', 'Figue', 'Litchi', 'Mangue', 'Papaye', 'Prune', 'Myrtille', 'Grenade']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateSurnom(race: string, poids: string): string {
  const pools: string[][] = [TENDRES, MIGNON, SAISONS, ASTROS, FRUITS, GOURMAND]

  const r = race.toLowerCase()
  if (r.includes('nain') || r.includes('hollandais') || r.includes('mini')) pools.push(RACE_NAIN)
  if (r.includes('belier') || r.includes('bélier')) pools.push(RACE_BELIER)
  if (r.includes('angora') || r.includes('lionhead')) pools.push(RACE_ANGORA)

  const p = parseFloat(poids)
  if (!isNaN(p) && p < 1.5) pools.push(RACE_NAIN)
  if (!isNaN(p) && p > 3) pools.push(ACTIF)

  pools.push(CALME, ACTIF, PELAGE_CLAIR, PELAGE_FONCE, PELAGE_ROUX)

  const pool = pick(pools)
  const base = pick(pool)

  const doubles = [false, false, false, true]
  if (pick(doubles)) {
    const pool2 = pick(pools.filter(p => p !== pool))
    return `${base}-${pick(pool2)}`
  }

  return base
}

export default function SurnomPage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const [surnom, setSurnom] = useState<string | null>(null)
  const [animating, setAnimating] = useState(false)
  const [favoris, setFavoris] = useState<SurnomEntry[]>(loadFavoris)

  const generate = useCallback(() => {
    setAnimating(true)
    let count = 0
    const interval = setInterval(() => {
      setSurnom(generateSurnom(profil.race, profil.poids))
      count++
      if (count >= 8) {
        clearInterval(interval)
        setAnimating(false)
      }
    }, 80)
  }, [profil.race, profil.poids])

  const save = useCallback(() => {
    if (!surnom) return
    const entry: SurnomEntry = { nom: surnom, savedAt: new Date().toISOString() }
    const next = [entry, ...favoris.filter(f => f.nom !== surnom)]
    saveFavoris(next)
    setFavoris(next)
  }, [surnom, favoris])

  const removeFavori = useCallback((nom: string) => {
    const next = favoris.filter(f => f.nom !== nom)
    saveFavoris(next)
    setFavoris(next)
  }, [favoris])

  const isSaved = surnom ? favoris.some(f => f.nom === surnom) : false

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
      </div>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>✨</span>
        <div>
          <h1 className={styles.title}>Générateur de surnom</h1>
          <p className={styles.subtitle}>Trouve le surnom parfait pour {profil.nom}</p>
        </div>
      </div>

      {/* Generator card */}
      <div className={styles.generatorCard}>
        <div className={`${styles.surnomDisplay} ${animating ? styles.surnomAnimating : ''}`}>
          {surnom ? (
            <span className={styles.surnomText}>{surnom}</span>
          ) : (
            <span className={styles.surnomPlaceholder}>?</span>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.generateBtn} onClick={generate} disabled={animating}>
            {animating ? '✨ …' : '🎲 Générer un surnom'}
          </button>
          {surnom && !animating && (
            <button
              className={`${styles.saveBtn} ${isSaved ? styles.saveBtnDone : ''}`}
              onClick={save}
              disabled={isSaved}
            >
              {isSaved ? '★ Sauvegardé' : '☆ Sauvegarder'}
            </button>
          )}
        </div>

        {profil.race && (
          <p className={styles.hint}>
            Basé sur la race : <strong>{profil.race}</strong>
          </p>
        )}
      </div>

      {/* Favorites */}
      {favoris.length > 0 && (
        <div className={styles.favoris}>
          <h2 className={styles.favorisTitle}>⭐ Surnoms favoris</h2>
          <div className={styles.favorisList}>
            {favoris.map(f => (
              <div key={f.nom} className={styles.favoriItem}>
                <span className={styles.favoriNom}>{f.nom}</span>
                <button className={styles.favoriDelete} onClick={() => removeFavori(f.nom)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

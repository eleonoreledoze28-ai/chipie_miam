import { useMemo } from 'react'
import type { JournalEntry } from '../../hooks/useJournal'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import type { CategorieId } from '../../data/vegetaux'
import styles from './BilanSemaine.module.css'

interface Props {
  weekEntries: JournalEntry[]
  prevWeekEntries: JournalEntry[]
}

const vegetauxMap = new Map(VEGETAUX.map((v) => [v.id, v]))

// Catégories sucrées : à garder occasionnelles. Les autres forment la base de la ration.
const SUCREES: CategorieId[] = ['fruits', 'racines']
const BASE = CATEGORIES.filter((c) => !SUCREES.includes(c.id) && c.id !== 'branchages')

function uniqueCount(entries: JournalEntry[]) {
  return new Set(entries.map((e) => e.vegetalId)).size
}

function delta(current: number, previous: number): string | null {
  const d = current - previous
  if (d === 0) return '= semaine dernière'
  return `${d > 0 ? '+' : ''}${d} vs semaine dernière`
}

export default function BilanSemaine({ weekEntries, prevWeekEntries }: Props) {
  const bilan = useMemo(() => {
    const total = weekEntries.length

    const appetit = { tout: 0, moitie: 0, refuse: 0 }
    weekEntries.forEach((e) => { if (e.appetit) appetit[e.appetit]++ })
    const rated = appetit.tout + appetit.moitie + appetit.refuse

    // Végétaux refusés plus souvent qu'acceptés
    const refused = new Map<string, number>()
    weekEntries.forEach((e) => {
      if (e.appetit === 'refuse') refused.set(e.vegetalId, (refused.get(e.vegetalId) ?? 0) + 1)
    })
    const refusedNames = [...refused.keys()]
      .map((id) => vegetauxMap.get(id)?.nom)
      .filter((n): n is string => !!n)

    const present = new Set<CategorieId>()
    let sucre = 0
    weekEntries.forEach((e) => {
      const v = vegetauxMap.get(e.vegetalId)
      if (!v) return
      present.add(v.categorie)
      if (SUCREES.includes(v.categorie)) sucre++
    })
    const missing = BASE.filter((c) => !present.has(c.id))

    const sucrePct = total > 0 ? Math.round((sucre / total) * 100) : 0

    const tips: string[] = []
    if (total === 0) {
      tips.push('Rien noté cette semaine : commencez par ajouter les repas du jour.')
    } else {
      if (sucrePct > 25) tips.push(`🍎 ${sucrePct} % de la semaine en fruits ou racines : trop sucré, à réduire.`)
      if (missing.length > 0) tips.push(`🥬 À varier, rien cette semaine en : ${missing.map((c) => c.nom.toLowerCase()).join(', ')}.`)
      if (rated > 0 && appetit.refuse / rated >= 0.3) tips.push('😒 Plusieurs refus : surveillez l\'appétit, et consultez si cela dure.')
      if (tips.length === 0) tips.push('✅ Semaine bien équilibrée, bravo !')
    }

    return { total, appetit, rated, refusedNames, missing, sucrePct, tips }
  }, [weekEntries])

  const variety = uniqueCount(weekEntries)
  const prevVariety = uniqueCount(prevWeekEntries)

  return (
    <div className={styles.card}>
      <span className={styles.title}>🧾 Bilan de la semaine</span>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{bilan.total}</span>
          <span className={styles.statLabel}>repas notés</span>
          <span className={styles.statDelta}>{delta(bilan.total, prevWeekEntries.length)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{variety}</span>
          <span className={styles.statLabel}>végétaux différents</span>
          <span className={styles.statDelta}>{delta(variety, prevVariety)}</span>
        </div>
      </div>

      {bilan.rated > 0 && (
        <div className={styles.appetit}>
          <div className={styles.appetitBar}>
            <div className={styles.segTout} style={{ width: `${(bilan.appetit.tout / bilan.rated) * 100}%` }} />
            <div className={styles.segMoitie} style={{ width: `${(bilan.appetit.moitie / bilan.rated) * 100}%` }} />
            <div className={styles.segRefuse} style={{ width: `${(bilan.appetit.refuse / bilan.rated) * 100}%` }} />
          </div>
          <div className={styles.appetitLegend}>
            <span>😋 {bilan.appetit.tout}</span>
            <span>😐 {bilan.appetit.moitie}</span>
            <span>😒 {bilan.appetit.refuse}</span>
          </div>
        </div>
      )}

      {bilan.refusedNames.length > 0 && (
        <p className={styles.refused}>Refusés : {bilan.refusedNames.join(', ')}</p>
      )}

      <ul className={styles.tips}>
        {bilan.tips.map((tip) => <li key={tip}>{tip}</li>)}
      </ul>
    </div>
  )
}

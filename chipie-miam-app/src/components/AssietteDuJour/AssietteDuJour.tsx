import { useMemo } from 'react'
import type { Vegetal } from '../../data/vegetaux'
import type { JournalEntry } from '../../hooks/useJournal'
import VegetalImage from '../VegetalImage/VegetalImage'
import ChipieCharacter from '../ChipieCharacter/ChipieCharacter'
import type { ChipieMood } from '../ChipieCharacter/ChipieCharacter'
import styles from './AssietteDuJour.module.css'

interface Props {
  entries: JournalEntry[]
  vegetaux: Map<string, Vegetal>
}

const MAX_ON_PLATE = 8

/** L'assiette du jour : les aliments mangés s'y posent, et Chipie réagit à la variété. */
export default function AssietteDuJour({ entries, vegetaux }: Props) {
  const { items, extra, unique, mood, message } = useMemo(() => {
    const seen = new Map<string, number>()
    for (const e of entries) seen.set(e.vegetalId, (seen.get(e.vegetalId) ?? 0) + 1)
    const all = [...seen.entries()]
      .map(([id, n]) => ({ veg: vegetaux.get(id), n }))
      .filter((x): x is { veg: Vegetal; n: number } => !!x.veg)
    const refusedAll = entries.length > 0 && entries.every(e => e.appetit === 'refuse')
    const u = all.length
    let m: ChipieMood = 'happy'
    let msg = 'Joli repas !'
    if (refusedAll) { m = 'sad'; msg = 'Chipie a boudé son assiette…' }
    else if (u >= 4) { m = 'love'; msg = 'Quel festin varié !' }
    else if (u === 1) { m = 'eat'; msg = 'Un début… Chipie en veut plus !' }
    return { items: all.slice(0, MAX_ON_PLATE), extra: Math.max(0, u - MAX_ON_PLATE), unique: u, mood: m, message: msg }
  }, [entries, vegetaux])

  if (unique === 0) return null

  // Les aliments se répartissent en couronne (le premier au centre quand il est seul)
  const place = (i: number, count: number): { left: string; top: string } => {
    if (count === 1) return { left: '50%', top: '50%' }
    const a = (i / count) * Math.PI * 2 - Math.PI / 2
    return { left: `${50 + Math.cos(a) * 31}%`, top: `${50 + Math.sin(a) * 30}%` }
  }

  return (
    <section className={styles.wrap} aria-label="Assiette du jour">
      <div className={styles.plate}>
        <div className={styles.rim} />
        {items.map(({ veg, n }, i) => (
          <div key={veg.id} className={styles.item} style={{ ...place(i, items.length), animationDelay: `${i * 70}ms` }}>
            <VegetalImage vegetal={veg} className={styles.itemImg} />
            {n > 1 && <span className={styles.qty}>×{n}</span>}
          </div>
        ))}
        {extra > 0 && <span className={styles.more}>+{extra}</span>}
      </div>
      <div className={styles.side}>
        <ChipieCharacter mood={mood} size={92} />
        <p className={styles.msg}>{message}</p>
        <p className={styles.count}>{unique} aliment{unique > 1 ? 's' : ''} différent{unique > 1 ? 's' : ''}</p>
      </div>
    </section>
  )
}

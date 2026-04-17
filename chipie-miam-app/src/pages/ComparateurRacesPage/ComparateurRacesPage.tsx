import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { RACES_COMPAREES } from '../../data/races'
import type { RaceComparee } from '../../data/races'
import styles from './ComparateurRacesPage.module.css'

// ── Comparaison helpers ───────────────────────────────────────────────────────
type Winner = 'a' | 'b' | 'equal'

function compareNum(a: number, b: number, higherIsBetter = true): Winner {
  if (a === b) return 'equal'
  return (higherIsBetter ? a > b : a < b) ? 'a' : 'b'
}

function StarBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className={styles.starBar}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={styles.starDot}
          style={{ background: i < value ? color : undefined } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ComparateurRacesPage() {
  const navigate = useNavigate()
  const [raceA, setRaceA] = useState<RaceComparee | null>(null)
  const [raceB, setRaceB] = useState<RaceComparee | null>(null)
  const [selectingFor, setSelectingFor] = useState<'a' | 'b' | null>('a')

  const available = useMemo(() =>
    RACES_COMPAREES.filter(r => r.id !== raceA?.id && r.id !== raceB?.id),
    [raceA, raceB]
  )

  const handleSelect = (race: RaceComparee) => {
    if (selectingFor === 'a') { setRaceA(race); setSelectingFor(raceB ? null : 'b') }
    else if (selectingFor === 'b') { setRaceB(race); setSelectingFor(null) }
  }

  const reset = () => { setRaceA(null); setRaceB(null); setSelectingFor('a') }

  const showComparison = raceA && raceB

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
        {(raceA || raceB) && (
          <button className={styles.resetBtn} onClick={reset}>Recommencer</button>
        )}
      </div>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>⚖️</span>
        <div>
          <h1 className={styles.title}>Comparateur de races</h1>
          <p className={styles.subtitle}>Choisis 2 races pour les comparer</p>
        </div>
      </div>

      {/* Selection slots */}
      <div className={styles.slots}>
        <SlotCard
          race={raceA}
          label="Race A"
          active={selectingFor === 'a'}
          onClick={() => setSelectingFor('a')}
          onClear={() => { setRaceA(null); setSelectingFor('a') }}
        />
        <span className={styles.vs}>VS</span>
        <SlotCard
          race={raceB}
          label="Race B"
          active={selectingFor === 'b'}
          onClick={() => setSelectingFor('b')}
          onClear={() => { setRaceB(null); setSelectingFor('b') }}
        />
      </div>

      {/* Race picker */}
      {selectingFor && (
        <div className={styles.picker}>
          <p className={styles.pickerLabel}>
            Choisis la race <strong>{selectingFor === 'a' ? 'A' : 'B'}</strong>
          </p>
          <div className={styles.pickerGrid}>
            {available.map(r => (
              <button
                key={r.id}
                className={styles.pickerItem}
                style={{ '--rc': r.couleur } as React.CSSProperties}
                onClick={() => handleSelect(r)}
              >
                <span className={styles.pickerEmoji}>{r.emoji}</span>
                <span className={styles.pickerName}>{r.nom}</span>
                <span className={styles.pickerPoids}>{r.poids}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comparison table */}
      {showComparison && (
        <div className={styles.comparison}>
          <Row label="Taille" valueA={raceA.taille} valueB={raceB.taille}
            winner={compareNum(raceA.taillePts, raceB.taillePts, false)}
            winnerLabel="plus compact"
            colorA={raceA.couleur} colorB={raceB.couleur} />

          <Row label="Poids moyen" valueA={`${raceA.poids}`} valueB={`${raceB.poids}`}
            winner={compareNum(raceA.poidsMoyen, raceB.poidsMoyen, false)}
            winnerLabel="plus léger"
            colorA={raceA.couleur} colorB={raceB.couleur} />

          <Row label="Espérance de vie" valueA={raceA.esperanceVie} valueB={raceB.esperanceVie}
            winner={compareNum(raceA.esperanceMoyenne, raceB.esperanceMoyenne)}
            winnerLabel="plus longue"
            colorA={raceA.couleur} colorB={raceB.couleur} />

          <ScoreRow label="Niveau d'activité" valueA={raceA.activite} valueB={raceB.activite}
            colorA={raceA.couleur} colorB={raceB.couleur}
            description="1 = calme, 5 = très actif" />

          <ScoreRow label="Entretien du pelage" valueA={raceA.soinsPoils} valueB={raceB.soinsPoils}
            colorA={raceA.couleur} colorB={raceB.couleur}
            description="1 = facile, 5 = exigeant" invertWinner />

          <ScoreRow label="Sociabilité" valueA={raceA.sociabilite} valueB={raceB.sociabilite}
            colorA={raceA.couleur} colorB={raceB.couleur}
            description="1 = indépendant, 5 = très sociable" />

          <BoolRow label="Adapté aux enfants"
            valueA={raceA.suitableEnfants} valueB={raceB.suitableEnfants}
            colorA={raceA.couleur} colorB={raceB.couleur} />

          <ListRow label="Risques médicaux"
            itemsA={raceA.risquesMedicaux} itemsB={raceB.risquesMedicaux}
            colorA={raceA.couleur} colorB={raceB.couleur} />

          <ListRow label="Points forts"
            itemsA={raceA.pointsForts} itemsB={raceB.pointsForts}
            colorA={raceA.couleur} colorB={raceB.couleur} />

          <ListRow label="Points faibles"
            itemsA={raceA.pointsFaibles} itemsB={raceB.pointsFaibles}
            colorA={raceA.couleur} colorB={raceB.couleur} />
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SlotCard({ race, label, active, onClick, onClear }: {
  race: RaceComparee | null; label: string
  active: boolean; onClick: () => void; onClear: () => void
}) {
  if (!race) {
    return (
      <button
        className={`${styles.slot} ${styles.slotEmpty} ${active ? styles.slotActive : ''}`}
        onClick={onClick}
      >
        <span className={styles.slotPlus}>+</span>
        <span className={styles.slotLabel}>{label}</span>
      </button>
    )
  }
  return (
    <div className={styles.slot} style={{ '--rc': race.couleur } as React.CSSProperties}>
      <span className={styles.slotEmoji}>{race.emoji}</span>
      <span className={styles.slotName}>{race.nom}</span>
      <button className={styles.slotClear} onClick={onClear}>✕</button>
    </div>
  )
}

function Row({ label, valueA, valueB, winner, winnerLabel, colorA, colorB }: {
  label: string; valueA: string; valueB: string
  winner: Winner; winnerLabel: string; colorA: string; colorB: string
}) {
  return (
    <div className={styles.row}>
      <p className={styles.rowLabel}>{label}</p>
      <div className={styles.rowValues}>
        <span className={`${styles.val} ${winner === 'a' ? styles.valWin : ''}`}
          style={winner === 'a' ? { color: colorA, borderColor: colorA } as React.CSSProperties : undefined}>
          {valueA}
          {winner === 'a' && <span className={styles.winTag}>✓ {winnerLabel}</span>}
        </span>
        <span className={`${styles.val} ${winner === 'b' ? styles.valWin : ''}`}
          style={winner === 'b' ? { color: colorB, borderColor: colorB } as React.CSSProperties : undefined}>
          {valueB}
          {winner === 'b' && <span className={styles.winTag}>✓ {winnerLabel}</span>}
        </span>
      </div>
    </div>
  )
}

function ScoreRow({ label, valueA, valueB, colorA, colorB, description, invertWinner }: {
  label: string; valueA: number; valueB: number
  colorA: string; colorB: string; description: string; invertWinner?: boolean
}) {
  const winner = compareNum(valueA, valueB, !invertWinner)
  return (
    <div className={styles.row}>
      <p className={styles.rowLabel}>{label}</p>
      <p className={styles.rowDesc}>{description}</p>
      <div className={styles.rowValues}>
        <div className={`${styles.scoreCol} ${winner === 'a' ? styles.scoreWin : ''}`}>
          <StarBar value={valueA} color={colorA} />
          <span className={styles.scoreNum} style={{ color: colorA }}>{valueA}/5</span>
        </div>
        <div className={`${styles.scoreCol} ${winner === 'b' ? styles.scoreWin : ''}`}>
          <StarBar value={valueB} color={colorB} />
          <span className={styles.scoreNum} style={{ color: colorB }}>{valueB}/5</span>
        </div>
      </div>
    </div>
  )
}

function BoolRow({ label, valueA, valueB, colorA, colorB }: {
  label: string; valueA: boolean; valueB: boolean; colorA: string; colorB: string
}) {
  return (
    <div className={styles.row}>
      <p className={styles.rowLabel}>{label}</p>
      <div className={styles.rowValues}>
        <span className={styles.boolVal} style={{ color: valueA ? colorA : 'var(--text-muted)' }}>
          {valueA ? '✓ Oui' : '✗ Non'}
        </span>
        <span className={styles.boolVal} style={{ color: valueB ? colorB : 'var(--text-muted)' }}>
          {valueB ? '✓ Oui' : '✗ Non'}
        </span>
      </div>
    </div>
  )
}

function ListRow({ label, itemsA, itemsB, colorA, colorB }: {
  label: string; itemsA: string[]; itemsB: string[]; colorA: string; colorB: string
}) {
  return (
    <div className={styles.row}>
      <p className={styles.rowLabel}>{label}</p>
      <div className={styles.rowValues}>
        <ul className={styles.listCol} style={{ '--rc': colorA } as React.CSSProperties}>
          {itemsA.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
        <ul className={styles.listCol} style={{ '--rc': colorB } as React.CSSProperties}>
          {itemsB.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { todayStr, addDays } from '../../utils/dates'
import styles from './WeightChart.module.css'

interface WeightPoint {
  id: string
  date: string   // YYYY-MM-DD
  weight: number // grams
}

interface Props {
  weights: WeightPoint[] // triés par date croissante
}

type Period = '1m' | '3m' | '6m' | 'all'

const PERIODS: { id: Period; label: string; days: number | null }[] = [
  { id: '1m', label: '1 mois', days: 30 },
  { id: '3m', label: '3 mois', days: 90 },
  { id: '6m', label: '6 mois', days: 180 },
  { id: 'all', label: 'Tout', days: null },
]

// Perte de poids à signaler (en % du poids de référence)
const WARN_LOSS_PCT = 5
const DANGER_LOSS_PCT = 10

const W = 320
const H = 170
const PAD = { top: 14, right: 14, bottom: 26, left: 40 }

function dayNumber(date: string): number {
  return Math.round(new Date(date + 'T00:00:00').getTime() / 86_400_000)
}

function shortDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',')
}

export default function WeightChart({ weights }: Props) {
  const [period, setPeriod] = useState<Period>('3m')

  const visible = useMemo(() => {
    const days = PERIODS.find(p => p.id === period)?.days ?? null
    if (days === null) return weights
    const from = addDays(todayStr(), -days)
    return weights.filter(w => w.date >= from)
  }, [weights, period])

  // Alerte : baisse par rapport à la pesée précédente, ou au maximum des 30 jours précédents
  const alert = useMemo(() => {
    if (weights.length < 2) return null
    const last = weights[weights.length - 1]
    const prev = weights[weights.length - 2]
    const recentMax = weights
      .filter(w => w.id !== last.id && w.date >= addDays(last.date, -30))
      .reduce<WeightPoint | null>((best, w) => (!best || w.weight > best.weight ? w : best), null)

    let worst = 0
    let ref = prev
    for (const r of recentMax ? [prev, recentMax] : [prev]) {
      const loss = ((r.weight - last.weight) / r.weight) * 100
      if (loss > worst) { worst = loss; ref = r }
    }
    if (worst < WARN_LOSS_PCT) return null
    return {
      level: worst >= DANGER_LOSS_PCT ? ('danger' as const) : ('warn' as const),
      pct: Math.round(worst * 10) / 10,
      ref,
    }
  }, [weights])

  const chart = useMemo(() => {
    if (visible.length === 0) return null
    const values = visible.map(w => w.weight)
    let min = Math.min(...values)
    let max = Math.max(...values)
    const margin = Math.max((max - min) * 0.15, 5)
    min -= margin
    max += margin

    const x0 = dayNumber(visible[0].date)
    const span = dayNumber(visible[visible.length - 1].date) - x0
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom

    const points = visible.map(w => ({
      ...w,
      x: PAD.left + (span === 0 ? innerW / 2 : ((dayNumber(w.date) - x0) / span) * innerW),
      y: PAD.top + (1 - (w.weight - min) / (max - min)) * innerH,
    }))

    const line = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const baseY = PAD.top + innerH
    const area = points.length > 1
      ? `${points[0].x.toFixed(1)},${baseY} ${line} ${points[points.length - 1].x.toFixed(1)},${baseY}`
      : ''

    const ticks = [0, 0.5, 1].map(t => ({
      y: PAD.top + (1 - t) * innerH,
      label: String(Math.round(min + t * (max - min))),
    }))

    return { points, line, area, ticks }
  }, [visible])

  const stats = useMemo(() => {
    if (visible.length === 0) return null
    const values = visible.map(w => w.weight)
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      change: visible[visible.length - 1].weight - visible[0].weight,
    }
  }, [visible])

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Courbe de poids</h3>
        <div className={styles.periods}>
          {PERIODS.map(p => (
            <button
              key={p.id}
              className={`${styles.periodBtn} ${period === p.id ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {alert && (
        <div className={`${styles.alert} ${alert.level === 'danger' ? styles.alertDanger : styles.alertWarn}`}>
          {alert.level === 'danger' ? '🚨' : '⚠️'} Baisse de {fmt(alert.pct)} % depuis le {shortDate(alert.ref.date)} ({fmt(alert.ref.weight)} g).{' '}
          {alert.level === 'danger'
            ? 'Perte importante : consultez un vétérinaire rapidement.'
            : 'Surveillez l’appétit et les crottes ; si cela continue, consultez.'}
        </div>
      )}

      {!chart ? (
        <p className={styles.empty}>Aucune pesée sur cette période.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label="Courbe de l'évolution du poids">
            {chart.ticks.map(t => (
              <g key={t.y}>
                <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} className={styles.grid} />
                <text x={PAD.left - 6} y={t.y + 3} className={styles.axis} textAnchor="end">{t.label}</text>
              </g>
            ))}
            {chart.area && <polygon points={chart.area} className={styles.area} />}
            {chart.points.length > 1 && <polyline points={chart.line} className={styles.line} />}
            {chart.points.map((p, i) => {
              const isLast = i === chart.points.length - 1
              return (
                <g key={p.id}>
                  <circle cx={p.x} cy={p.y} r={isLast ? 5 : 3.5} className={isLast ? styles.dotLast : styles.dot}>
                    <title>{`${shortDate(p.date)} : ${fmt(p.weight)} g`}</title>
                  </circle>
                  {isLast && (
                    <text x={p.x} y={p.y - 9} className={styles.valueLabel} textAnchor="end">{fmt(p.weight)} g</text>
                  )}
                </g>
              )
            })}
            <text x={chart.points[0].x} y={H - 8} className={styles.axis} textAnchor="start">
              {shortDate(chart.points[0].date)}
            </text>
            {chart.points.length > 1 && (
              <text x={chart.points[chart.points.length - 1].x} y={H - 8} className={styles.axis} textAnchor="end">
                {shortDate(chart.points[chart.points.length - 1].date)}
              </text>
            )}
          </svg>

          {stats && (
            <div className={styles.stats}>
              <div className={styles.stat}><span className={styles.statNum}>{fmt(stats.min)} g</span><span className={styles.statLabel}>Min</span></div>
              <div className={styles.stat}><span className={styles.statNum}>{fmt(stats.avg)} g</span><span className={styles.statLabel}>Moyenne</span></div>
              <div className={styles.stat}><span className={styles.statNum}>{fmt(stats.max)} g</span><span className={styles.statLabel}>Max</span></div>
              <div className={styles.stat}>
                <span className={`${styles.statNum} ${stats.change < 0 ? styles.down : stats.change > 0 ? styles.up : ''}`}>
                  {stats.change > 0 ? '+' : ''}{fmt(stats.change)} g
                </span>
                <span className={styles.statLabel}>Sur la période</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

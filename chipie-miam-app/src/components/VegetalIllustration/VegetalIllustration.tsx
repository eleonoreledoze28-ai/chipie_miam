import { useId } from 'react'
import type { ReactNode } from 'react'
import type { Vegetal } from '../../data/vegetaux'
import { describe, rng } from './describe'
import type { Look } from './describe'

interface Props {
  vegetal: Vegetal
  className?: string
}

const DARK = '#1f3d2a'
const BROWN = '#7a5a3a'

// Teinte plus sombre ou plus claire d'une couleur « #rrggbb » (f < 1 assombrit, f > 1 éclaircit)
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1))))
  return `rgb(${c((n >> 16) & 255)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`
}

// Feuille : base en (0,0), pointe en (len,0)
const leafPath = (len: number, wid: number) =>
  `M0 0 C ${len * 0.25} ${-wid} ${len * 0.75} ${-wid * 0.7} ${len} 0 C ${len * 0.75} ${wid * 0.7} ${len * 0.25} ${wid} 0 0 Z`

function Leaf({ x, y, len, wid, angle, color, vein = true }: { x: number; y: number; len: number; wid: number; angle: number; color: string; vein?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={leafPath(len, wid)} fill={color} stroke={shade(color, 0.7)} strokeWidth="0.8" />
      {vein && <path d={`M0 0 L${len * 0.9} 0`} stroke={shade(color, 1.4)} strokeWidth="0.9" opacity="0.7" />}
    </g>
  )
}

type Draw = (look: Look, r: () => number, id: string) => ReactNode

// ── Plantes ────────────────────────────────────────────────────────────────
const sprig: Draw = (look, r) => {
  const pairs = 5 + Math.floor(r() * 3)
  const out: ReactNode[] = []
  for (let i = 0; i < pairs; i++) {
    const t = i / (pairs - 1)
    const y = 86 - t * 56
    const len = 22 - t * 9
    const wid = 8 - t * 3
    out.push(<Leaf key={`l${i}`} x={50} y={y} len={len} wid={wid} angle={-150 - r() * 12 + t * 25} color={look.color} />)
    out.push(<Leaf key={`r${i}`} x={50} y={y - 2} len={len} wid={wid} angle={-30 + r() * 12 - t * 25} color={shade(look.color, 1.08)} />)
  }
  return (
    <>
      <path d="M50 95 Q46 62 50 20" stroke={DARK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {out}
      <Leaf x={50} y={26} len={15} wid={6} angle={-90} color={look.accent} />
    </>
  )
}

const feathery: Draw = (look, r) => {
  const strands = []
  for (let k = 0; k < 9; k++) {
    const a = -150 + k * 15 + r() * 6
    const rad = (a * Math.PI) / 180
    const len = 46 + r() * 12
    const ex = 50 + Math.cos(rad) * len
    const ey = 70 + Math.sin(rad) * len
    const mx = 50 + Math.cos(rad) * len * 0.5 + (r() - 0.5) * 8
    const my = 70 + Math.sin(rad) * len * 0.5
    strands.push(
      <g key={k}>
        <path d={`M50 72 Q${mx} ${my} ${ex} ${ey}`} stroke={k % 2 ? look.color : shade(look.color, 1.2)} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {[0.45, 0.65, 0.85].map(t => (
          <path key={t} d={`M${50 + (ex - 50) * t} ${72 + (ey - 72) * t} l${Math.cos(rad - 1) * 7} ${Math.sin(rad - 1) * 7} M${50 + (ex - 50) * t} ${72 + (ey - 72) * t} l${Math.cos(rad + 1) * 7} ${Math.sin(rad + 1) * 7}`} stroke={look.accent} strokeWidth="1.2" strokeLinecap="round" />
        ))}
      </g>
    )
  }
  return <><path d="M50 96 L50 70" stroke={DARK} strokeWidth="3" strokeLinecap="round" />{strands}</>
}

const rosette: Draw = (look, r) => {
  const layers: Array<[number, number, number, number]> = [[8, 30, 26, 0.78], [7, 21, 22, 0.92], [5, 11, 17, 1.08]]
  const out: ReactNode[] = []
  layers.forEach(([count, radius, size, light], li) => {
    for (let i = 0; i < count; i++) {
      const a = (360 / count) * i + li * 24 + r() * 10
      const rad = (a * Math.PI) / 180
      out.push(
        <ellipse
          key={`${li}-${i}`}
          cx={50 + Math.cos(rad) * radius}
          cy={56 + Math.sin(rad) * radius * 0.85}
          rx={size * 0.62} ry={size * 0.5}
          transform={`rotate(${a} ${50 + Math.cos(rad) * radius} ${56 + Math.sin(rad) * radius * 0.85})`}
          fill={shade(li === 2 ? look.accent : look.color, light)} stroke={shade(look.color, 0.65)} strokeWidth="0.8"
        />
      )
    }
  })
  return <>{out}<circle cx="50" cy="56" r="6" fill={shade(look.accent, 1.1)} opacity="0.9" /></>
}

const leaf: Draw = (look, r) => (
  <>
    <Leaf x={52} y={92} len={72} wid={30} angle={-62 + r() * 8} color={shade(look.color, 0.85)} vein={false} />
    <g transform="translate(46 90) rotate(-112)">
      <path d={leafPath(60, 26)} fill={look.color} stroke={shade(look.color, 0.7)} strokeWidth="0.8" />
      <path d="M0 0 L56 0" stroke={shade(look.color, 1.5)} strokeWidth="1.4" />
      {[14, 26, 38, 48].map(x => (
        <g key={x} stroke={shade(look.color, 1.4)} strokeWidth="0.9" opacity="0.8">
          <path d={`M${x} 0 L${x + 9} -${12 - x / 6}`} /><path d={`M${x} 0 L${x + 9} ${12 - x / 6}`} />
        </g>
      ))}
    </g>
    <path d="M50 95 Q50 88 50 84" stroke={DARK} strokeWidth="2.6" strokeLinecap="round" />
  </>
)

const tops: Draw = (look, r) => {
  const out: ReactNode[] = []
  for (let k = 0; k < 5; k++) {
    const a = -150 + k * 30 + r() * 8
    const rad = (a * Math.PI) / 180
    const ex = 50 + Math.cos(rad) * 36
    const ey = 92 + Math.sin(rad) * 56
    out.push(<path key={`s${k}`} d={`M50 94 Q${50 + Math.cos(rad) * 18} ${92 + Math.sin(rad) * 24} ${ex} ${ey}`} stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" />)
    for (let j = -1; j <= 1; j++) out.push(<Leaf key={`${k}${j}`} x={ex} y={ey} len={14} wid={5} angle={a + j * 40} color={j ? look.color : look.accent} />)
  }
  return <>{out}</>
}

const root: Draw = (look, r, id) => {
  const long = look.rootShape === 'long'
  const topLeaves = (
    <>
      {[-24, 0, 24].map((a, i) => (
        <g key={i}>
          <path d={`M50 ${long ? 30 : 42} Q${50 + a * 0.6} ${long ? 18 : 28} ${50 + a} ${long ? 10 : 12}`} stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <Leaf x={50 + a} y={long ? 10 : 12} len={15} wid={6} angle={-90 + a * 1.4} color={i === 1 ? look.accent === '#4cae4f' ? '#5bb85d' : '#4cae4f' : '#3e9a4a'} />
        </g>
      ))}
    </>
  )
  if (long) {
    return (
      <>
        {topLeaves}
        <path d="M37 34 Q50 24 63 34 L55 88 Q50 97 45 88 Z" fill={`url(#g${id})`} stroke={shade(look.color, 0.7)} strokeWidth="1" />
        {[46, 58, 70].map(y => <path key={y} d={`M${42 + (y - 46) * 0.15} ${y} q8 3 ${16 - (y - 46) * 0.3} 0`} stroke={shade(look.color, 0.75)} strokeWidth="1.1" fill="none" />)}
        <ellipse cx="44" cy="46" rx="2.5" ry="9" fill="#fff" opacity="0.22" />
      </>
    )
  }
  return (
    <>
      {topLeaves}
      <path d="M50 94 q-2 -6 0 -10" stroke={shade(look.color, 0.7)} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="50" cy="64" r="26" fill={`url(#g${id})`} stroke={shade(look.color, 0.7)} strokeWidth="1" />
      {look.accent !== '#4cae4f' && <path d="M25 58 A26 26 0 0 1 75 58 Q50 50 25 58 Z" fill={look.accent} opacity="0.85" />}
      <ellipse cx="41" cy="54" rx="6" ry="9" fill="#fff" opacity="0.2" transform="rotate(-25 41 54)" />
      <path d={`M${26 + r() * 4} 70 q24 10 ${48 - r() * 4} 0`} stroke={shade(look.color, 0.75)} strokeWidth="1" fill="none" opacity="0.6" />
    </>
  )
}

const tuber: Draw = (look) => (
  <>
    {[[36, 62, 17], [58, 56, 19], [48, 74, 15], [68, 74, 12]].map(([x, y, rr], i) => (
      <circle key={i} cx={x} cy={y} r={rr} fill={shade(look.color, 0.9 + i * 0.05)} stroke={shade(look.color, 0.65)} strokeWidth="1" />
    ))}
    {[[32, 58], [56, 52], [46, 76], [66, 74], [40, 68]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill={shade(look.color, 0.55)} />)}
    <ellipse cx="44" cy="50" rx="5" ry="3" fill="#fff" opacity="0.2" />
  </>
)

const twig: Draw = (look, r) => {
  const P0 = [12, 88], P1 = [38, 48], P2 = [90, 22]
  const at = (t: number) => [
    (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ]
  const out: ReactNode[] = []
  for (let i = 0; i < 8; i++) {
    const t = 0.18 + i * 0.1
    const [x, y] = at(t)
    const side = i % 2 ? 1 : -1
    out.push(<Leaf key={i} x={x} y={y} len={17 + r() * 4} wid={7} angle={-38 + side * (52 + r() * 14)} color={i % 3 ? look.color : shade(look.color, 1.2)} />)
  }
  return (
    <>
      <path d={`M${P0} Q${P1} ${P2}`} stroke={look.accent} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {out}
      <Leaf x={P2[0]} y={P2[1]} len={16} wid={7} angle={-28} color={shade(look.color, 1.1)} />
    </>
  )
}

const flower: Draw = (look, r) => {
  const head = (() => {
    const c = look.accent
    switch (look.flower) {
      case 'pom':
        return <>{Array.from({ length: 16 }, (_, i) => <ellipse key={i} cx="50" cy="20" rx="2.2" ry="11" fill={i % 2 ? c : shade(c, 0.9)} transform={`rotate(${i * 22.5} 50 32)`} />)}<circle cx="50" cy="32" r="6" fill={shade(c, 0.8)} /></>
      case 'spike':
        return <>{Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx={50 + (i % 2 ? 3 : -3)} cy={36 - i * 4.4} rx="5" ry="3.4" fill={shade(c, 0.85 + i * 0.03)} />)}</>
      case 'mallow':
        return <>{Array.from({ length: 5 }, (_, i) => <ellipse key={i} cx="50" cy="22" rx="8" ry="11" fill={c} stroke={shade(c, 0.75)} strokeWidth="0.8" transform={`rotate(${i * 72} 50 34)`} />)}<circle cx="50" cy="34" r="4" fill="#f7e27a" /></>
      case 'clover':
        return <>{Array.from({ length: 10 }, (_, i) => <circle key={i} cx={50 + Math.cos(i * 0.628) * 8} cy={32 + Math.sin(i * 0.628) * 8} r="4.6" fill={i % 2 ? c : shade(c, 1.15)} />)}<circle cx="50" cy="32" r="5" fill={shade(c, 1.2)} /></>
      case 'none':
        return null
      default:
        return <>{Array.from({ length: 10 }, (_, i) => <ellipse key={i} cx="50" cy="21" rx="4.6" ry="10" fill={c} stroke={shade(c, 0.8)} strokeWidth="0.7" transform={`rotate(${i * 36} 50 32)`} />)}<circle cx="50" cy="32" r="6" fill={c === '#f59a2c' ? '#8a4a10' : '#f2c21c'} /></>
    }
  })()
  const base = (
    <>
      <path d="M50 95 Q54 66 50 40" stroke={DARK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <Leaf x={50} y={90} len={26} wid={9} angle={-158 + r() * 8} color={look.color} />
      <Leaf x={50} y={84} len={26} wid={9} angle={-22 - r() * 8} color={shade(look.color, 1.1)} />
      <Leaf x={51} y={70} len={20} wid={7} angle={-140} color={shade(look.color, 1.15)} />
      <Leaf x={51} y={64} len={20} wid={7} angle={-40} color={look.color} />
    </>
  )
  if (look.flower === 'none') {
    return <>{[-150, -120, -90, -60, -30].map((a, i) => <Leaf key={i} x={50} y={90} len={52 - Math.abs(a + 90) * 0.25} wid={15} angle={a} color={i % 2 ? look.color : shade(look.color, 1.12)} />)}</>
  }
  return <>{base}{head}</>
}

// ── Fruits ─────────────────────────────────────────────────────────────────
const apple: Draw = (look, _r, id) => (
  <>
    <path d="M50 30 C26 20 12 42 20 64 C27 86 42 94 50 88 C58 94 73 86 80 64 C88 42 74 20 50 30 Z" fill={`url(#g${id})`} stroke={shade(look.color, 0.65)} strokeWidth="1.2" />
    <path d="M50 30 Q52 20 56 14" stroke={BROWN} strokeWidth="3" fill="none" strokeLinecap="round" />
    <Leaf x={54} y={22} len={20} wid={8} angle={-28} color="#4cae4f" />
    <ellipse cx="34" cy="48" rx="6" ry="11" fill="#fff" opacity="0.28" transform="rotate(20 34 48)" />
  </>
)

const pear: Draw = (look, _r, id) => (
  <>
    <path d="M50 16 C42 16 40 28 38 38 C24 50 17 64 26 78 C34 92 66 92 74 78 C83 64 76 50 62 38 C60 28 58 16 50 16 Z" fill={`url(#g${id})`} stroke={shade(look.color, 0.65)} strokeWidth="1.2" />
    <path d="M50 17 Q52 9 56 6" stroke={BROWN} strokeWidth="3" fill="none" strokeLinecap="round" />
    <Leaf x={54} y={12} len={18} wid={7} angle={-20} color="#4cae4f" />
    <ellipse cx="38" cy="62" rx="5" ry="12" fill="#fff" opacity="0.26" transform="rotate(14 38 62)" />
  </>
)

const banana: Draw = (look) => (
  <>
    <path d="M12 60 C20 86 62 94 88 50 C90 43 83 41 80 46 C62 74 34 74 24 52 C22 47 11 54 12 60 Z" fill={shade(look.color, 0.92)} stroke={shade(look.color, 0.55)} strokeWidth="1.2" transform="translate(0 -8)" />
    <path d="M12 60 C20 86 62 94 88 50 C90 43 83 41 80 46 C62 74 34 74 24 52 C22 47 11 54 12 60 Z" fill={look.color} stroke={shade(look.color, 0.55)} strokeWidth="1.2" transform="translate(2 8)" />
    <path d="M16 66 C24 82 56 88 82 54" stroke="#fff" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" transform="translate(2 8)" />
    <circle cx="13" cy="62" r="3" fill={look.accent} transform="translate(2 8)" />
    <circle cx="86" cy="48" r="2.6" fill={look.accent} transform="translate(2 8)" />
  </>
)

const strawberry: Draw = (look, r, id) => (
  <>
    <path d="M50 92 C30 82 16 62 21 44 C25 30 40 30 50 36 C60 30 75 30 79 44 C84 62 70 82 50 92 Z" fill={`url(#g${id})`} stroke={shade(look.color, 0.65)} strokeWidth="1.2" />
    {Array.from({ length: 16 }, (_, i) => <ellipse key={i} cx={30 + (i % 4) * 13 + (Math.floor(i / 4) % 2) * 6} cy={46 + Math.floor(i / 4) * 11 + r() * 2} rx="1.4" ry="2.2" fill="#f7e27a" />)}
    {[-60, -30, 0, 30, 60].map(a => <Leaf key={a} x={50} y={38} len={16} wid={6} angle={-90 + a} color={look.accent} />)}
    <path d="M50 36 L50 24" stroke={DARK} strokeWidth="2.4" strokeLinecap="round" />
  </>
)

const cherry: Draw = (look, _r, id) => (
  <>
    <path d="M36 62 Q36 34 52 16 M64 58 Q64 34 52 16" stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
    <Leaf x={52} y={18} len={22} wid={8} angle={-20} color={look.accent} />
    <circle cx="36" cy="68" r="16" fill={`url(#g${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.2" />
    <circle cx="64" cy="64" r="15" fill={`url(#g${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.2" />
    <ellipse cx="30" cy="62" rx="3.4" ry="5.4" fill="#fff" opacity="0.4" />
    <ellipse cx="58" cy="58" rx="3.2" ry="5" fill="#fff" opacity="0.4" />
  </>
)

const grapes: Draw = (look) => {
  const pts: Array<[number, number]> = [[36, 40], [50, 38], [64, 40], [30, 54], [43, 52], [57, 52], [70, 54], [37, 66], [50, 64], [63, 66], [44, 78], [56, 78], [50, 90]]
  return (
    <>
      <path d="M50 38 Q50 22 56 12" stroke={BROWN} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Leaf x={52} y={22} len={26} wid={11} angle={-150} color={look.accent} />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="8.2" fill={shade(look.color, 0.85 + (i % 4) * 0.08)} stroke={shade(look.color, 0.55)} strokeWidth="0.8" />
          <circle cx={x - 2.4} cy={y - 2.6} r="1.8" fill="#fff" opacity="0.5" />
        </g>
      ))}
    </>
  )
}

const berries: Draw = (look, r) => {
  const pts: Array<[number, number]> = [[50, 30], [36, 40], [64, 40], [26, 54], [42, 52], [58, 52], [74, 54], [34, 68], [50, 66], [66, 68], [42, 80], [58, 80]]
  return (
    <>
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9" fill={shade(look.color, 0.8 + (i % 3) * 0.13)} stroke={shade(look.color, 0.5)} strokeWidth="0.8" />
          <circle cx={x - 2.6} cy={y - 3} r="1.9" fill="#fff" opacity="0.5" />
          <circle cx={x + 3} cy={y + 2.6 + r() * 0.1} r="1.3" fill={shade(look.color, 0.55)} opacity="0.6" />
        </g>
      ))}
      {[-50, -15, 20, 55].map(a => <Leaf key={a} x={50} y={26} len={14} wid={5} angle={-90 + a} color={look.accent} />)}
    </>
  )
}

const stone: Draw = (look, _r, id) => (
  <>
    <circle cx="50" cy="58" r="31" fill={`url(#g${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.2" />
    <path d="M50 28 Q40 58 50 88" stroke={shade(look.accent, 0.8)} strokeWidth="2" fill="none" opacity="0.8" />
    <path d="M50 28 Q52 20 56 16" stroke={BROWN} strokeWidth="3" fill="none" strokeLinecap="round" />
    <Leaf x={54} y={22} len={22} wid={8} angle={-25} color="#4cae4f" />
    <ellipse cx="36" cy="46" rx="5" ry="10" fill="#fff" opacity="0.28" transform="rotate(20 36 46)" />
  </>
)

const watermelon: Draw = (look) => (
  <>
    <path d="M8 38 A42 42 0 0 0 92 38 Z" fill={look.accent} stroke={shade(look.accent, 0.6)} strokeWidth="1.2" transform="translate(0 6)" />
    <path d="M13 38 A37 37 0 0 0 87 38 Z" fill="#e9f5d0" transform="translate(0 6)" />
    <path d="M17 38 A33 33 0 0 0 83 38 Z" fill={look.color} transform="translate(0 6)" />
    {[[34, 56], [50, 64], [66, 56], [42, 72], [58, 74]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="2.2" ry="3.6" fill="#1f1f1f" transform={`rotate(${(i - 2) * 14} ${x} ${y})`} />)}
  </>
)

const kiwi: Draw = (look, r) => (
  <>
    <circle cx="50" cy="54" r="34" fill={look.accent} stroke={shade(look.accent, 0.6)} strokeWidth="1.2" />
    <circle cx="50" cy="54" r="30" fill={look.color} />
    <circle cx="50" cy="54" r="30" fill="url(#none)" />
    <ellipse cx="50" cy="54" rx="9" ry="8" fill="#f5f2d0" />
    {Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2
      return <ellipse key={i} cx={50 + Math.cos(a) * 15} cy={54 + Math.sin(a) * 15} rx="1.1" ry="2.4" fill="#1f1f1f" transform={`rotate(${(a * 180) / Math.PI + 90} ${50 + Math.cos(a) * 15} ${54 + Math.sin(a) * 15})`} />
    })}
    {Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2 + r() * 0.1
      return <path key={`r${i}`} d={`M${50 + Math.cos(a) * 11} ${54 + Math.sin(a) * 11} L${50 + Math.cos(a) * 27} ${54 + Math.sin(a) * 27}`} stroke={shade(look.color, 1.3)} strokeWidth="0.9" opacity="0.7" />
    })}
  </>
)

const pineapple: Draw = (look, _r, id) => (
  <>
    {[-50, -28, -8, 12, 32, 52].map((a, i) => <Leaf key={i} x={50} y={36} len={26 - Math.abs(a) * 0.12} wid={5} angle={-90 + a} color={i % 2 ? look.accent : '#3e9a4a'} vein={false} />)}
    <ellipse cx="50" cy="66" rx="25" ry="31" fill={`url(#g${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.2" />
    <clipPath id={`p${id}`}><ellipse cx="50" cy="66" rx="25" ry="31" /></clipPath>
    <g clipPath={`url(#p${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.1" opacity="0.7">
      {Array.from({ length: 9 }, (_, i) => <path key={`a${i}`} d={`M${10 + i * 10} 30 L${50 + i * 10} 100`} />)}
      {Array.from({ length: 9 }, (_, i) => <path key={`b${i}`} d={`M${90 - i * 10} 30 L${50 - i * 10} 100`} />)}
    </g>
  </>
)

const mango: Draw = (look, _r, id) => (
  <>
    <ellipse cx="50" cy="58" rx="33" ry="26" fill={`url(#g${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.2" transform="rotate(-24 50 58)" />
    <path d="M30 40 Q44 30 60 36" stroke="#8bc34a" strokeWidth="6" fill="none" opacity="0.45" strokeLinecap="round" />
    <path d="M62 34 Q66 26 70 24" stroke={BROWN} strokeWidth="3" fill="none" strokeLinecap="round" />
    <Leaf x={66} y={28} len={22} wid={8} angle={-30} color="#4cae4f" />
    <ellipse cx="38" cy="62" rx="5" ry="10" fill="#fff" opacity="0.25" transform="rotate(-24 38 62)" />
  </>
)

const tomato: Draw = (look, _r, id) => (
  <>
    <path d="M50 32 C30 26 14 40 14 60 C14 80 32 92 50 92 C68 92 86 80 86 60 C86 40 70 26 50 32 Z" fill={`url(#g${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.2" />
    {[-72, -36, 0, 36, 72].map(a => <Leaf key={a} x={50} y={36} len={16} wid={5} angle={-90 + a * 1.1} color={look.accent} vein={false} />)}
    <path d="M50 36 L50 24" stroke={DARK} strokeWidth="2.6" strokeLinecap="round" />
    <ellipse cx="32" cy="52" rx="6" ry="10" fill="#fff" opacity="0.3" transform="rotate(20 32 52)" />
  </>
)

const melon: Draw = (look, _r, id) => (
  <>
    <circle cx="50" cy="56" r="34" fill={`url(#g${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.2" />
    {[-22, -8, 6, 20].map((dx, i) => <path key={i} d={`M${50 + dx} 24 Q${50 + dx * 1.7} 56 ${50 + dx} 88`} stroke={shade(look.color, 0.75)} strokeWidth="1.2" fill="none" opacity="0.6" />)}
    {[40, 54, 68].map(y => <path key={y} d={`M18 ${y} Q50 ${y + 6} 82 ${y}`} stroke="#fff" strokeWidth="1" fill="none" opacity="0.3" />)}
    <path d="M50 22 Q52 14 58 10" stroke={BROWN} strokeWidth="3" fill="none" strokeLinecap="round" />
  </>
)

// ── Légumes ────────────────────────────────────────────────────────────────
const pepper: Draw = (look, _r, id) => (
  <>
    <path d="M30 36 C16 46 16 76 33 87 C44 93 56 93 67 87 C84 76 84 46 70 36 C62 30 38 30 30 36 Z" fill={`url(#g${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.2" />
    <path d="M40 36 Q34 62 42 90 M60 36 Q66 62 58 90" stroke={shade(look.color, 0.7)} strokeWidth="1.2" fill="none" opacity="0.5" />
    <path d="M44 34 Q46 20 56 16 Q58 24 54 34 Z" fill={look.accent} stroke={shade(look.accent, 0.6)} strokeWidth="1" />
    <ellipse cx="32" cy="56" rx="4" ry="12" fill="#fff" opacity="0.28" />
  </>
)

const cucumber: Draw = (look, r, id) => (
  <>
    <g transform="rotate(-38 50 50)">
      <rect x="14" y="36" width="72" height="26" rx="13" fill={`url(#g${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.2" />
      {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={24 + i * 5.2} cy={44 + (i % 3) * 5 + r()} r="0.9" fill={shade(look.color, 1.4)} opacity="0.7" />)}
      <rect x="18" y="40" width="64" height="5" rx="2.5" fill="#fff" opacity="0.2" />
    </g>
    <circle cx="74" cy="74" r="15" fill={look.color} stroke={shade(look.color, 0.6)} strokeWidth="1.2" />
    <circle cx="74" cy="74" r="12" fill={look.accent} />
    {Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx={74 + Math.cos(i * 0.785) * 5.5} cy={74 + Math.sin(i * 0.785) * 5.5} rx="1.2" ry="2" fill="#e8dc9a" />)}
  </>
)

const broccoli: Draw = (look) => (
  <>
    <path d="M42 96 L44 62 L56 62 L58 96 Z" fill="#a8d070" stroke={shade('#a8d070', 0.6)} strokeWidth="1" />
    <path d="M44 66 Q30 60 26 50 M56 66 Q70 60 74 50 M50 66 L50 46" stroke="#a8d070" strokeWidth="5" fill="none" strokeLinecap="round" />
    {[[30, 46, 13], [48, 32, 15], [68, 44, 14], [38, 58, 12], [60, 58, 12], [50, 48, 12], [24, 56, 8], [76, 56, 8]].map(([x, y, rr], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r={rr} fill={i % 2 ? look.color : shade(look.color, 1.15)} stroke={shade(look.color, 0.6)} strokeWidth="0.8" />
        <circle cx={x - rr * 0.3} cy={y - rr * 0.3} r={rr * 0.25} fill={look.accent} opacity="0.6" />
      </g>
    ))}
  </>
)

const cabbage: Draw = (look, _r, id) => (
  <>
    <circle cx="50" cy="56" r="34" fill={`url(#g${id})`} stroke={shade(look.color, 0.6)} strokeWidth="1.2" />
    <path d="M20 46 Q50 70 80 46 M24 66 Q50 44 76 66 M50 24 Q38 56 50 88 M50 24 Q62 56 50 88" stroke={shade(look.accent, 0.8)} strokeWidth="1.6" fill="none" opacity="0.85" />
    <ellipse cx="38" cy="42" rx="8" ry="12" fill="#fff" opacity="0.2" transform="rotate(25 38 42)" />
  </>
)

const pod: Draw = (look) => (
  <>
    <g transform="rotate(-28 50 52)">
      <path d="M8 52 C24 30 76 30 92 52 C76 74 24 74 8 52 Z" fill={look.color} stroke={shade(look.color, 0.55)} strokeWidth="1.2" />
      <path d="M12 52 C28 38 72 38 88 52 C72 66 28 66 12 52 Z" fill={shade(look.accent, 1.05)} />
      {[24, 38, 52, 66, 80].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="52" r="7" fill={i % 2 ? '#8bd070' : '#a8e08a'} stroke="#5aa845" strokeWidth="0.8" />
          <circle cx={x - 2} cy="49.5" r="1.8" fill="#fff" opacity="0.5" />
        </g>
      ))}
      <path d="M92 52 q4 -6 6 -12" stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  </>
)

const beans: Draw = (look) => (
  <>
    {[[-14, 0], [0, 6], [14, 0]].map(([dx, dy], i) => (
      <g key={i}>
        <path d={`M${24 + dx + i * 6} 88 Q${40 + dx} ${52 + dy} ${62 + dx + i * 6} ${16 + dy}`} stroke={shade(look.color, 0.7)} strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d={`M${24 + dx + i * 6} 88 Q${40 + dx} ${52 + dy} ${62 + dx + i * 6} ${16 + dy}`} stroke={i % 2 ? look.color : look.accent} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d={`M${27 + dx + i * 6} 84 Q${42 + dx} ${52 + dy} ${60 + dx + i * 6} ${20 + dy}`} stroke="#fff" strokeWidth="1.4" fill="none" opacity="0.3" strokeLinecap="round" />
      </g>
    ))}
  </>
)

const grain: Draw = (look) => (
  <>
    <path d="M50 96 Q47 62 50 20" stroke="#a8a050" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    {Array.from({ length: 7 }, (_, i) => {
      const y = 62 - i * 7.5
      return (
        <g key={i}>
          <ellipse cx="42" cy={y} rx="9" ry="3.8" fill={look.color} stroke={look.accent} strokeWidth="0.9" transform={`rotate(-48 42 ${y})`} />
          <ellipse cx="58" cy={y - 2} rx="9" ry="3.8" fill={shade(look.color, 1.08)} stroke={look.accent} strokeWidth="0.9" transform={`rotate(48 58 ${y - 2})`} />
          <path d={`M38 ${y - 4} L24 ${y - 22} M62 ${y - 6} L76 ${y - 24}`} stroke={look.accent} strokeWidth="0.9" opacity="0.8" />
        </g>
      )
    })}
    <ellipse cx="50" cy="16" rx="4" ry="8" fill={look.color} stroke={look.accent} strokeWidth="0.9" />
  </>
)

const chard: Draw = (look) => (
  <>
    <path d="M44 96 L47 56 L53 56 L56 96 Z" fill={look.accent} stroke={shade(look.accent, 0.6)} strokeWidth="1" />
    <g transform="translate(50 62) rotate(-90)">
      <path d={leafPath(52, 28)} fill={look.color} stroke={shade(look.color, 0.6)} strokeWidth="1" />
      <path d="M0 0 L50 0" stroke={look.accent} strokeWidth="4.4" strokeLinecap="round" />
      {[12, 24, 36].map(x => <path key={x} d={`M${x} 0 L${x + 10} -11 M${x} 0 L${x + 10} 11`} stroke={shade(look.color, 1.5)} strokeWidth="1" opacity="0.7" />)}
    </g>
  </>
)

const stalks: Draw = (look) => (
  <>
    {[-18, -6, 6, 18].map((dx, i) => (
      <g key={i}>
        <path d={`M${50 + dx * 0.3} 96 Q${50 + dx * 0.8} 60 ${50 + dx * 1.6} 34`} stroke={shade(look.color, 0.75)} strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d={`M${50 + dx * 0.3} 96 Q${50 + dx * 0.8} 60 ${50 + dx * 1.6} 34`} stroke={i % 2 ? look.color : shade(look.color, 1.12)} strokeWidth="7" fill="none" strokeLinecap="round" />
        <Leaf x={50 + dx * 1.6} y={34} len={16} wid={6} angle={-90 + dx * 3} color={look.accent} />
        <Leaf x={50 + dx * 1.6} y={36} len={12} wid={5} angle={-90 + dx * 3 + 44} color={shade(look.accent, 1.1)} />
        <Leaf x={50 + dx * 1.6} y={36} len={12} wid={5} angle={-90 + dx * 3 - 44} color={look.accent} />
      </g>
    ))}
  </>
)

const DRAW: Record<Look['family'], Draw> = {
  sprig, feathery, rosette, leaf, tops, root, tuber, twig, flower,
  apple, pear, banana, strawberry, cherry, grapes, berries, stone, watermelon, kiwi, pineapple, mango, tomato, melon,
  pepper, cucumber, broccoli, cabbage, pod, beans, grain, stalks, chard,
}

// Familles dont le corps utilise un dégradé (#g…) : de la couleur principale vers une teinte plus foncée
const NEEDS_GRADIENT = new Set<Look['family']>([
  'root', 'apple', 'pear', 'strawberry', 'cherry', 'stone', 'pineapple', 'mango', 'tomato', 'melon', 'pepper', 'cucumber', 'cabbage',
])

/** Illustration vectorielle d'un aliment, avec un fond doux de la couleur de sa catégorie. */
export default function VegetalIllustration({ vegetal, className }: Props) {
  const uid = useId().replace(/:/g, '')
  const look = describe(vegetal)
  const r = rng(look.seed)
  const draw = DRAW[look.family]

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={vegetal.nom}>
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor={look.tint} stopOpacity="0.55" />
          <stop offset="100%" stopColor={look.tint} stopOpacity="0.18" />
        </radialGradient>
        {NEEDS_GRADIENT.has(look.family) && (
          <radialGradient id={`g${uid}`} cx="38%" cy="32%" r="80%">
            <stop offset="0%" stopColor={shade(look.color, 1.3)} />
            <stop offset="100%" stopColor={shade(look.color, 0.8)} />
          </radialGradient>
        )}
      </defs>
      <rect width="100" height="100" rx="14" fill={`url(#bg${uid})`} />
      <ellipse cx="50" cy="94" rx="30" ry="3.5" fill="rgba(0,0,0,0.18)" />
      {draw(look, r, uid)}
    </svg>
  )
}

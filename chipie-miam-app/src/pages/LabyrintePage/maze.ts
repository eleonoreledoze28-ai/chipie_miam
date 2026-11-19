// Logique pure du labyrinthe (aucun affichage) : génération, chemins, placement d'objets.

export interface Cell {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

export type Dir = 'up' | 'down' | 'left' | 'right'
export type Rand = () => number

export const DIRS: Record<Dir, [number, number]> = {
  up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
}
export const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const WALL_OF: Record<Dir, keyof Cell> = { up: 'top', down: 'bottom', left: 'left', right: 'right' }

/** Labyrinthe parfait (un seul chemin entre deux cases) par parcours en profondeur. */
export function generateMaze(size: number, rand: Rand): Cell[][] {
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ top: true, right: true, bottom: true, left: true })))
  const seen = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  const stack: [number, number][] = [[0, 0]]
  seen[0][0] = true

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1]
    const options: Dir[] = []
    for (const d of Object.keys(DIRS) as Dir[]) {
      const nr = r + DIRS[d][0], nc = c + DIRS[d][1]
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !seen[nr][nc]) options.push(d)
    }
    if (options.length === 0) { stack.pop(); continue }
    const d = options[Math.floor(rand() * options.length)]
    const nr = r + DIRS[d][0], nc = c + DIRS[d][1]
    grid[r][c][WALL_OF[d]] = false
    grid[nr][nc][WALL_OF[OPPOSITE[d]]] = false
    seen[nr][nc] = true
    stack.push([nr, nc])
  }
  return grid
}

export function canMove(grid: Cell[][], r: number, c: number, dir: Dir): boolean {
  const cell = grid[r]?.[c]
  return !!cell && !cell[WALL_OF[dir]]
}

export function openDirs(grid: Cell[][], r: number, c: number): Dir[] {
  return (Object.keys(DIRS) as Dir[]).filter(d => canMove(grid, r, c, d))
}

/** Plus court chemin (parcours en largeur), départ et arrivée compris. */
export function findPath(grid: Cell[][], size: number, from: [number, number], to: [number, number]): [number, number][] {
  const parent = new Map<string, [number, number] | null>()
  const key = (r: number, c: number) => `${r}-${c}`
  const queue: [number, number][] = [from]
  parent.set(key(from[0], from[1]), null)
  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i]
    if (r === to[0] && c === to[1]) {
      const path: [number, number][] = []
      let cur: [number, number] | null = [r, c]
      while (cur) { path.unshift(cur); cur = parent.get(key(cur[0], cur[1])) ?? null }
      return path
    }
    for (const d of openDirs(grid, r, c)) {
      const nr = r + DIRS[d][0], nc = c + DIRS[d][1]
      if (nr < 0 || nr >= size || nc < 0 || nc >= size || parent.has(key(nr, nc))) continue
      parent.set(key(nr, nc), [r, c])
      queue.push([nr, nc])
    }
  }
  return []
}

export function placeItems(size: number, count: number, forbidden: Set<string>, rand: Rand): Set<string> {
  const items = new Set<string>()
  for (let attempts = 0; items.size < count && attempts < 400; attempts++) {
    const key = `${Math.floor(rand() * size)}-${Math.floor(rand() * size)}`
    if (!forbidden.has(key) && !items.has(key)) items.add(key)
  }
  return items
}

export function placePortals(size: number, pairs: number, forbidden: Set<string>, rand: Rand): Map<string, string> {
  const portals = new Map<string, string>()
  let placed = 0
  for (let attempts = 0; placed < pairs && attempts < 500; attempts++) {
    const k1 = `${Math.floor(rand() * size)}-${Math.floor(rand() * size)}`
    const k2 = `${Math.floor(rand() * size)}-${Math.floor(rand() * size)}`
    if (k1 !== k2 && !forbidden.has(k1) && !forbidden.has(k2) && !portals.has(k1) && !portals.has(k2)) {
      portals.set(k1, k2)
      portals.set(k2, k1)
      forbidden.add(k1)
      forbidden.add(k2)
      placed++
    }
  }
  return portals
}

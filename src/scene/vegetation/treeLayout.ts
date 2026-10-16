import { FACADES, PATHS, PLAZAS, QUAD, SIDE_BUILDINGS, type Vec2 } from '../../config/quadLayout'
import { createRandom } from '../../lib/random'
import type { TreeKind } from './treeTypes'
import { TREE_TYPES } from './treeTypes'

export interface TreeInstance {
  kind: TreeKind
  position: Vec2
  scale: number
  rotation: number
  /** Leaf tint (sRGB hex). */
  tint: string
}

/** Summer greens, with the odd tree already turning (reference 2 is early autumn). */
const LEAF_TINTS = ['#7fae4f', '#6fa246', '#86b356', '#77a84b', '#6a9a42', '#8db45a']
const TURNING_TINTS = ['#b9b14a', '#c99a45']

/** Rough rectangle footprints of every building (with a margin) for rejection. */
const FOOTPRINTS: [number, number, number, number][] = [
  [-50, FACADES.union - 34, 50, FACADES.union + 9],
  [-27, FACADES.foellinger - 16, 27, FACADES.foellinger + 58],
  ...SIDE_BUILDINGS.map(({ position: [x, z], width, depth }): [number, number, number, number] => {
    const front = Math.sign(x) * -1 // buildings face the Quad
    const near = x + front * 4
    const far = x - front * (depth + 2)
    return [Math.min(near, far), z - width / 2 - 2, Math.max(near, far), z + width / 2 + 2]
  }),
  [-110, -200, -60, -150], // Altgeld
]

function distanceToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz)
}

function clearOfPaths(p: Vec2, margin: number) {
  if (PATHS.some((s) => distanceToSegment(p, s.from, s.to) < s.width / 2 + margin)) return false
  return !PLAZAS.some(([x0, z0, x1, z1]) => p[0] > x0 - margin && p[0] < x1 + margin && p[1] > z0 - margin && p[1] < z1 + margin)
}

const clearOfBuildings = (p: Vec2) => !FOOTPRINTS.some(([x0, z0, x1, z1]) => p[0] > x0 && p[0] < x1 && p[1] > z0 && p[1] < z1)

/**
 * Places the Quad's trees like the real thing: elms lining both long sides
 * between walk and facades, a looser row along the lawn edges, clusters
 * framing both ends, and a woodland backdrop around the buildings.
 * The central lawn stays open.
 */
export function generateTrees(): TreeInstance[] {
  const rand = createRandom(1867)
  const trees: TreeInstance[] = []
  const tint = () => (rand() < 0.07 ? TURNING_TINTS[Math.floor(rand() * TURNING_TINTS.length)] : LEAF_TINTS[Math.floor(rand() * LEAF_TINTS.length)])
  const tooClose = (p: Vec2, kind: TreeKind) =>
    trees.some((t) => Math.hypot(t.position[0] - p[0], t.position[1] - p[1]) < (TREE_TYPES[t.kind].spread * t.scale + TREE_TYPES[kind].spread) * 0.62)

  const tryPlace = (p: Vec2, kind: TreeKind, scale: number, pathMargin: number) => {
    if (!clearOfPaths(p, pathMargin) || !clearOfBuildings(p) || tooClose(p, kind)) return false
    trees.push({ kind, position: p, scale, rotation: rand() * Math.PI * 2, tint: tint() })
    return true
  }

  // 1. Side strips between the perimeter walks and the facades.
  for (const side of [-1, 1]) {
    for (let z = QUAD.north + 6; z <= QUAD.south - 6; z += 12) {
      const p: Vec2 = [side * (QUAD.halfWidth + 7.5 + (rand() - 0.5) * 2.5), z + (rand() - 0.5) * 4]
      tryPlace(p, rand() < 0.65 ? 'elm' : 'oak', 0.85 + rand() * 0.3, 2)
    }
  }
  // 2. Looser row along the lawn edges, inside the walks.
  for (const side of [-1, 1]) {
    for (let z = QUAD.north + 10; z <= QUAD.south - 10; z += 17) {
      const p: Vec2 = [side * (QUAD.halfWidth - 6 - rand() * 3), z + (rand() - 0.5) * 6]
      tryPlace(p, rand() < 0.5 ? 'elm' : rand() < 0.6 ? 'oak' : 'maple', 0.75 + rand() * 0.35, 2.5)
    }
  }
  // 3. Clusters framing each end of the lawn.
  for (const zEnd of [QUAD.north + 8, QUAD.south - 8]) {
    for (let i = 0; i < 14; i++) {
      const side = rand() < 0.5 ? -1 : 1
      const p: Vec2 = [side * (18 + rand() * 26), zEnd + (rand() - 0.5) * 14]
      tryPlace(p, rand() < 0.5 ? 'maple' : 'oak', 0.7 + rand() * 0.35, 2.5)
    }
  }
  // 4. Flanking the landmark plazas and the street corners.
  for (const [x, z] of [[-30, -132], [30, -132], [-27, 130], [27, 130], [-58, -131], [58, -131], [-58, 131], [58, 131]] as const) {
    tryPlace([x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3], 'young', 1 + rand() * 0.3, 1.2)
  }
  // 5. Woodland backdrop around and between the buildings.
  for (let i = 0; i < 900 && trees.length < 230; i++) {
    const p: Vec2 = [(rand() - 0.5) * 300, (rand() - 0.5) * 460]
    const inside = Math.abs(p[0]) < FACADES.east + 4 && p[1] > FACADES.union && p[1] < FACADES.foellinger
    if (inside) continue
    const kind: TreeKind = rand() < 0.4 ? 'elm' : rand() < 0.7 ? 'oak' : 'maple'
    tryPlace(p, kind, 0.85 + rand() * 0.4, 1.5)
  }
  return trees
}

/** Foundation shrubs along the side buildings' facades and the Union terrace. */
export function generateShrubs(): TreeInstance[] {
  const rand = createRandom(77)
  const shrubs: TreeInstance[] = []
  const add = (x: number, z: number) =>
    shrubs.push({ kind: 'shrub', position: [x, z], scale: 0.8 + rand() * 0.45, rotation: rand() * Math.PI * 2, tint: rand() < 0.5 ? '#5f8f3e' : '#4f7f38' })

  for (const { position: [bx, bz], width } of SIDE_BUILDINGS) {
    const x = bx + Math.sign(-bx) * 1.6
    for (let z = bz - width / 2 + 1.2; z <= bz + width / 2 - 1.2; z += 1.7 + rand() * 0.5) {
      // Leave the doorway and its walk clear.
      if (Math.abs(z - bz) < 5.5) continue
      add(x + (rand() - 0.5) * 0.4, z)
    }
  }
  for (let x = -23; x <= 23; x += 1.8) {
    if (Math.abs(x) < 8.5) continue
    add(x, FACADES.union + 7.6)
  }
  for (const side of [-1, 1]) for (let z = FACADES.foellinger + 1; z <= FACADES.foellinger + 16; z += 1.9) add(side * 22.5, z)
  return shrubs
}

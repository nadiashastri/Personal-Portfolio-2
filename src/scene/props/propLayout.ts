import { FACADES, PATHS, QUAD, type Vec2 } from '../../config/quadLayout'
import type { Transform } from '../architecture/parts/Instanced'

export interface PropLayout {
  lamps: Transform[]
  benches: Transform[]
  /** wallSide: which Z direction a backing wall lies in, for tiered planting. */
  flowerBeds: { centre: Vec2; size: Vec2; wallSide?: 1 | -1 }[]
}

const W = QUAD.halfWidth
const at = (x: number, z: number, rotationY = 0): Transform => ({ position: [x, 0, z], rotationY })

/** True when (x, z) is at least `margin` metres clear of every walk. */
function offPaths(x: number, z: number, margin = 0.3) {
  return PATHS.every(({ from, to, width }) => {
    const dx = to[0] - from[0]
    const dz = to[1] - from[1]
    const t = Math.max(0, Math.min(1, ((x - from[0]) * dx + (z - from[1]) * dz) / (dx * dx + dz * dz)))
    return Math.hypot(x - from[0] - t * dx, z - from[1] - t * dz) >= width / 2 + margin
  })
}

/**
 * Street furniture, kept sparse like the real Quad: the lawn and its inner
 * walks have none. Lampposts only line the corner walks that lead out of the
 * Quad, and a few backless concrete benches sit along the outer perimeter walks.
 */
export function generateProps(): PropLayout {
  const lamps: Transform[] = []
  const benches: Transform[] = []

  // Lamps in pairs framing each corner exit walk (from x = ±62 out to ±90).
  for (const sx of [-1, 1]) {
    for (const z of [QUAD.north, QUAD.south]) {
      for (const x of [68, 80]) {
        for (const side of [-1, 1]) {
          const px = sx * x
          const pz = z + side * 2.2
          if (offPaths(px, pz)) lamps.push(at(px, pz))
        }
      }
    }
  }

  // A few benches on the outer edge of the perimeter walks, facing the lawn.
  for (const side of [-1, 1]) {
    for (const z of [-78, -10, 48, 106]) {
      const x = side * (W + 2.2)
      if (offPaths(x, z, 0.5)) benches.push(at(x, z, side < 0 ? Math.PI / 2 : -Math.PI / 2))
    }
  }

  // Flower beds flanking the Union's entrance.
  const flowerBeds = [
    { centre: [-14, FACADES.union + 9.6] as Vec2, size: [9, 1.6] as Vec2 },
    { centre: [14, FACADES.union + 9.6] as Vec2, size: [9, 1.6] as Vec2 },
    // Foellinger's planting follows its curved terrace (FoellingerTerraceView).
  ]

  return { lamps, benches, flowerBeds }
}

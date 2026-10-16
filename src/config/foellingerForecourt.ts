/**
 * Foellinger Auditorium's semicircular forecourt (added in the 1985
 * renovation): a raised, D-shaped stone platform projecting from the main
 * entrance into the Quad, ringed by a curved balustrade and planting.
 *
 * Coordinates are in the building's local space: x across the facade,
 * +z outward from the facade towards the Quad. The building is rotated 180°
 * in the world, so world x = -x and world z = facadeZ - z.
 *
 * Plan (top-down):
 *
 *        facade ─────────────────────────────────
 *                  │ back edge (podium front) │
 *        shoulder  │                          │  ← straight sides (side stairs)
 *                   ╲                        ╱
 *                     ╲_______ apex _______╱      ← superellipse curve
 */

export const FORECOURT = {
  /** Total width at the building end. */
  width: 36,
  /** Back edge → apex: how far the forecourt projects into the Quad. */
  projection: 15,
  /** Straight side length before the curve begins (the side stairs sit here). */
  shoulder: 3.4,
  /**
   * Curve shape: superellipse exponent. 2 = a true half-ellipse, larger
   * values square the D off (fuller shoulders, flatter front).
   */
  roundness: 2.3,
  /** Local z of the straight back edge (the front of the column podium). */
  back: 3.2,
  /** Platform height above the lawn. */
  height: 1.0,
  /** Balustrade: height, spacing of balusters and posts along the curve, inset from the edge. */
  rail: { height: 1.0, balusterSpacing: 0.3, postSpacing: 3.2, inset: 0.3 },
  /** Planted bed hugging the curve: from `inner` to `outer` metres out from the wall. */
  bed: { inner: 0.25, outer: 2.6 },
  /** Walk wrapping around the bed (centreline offset from the wall, width). */
  walk: { offset: 3.7, width: 2.6 },
  /** Side stairs in each shoulder, down to the walk. */
  sideStairs: { steps: 5, run: 0.45 },
} as const

export interface OutlinePoint {
  x: number
  z: number
  /** Outward unit normal. */
  nx: number
  nz: number
  /** Distance along the outline from its start. */
  s: number
  /** True on the curve, false on the straight shoulders. */
  curved: boolean
}

const HW = FORECOURT.width / 2
/** Where the straight shoulders end and the curve begins. */
export const CURVE_START_Z = FORECOURT.back + FORECOURT.shoulder
const CURVE_DEPTH = FORECOURT.projection - FORECOURT.shoulder
const POWER = 2 / FORECOURT.roundness

/** Point on the curve at angle φ ∈ [-π/2, π/2] (0 = apex), before any offset. */
export function curvePoint(phi: number): [x: number, z: number] {
  const s = Math.sin(phi)
  const c = Math.cos(phi)
  return [HW * Math.sign(s) * Math.abs(s) ** POWER, CURVE_START_Z + CURVE_DEPTH * Math.abs(c) ** POWER]
}

/**
 * The forecourt's outline, offset outward by `offset` metres (negative = inward).
 * `part` selects the whole D (shoulders + curve) or just the curve.
 */
export function outline(offset = 0, part: 'all' | 'curve' = 'all', samples = 240): OutlinePoint[] {
  // Base points: left shoulder (back → curve start), the curve, right shoulder.
  const base: { x: number; z: number; curved: boolean }[] = []
  const shoulderSteps = 6
  if (part === 'all') {
    for (let i = 0; i < shoulderSteps; i++) base.push({ x: -HW, z: FORECOURT.back + (FORECOURT.shoulder * i) / shoulderSteps, curved: false })
  }
  for (let i = 0; i <= samples; i++) {
    const [x, z] = curvePoint(-Math.PI / 2 + (Math.PI * i) / samples)
    base.push({ x, z, curved: true })
  }
  if (part === 'all') {
    for (let i = shoulderSteps - 1; i >= 0; i--) base.push({ x: HW, z: FORECOURT.back + (FORECOURT.shoulder * i) / shoulderSteps, curved: false })
  }

  // Outward normals from neighbouring points (the outline runs clockwise seen from above).
  const out: OutlinePoint[] = []
  let s = 0
  base.forEach((p, i) => {
    const a = base[Math.max(0, i - 1)]
    const b = base[Math.min(base.length - 1, i + 1)]
    let tx = b.x - a.x
    let tz = b.z - a.z
    const len = Math.hypot(tx, tz) || 1
    tx /= len
    tz /= len
    // Tangent runs left → apex → right; outward is the tangent turned clockwise.
    const nx = -tz
    const nz = tx
    const x = p.x + nx * offset
    const z = p.z + nz * offset
    if (out.length) s += Math.hypot(x - out[out.length - 1].x, z - out[out.length - 1].z)
    out.push({ x, z, nx, nz, s, curved: p.curved })
  })
  return out
}

/** Point and outward normal at distance `s` along an outline. */
export function pointAt(points: readonly OutlinePoint[], s: number): OutlinePoint {
  let i = 1
  while (i < points.length - 1 && points[i].s < s) i++
  const a = points[i - 1]
  const b = points[i]
  const t = b.s === a.s ? 0 : Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s)))
  const nx = a.nx + (b.nx - a.nx) * t
  const nz = a.nz + (b.nz - a.nz) * t
  const n = Math.hypot(nx, nz) || 1
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, nx: nx / n, nz: nz / n, s, curved: a.curved }
}

/** Total length of an outline. */
export const lengthOf = (points: readonly OutlinePoint[]) => points[points.length - 1].s

type Seg = { from: readonly [number, number]; to: readonly [number, number]; width: number }

/**
 * Walks around the forecourt, in world space: a curved walk hugging the bed,
 * the two halves of the south walk ending where they meet it, and the apex
 * point where the Quad's diagonals now converge.
 */
export function forecourtWalks(facadeZ: number, southZ: number, southHalfLength: number, southWidth: number) {
  const toWorld = (p: OutlinePoint): [number, number] => [-p.x, facadeZ - p.z]
  const ring = outline(FORECOURT.walk.offset, 'all', 60).filter((p) => p.z > FORECOURT.back + 0.3)
  const segments: Seg[] = []
  for (let i = 1; i < ring.length; i++) segments.push({ from: toWorld(ring[i - 1]), to: toWorld(ring[i]), width: FORECOURT.walk.width })

  // Where the ring crosses the south walk's line (world z = southZ), on each side.
  const crossingLocalZ = facadeZ - southZ
  const crossX: number[] = []
  for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1]
    const b = ring[i]
    if ((a.z - crossingLocalZ) * (b.z - crossingLocalZ) <= 0 && a.z !== b.z) {
      const t = (crossingLocalZ - a.z) / (b.z - a.z)
      crossX.push(Math.abs(a.x + (b.x - a.x) * t))
    }
  }
  const cross = crossX.length ? Math.max(...crossX) : 0
  if (cross > 0) {
    segments.push({ from: [-southHalfLength, southZ], to: [-cross, southZ], width: southWidth })
    segments.push({ from: [cross, southZ], to: [southHalfLength, southZ], width: southWidth })
  } else {
    segments.push({ from: [-southHalfLength, southZ], to: [southHalfLength, southZ], width: southWidth })
  }

  const apex = outline(FORECOURT.walk.offset, 'curve', 60)
  const [, apexZ] = toWorld(apex[Math.floor(apex.length / 2)])
  return { segments, apex: [0, apexZ] as [number, number], crossesSouthWalk: cross > 0 }
}

import { useMemo } from 'react'
import { CylinderGeometry, Shape, ShapeGeometry, SphereGeometry } from 'three'
import { FACADES } from '../../config/quadLayout'
import { getMaterials } from '../materials/materials'
import { box, gableRoof, hipRoof, moulding, place, quoinTransforms, row, triangularPrism } from './geometry'
import { PartList, Parts } from './kit'
import { Balustrade } from './parts/Balustrade'
import { Instanced, type Transform } from './parts/Instanced'
import { ModelInstances, ORNAMENT_URLS } from './parts/ornaments'
import { WindowSet } from './parts/WindowSet'
import type { WindowSpec } from './parts/windows'

/*
 * Illini Union — Georgian Revival, red brick with limestone and white-painted
 * trim (see references 4 and 9). Local space: the south facade faces +Z at z = 0.
 */

const BASE = 1 // stone water table / terrace level
const FLOORS = [4.6, 4.2, 3.8]
const WALL_TOP = BASE + FLOORS.reduce((a, b) => a + b, 0) // 13.6
export const MAIN = { w: 56, d: 24 }
const PAVILION = { w: 20, out: 1.2 }
const ROOF_H = 8.6
const CORNICE_H = 0.85
const ROOF_Y = WALL_TOP + CORNICE_H - 0.1
const RIDGE_Y = ROOF_Y + ROOF_H
export const WING = { w: 19, d: 26, setBack: 5, top: BASE + 4.4 + 4.0 }
/** Front terrace (width along the facade, depth towards the Quad). */
export const UNION_TERRACE = { w: 46, d: 7 }
const BAY = 4

const GROUND_WINDOW: WindowSpec = { width: 1.5, height: 3.1, arched: true, cols: 3, rows: 4, head: 'keystone' }
const DOOR: WindowSpec = { width: 2.1, height: 3.9, arched: true, cols: 2, rows: 2, head: 'keystone' }
const SECOND_WINDOW: WindowSpec = { width: 1.5, height: 2.6, cols: 3, rows: 4, head: 'keystone' }
const THIRD_WINDOW: WindowSpec = { width: 1.4, height: 1.95, cols: 3, rows: 4, head: 'flat' }
const DORMER_WINDOW: WindowSpec = { width: 0.95, height: 1.35, cols: 2, rows: 3, head: 'none' }
const WING_GROUND: WindowSpec = { width: 1.4, height: 2.7, arched: true, cols: 3, rows: 4, head: 'keystone' }
const WING_UPPER: WindowSpec = { width: 1.4, height: 2.3, cols: 3, rows: 4, head: 'flat' }

function buildUnion() {
  const m = getMaterials()
  const parts = new PartList()
  const quoins: Transform[] = []
  const dentils: Transform[] = []
  const sills = { ground: [] as Transform[], doors: [] as Transform[], second: [] as Transform[], third: [] as Transform[], dormer: [] as Transform[], wingGround: [] as Transform[], wingUpper: [] as Transform[] }

  // --- Main block
  const cz = -MAIN.d / 2
  parts.add(m.limestone, place(box(MAIN.w + 0.3, BASE, MAIN.d + 0.3), [0, BASE / 2, cz]))
  parts.add(m.brick.warm, place(box(MAIN.w, WALL_TOP - BASE, MAIN.d), [0, (BASE + WALL_TOP) / 2, cz]))
  parts.add(m.limestone, place(moulding(MAIN.w, MAIN.d, [[0.1, 0.32]]), [0, BASE + FLOORS[0] - 0.1, cz]))
  parts.add(m.whitePaint, place(moulding(MAIN.w, MAIN.d, [[0.08, 0.3], [0.28, 0.2], [0.55, 0.35]]), [0, WALL_TOP, cz]))
  parts.add(m.slate, place(hipRoof(MAIN.w + 1.2, MAIN.d + 1.2, ROOF_H), [0, ROOF_Y, cz]))

  // Dentils under the cornice, along the front.
  for (let x = -MAIN.w / 2 + 0.2; x <= MAIN.w / 2 - 0.2; x += 0.32) dentils.push({ position: [x, WALL_TOP + 0.38, 0.32] })

  // --- Centre pavilion: projects forward, limestone ground storey, quoined corners.
  const pz = PAVILION.out / 2
  parts.add(m.brick.warm, place(box(PAVILION.w, WALL_TOP - BASE, PAVILION.out), [0, (BASE + WALL_TOP) / 2, pz]))
  parts.add(m.limestone, place(box(PAVILION.w + 0.1, FLOORS[0], PAVILION.out + 0.1), [0, BASE + FLOORS[0] / 2, pz]))
  parts.add(m.whitePaint, place(moulding(PAVILION.w, PAVILION.out, [[0.08, 0.3], [0.28, 0.2], [0.55, 0.35]], true), [0, WALL_TOP, pz - 0.05]))
  for (const x of [-MAIN.w / 2, MAIN.w / 2]) quoins.push(...quoinTransforms(x, 0, BASE, WALL_TOP, x < 0 ? -1 : 1))
  for (const x of [-PAVILION.w / 2, PAVILION.w / 2]) quoins.push(...quoinTransforms(x, PAVILION.out, BASE + FLOORS[0], WALL_TOP, x < 0 ? -1 : 1))

  // --- Front windows, bay by bay
  const y2 = BASE + FLOORS[0] + 0.7
  const y3 = BASE + FLOORS[0] + FLOORS[1] + 0.55
  for (const x of row(13, BAY)) {
    const inPavilion = Math.abs(x) < PAVILION.w / 2
    const z = inPavilion ? PAVILION.out : 0
    if (inPavilion && Math.abs(x) < 6) sills.doors.push({ position: [x, BASE, z] })
    else sills.ground.push({ position: [x, BASE + 0.6, z] })
    sills.second.push({ position: [x, y2, z] })
    sills.third.push({ position: [x, y3, z] })
  }
  // Door leaves inside the lower part of each arched doorway.
  for (const d of sills.doors) parts.add(m.doorWood, place(box(DOOR.width - 0.1, 2.75, 0.06), [d.position[0], BASE + 1.38, d.position[2] + 0.04]))

  // --- Dormers on the front slope: every bay except the centre, below the cupola.
  const slopeRun = MAIN.d / 2 + 0.6
  const dormerFrontZ = -2.4
  const dormerBaseY = ROOF_Y + (ROOF_H * (0.6 - dormerFrontZ)) / slopeRun
  for (const x of row(13, BAY)) {
    if (Math.abs(x) < 1) continue
    const bodyD = 3.6
    parts.add(m.whitePaint, place(box(1.9, 2.3, bodyD), [x, dormerBaseY + 0.85, dormerFrontZ - bodyD / 2]))
    parts.add(m.slate, place(gableRoof(1.9, bodyD + 0.3, 1.0, 0.2), [x, dormerBaseY + 2, dormerFrontZ - bodyD / 2 + 0.15]))
    parts.add(m.whitePaint, place(triangularPrism(2.3, 1.05, 0.18), [x, dormerBaseY + 1.98, dormerFrontZ + 0.08]))
    sills.dormer.push({ position: [x, dormerBaseY + 0.15, dormerFrontZ] })
  }

  // --- Chimneys: tall brick stacks with stone caps.
  for (const [x, base, h] of [[-12.5, RIDGE_Y - 2, 6.4], [12.5, RIDGE_Y - 2, 6.4], [-24.5, ROOF_Y + 3, 7.4], [24.5, ROOF_Y + 3, 7.4]] as const) {
    parts.add(m.brick.warm, place(box(1.7, h, 1.1), [x, base + h / 2, cz]))
    parts.add(m.stoneTrim, place(box(2, 0.3, 1.4), [x, base + h + 0.1, cz]))
  }

  // --- Cupola: square clock stage, octagonal arcaded belfry, dome, weathervane.
  // Modelled in Blender (union_cupola.glb); this simpler version shows while it loads.
  const cy = RIDGE_Y - 1.3
  const cupola = new PartList()
  const cupolaAt: Transform[] = [{ position: [0, cy, cz] }]
  cupola.add(m.whitePaint, place(box(5.6, 4.6, 5.6), [0, cy + 2.3, cz]))
  cupola.add(m.whitePaint, place(moulding(5.6, 5.6, [[0.15, 0.25], [0.35, 0.25]]), [0, cy + 4.6, cz]))
  for (const [px, pz] of [[-2.65, 2.65], [2.65, 2.65], [-2.65, -2.65], [2.65, -2.65]]) {
    cupola.add(m.whitePaint, place(box(0.5, 4.6, 0.5), [px, cy + 2.3, cz + pz]))
  }
  const clockY = cy + 2.7
  cupola.add(m.clockFace, place(new CylinderGeometry(1.05, 1.05, 0.1, 32), [0, clockY, cz + 2.86], [Math.PI / 2, 0, 0]))
  cupola.add(m.lead, place(new CylinderGeometry(1.15, 1.15, 0.08, 32, 1, true), [0, clockY, cz + 2.86], [Math.PI / 2, 0, 0]))
  cupola.add(m.lead, place(box(0.07, 0.75, 0.04), [0.12, clockY + 0.3, cz + 2.93], [0, 0, -0.35]))
  cupola.add(m.lead, place(box(0.08, 0.55, 0.04), [-0.2, clockY - 0.12, cz + 2.93], [0, 0, 1.1]))

  const octY = cy + 5.1
  const octR = 2.1
  cupola.add(m.whitePaint, place(new CylinderGeometry(octR, octR, 4.2, 8), [0, octY + 2.1, cz], [0, Math.PI / 8, 0]))
  cupola.add(m.whitePaint, place(new CylinderGeometry(octR + 0.3, octR + 0.25, 0.35, 8), [0, octY + 4.35, cz], [0, Math.PI / 8, 0]))
  const archShape = new Shape()
  archShape.moveTo(-0.5, 0)
  archShape.lineTo(0.5, 0)
  archShape.lineTo(0.5, 2.2)
  archShape.absarc(0, 2.2, 0.5, 0, Math.PI, false)
  archShape.lineTo(-0.5, 0)
  const opening = new ShapeGeometry(archShape, 10)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const r = octR * Math.cos(Math.PI / 8) + 0.02
    cupola.add(m.lead, place(opening, [Math.sin(a) * r, octY + 0.6, cz + Math.cos(a) * r], [0, a, 0]))
  }
  cupola.add(m.lead, place(new SphereGeometry(octR + 0.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), [0, octY + 4.5, cz], [0, 0, 0], [1, 1.15, 1]))
  cupola.add(m.whitePaint, place(new CylinderGeometry(0.3, 0.45, 0.6, 12), [0, octY + 7, cz]))
  cupola.add(m.ironBlack, place(new CylinderGeometry(0.06, 0.06, 2.6, 6), [0, octY + 8.5, cz]))
  cupola.add(m.ironBlack, place(box(1.3, 0.12, 0.04), [0.1, octY + 9.2, cz]))
  cupola.add(m.ironBlack, place(box(0.6, 0.04, 0.6), [0, octY + 8.5, cz], [0, Math.PI / 4, 0]))

  // --- Wings: lower, set back either side.
  for (const side of [-1, 1] as const) {
    const wx = side * (MAIN.w / 2 + WING.w / 2)
    const wz = -WING.setBack - WING.d / 2
    parts.add(m.limestone, place(box(WING.w + 0.3, BASE, WING.d + 0.3), [wx, BASE / 2, wz]))
    parts.add(m.brick.warm, place(box(WING.w, WING.top - BASE, WING.d), [wx, (BASE + WING.top) / 2, wz]))
    parts.add(m.limestone, place(moulding(WING.w, WING.d, [[0.1, 0.3]]), [wx, BASE + 4.3, wz]))
    parts.add(m.whitePaint, place(moulding(WING.w, WING.d, [[0.08, 0.25], [0.45, 0.35]]), [wx, WING.top, wz]))
    parts.add(m.slate, place(hipRoof(WING.w + 1, WING.d + 1, 6), [wx, WING.top + 0.55, wz]))
    quoins.push(...quoinTransforms(wx + side * (WING.w / 2), -WING.setBack, BASE, WING.top, side))
    for (const dx of row(4, 4.2)) {
      sills.wingGround.push({ position: [wx + dx, BASE + 0.6, -WING.setBack] })
      sills.wingUpper.push({ position: [wx + dx, BASE + 4.4 + 0.7, -WING.setBack] })
    }
    // Outer side windows.
    for (const dz of row(5, 4.4)) {
      const sx = wx + side * (WING.w / 2)
      sills.wingGround.push({ position: [sx, BASE + 0.6, wz + dz], rotationY: side * (Math.PI / 2) })
      sills.wingUpper.push({ position: [sx, BASE + 4.4 + 0.7, wz + dz], rotationY: side * (Math.PI / 2) })
    }
  }

  parts
    .addWindows(GROUND_WINDOW, sills.ground)
    .addWindows(DOOR, sills.doors)
    .addWindows(SECOND_WINDOW, sills.second)
    .addWindows(THIRD_WINDOW, sills.third)
    .addWindows(DORMER_WINDOW, sills.dormer)
    .addWindows(WING_GROUND, sills.wingGround)
    .addWindows(WING_UPPER, sills.wingUpper)

  // --- Front terrace with steps down to the plaza.
  const T = UNION_TERRACE
  parts.add(m.limestone, place(box(T.w, BASE, T.d), [0, BASE / 2, T.d / 2]))
  for (let i = 0; i < 5; i++) {
    const h = BASE - (i + 1) * 0.2
    if (h <= 0) break
    parts.add(m.stoneTrim, place(box(14, h, 0.42), [0, h / 2, T.d + 0.21 + i * 0.42]))
  }

  return { parts: parts.build(), cupola: cupola.build(), cupolaAt, windows: parts.windows, quoins, dentils, terrace: T }
}

export function IlliniUnion() {
  const union = useMemo(buildUnion, [])
  const m = getMaterials()
  const dentil = useMemo(() => box(0.14, 0.18, 0.16), [])
  const quoin = useMemo(() => box(1, 1, 1), [])
  const { terrace: T } = union

  return (
    <group position={[0, 0, FACADES.union]}>
      <Parts parts={union.parts} />
      <ModelInstances url={ORNAMENT_URLS.unionCupola} transforms={union.cupolaAt} fallback={<Parts parts={union.cupola} />} />
      {union.windows.map((w, i) => (
        <WindowSet key={i} spec={w.spec} placements={w.placements} />
      ))}
      <Instanced geometry={quoin} material={m.limestone} transforms={union.quoins} />
      <Instanced geometry={dentil} material={m.whitePaint} transforms={union.dentils} />
      <Balustrade from={[-T.w / 2 + 0.2, T.d - 0.2]} to={[-7.2, T.d - 0.2]} y={BASE} />
      <Balustrade from={[7.2, T.d - 0.2]} to={[T.w / 2 - 0.2, T.d - 0.2]} y={BASE} />
      <Balustrade from={[-T.w / 2 + 0.2, 0.3]} to={[-T.w / 2 + 0.2, T.d - 0.2]} y={BASE} />
      <Balustrade from={[T.w / 2 - 0.2, 0.3]} to={[T.w / 2 - 0.2, T.d - 0.2]} y={BASE} />
    </group>
  )
}

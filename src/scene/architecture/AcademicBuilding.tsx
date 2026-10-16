import { useMemo } from 'react'
import type { BuildingSite } from '../../config/quadLayout'
import { getMaterials } from '../materials/materials'
import { box, gableRoof, hipRoof, moulding, place, quoinTransforms, row, triangularPrism } from './geometry'
import { PartList, Parts } from './kit'
import { Balustrade } from './parts/Balustrade'
import { Instanced, type Transform } from './parts/Instanced'
import { IonicColumns } from './parts/ornaments'
import { WindowSet } from './parts/WindowSet'
import type { WindowSpec } from './parts/windows'

/*
 * Reusable red-brick academic hall in the Georgian / Classical Revival style
 * that lines the Quad: stone base and belt course, regular bays of sash
 * windows, a centre pavilion with either a pedimented doorway or a columned
 * portico, and a slate hip roof or a parapeted flat roof.
 * Local space: the main facade faces +Z at z = 0.
 */

type Spec = Pick<BuildingSite, 'width' | 'depth' | 'floors' | 'roof' | 'brick' | 'entrance'>

const BASE = 0.9
const FLOOR = 4
const BAY = 3.5

const GROUND: WindowSpec = { width: 1.4, height: 2.6, cols: 3, rows: 4, head: 'keystone' }
const UPPER: WindowSpec = { width: 1.4, height: 2.4, cols: 3, rows: 4, head: 'flat' }
const TOP: WindowSpec = { width: 1.35, height: 1.9, cols: 3, rows: 4, head: 'flat' }
const DOOR: WindowSpec = { width: 2.4, height: 4, arched: true, cols: 2, rows: 2, head: 'keystone' }
const DORMER: WindowSpec = { width: 0.9, height: 1.2, cols: 2, rows: 3, head: 'none' }

function buildAcademic({ width: w, depth: d, floors, roof, brick, entrance }: Spec) {
  const m = getMaterials()
  const parts = new PartList()
  const quoins: Transform[] = []
  const columns: Transform[] = []
  const brickMat = m.brick[brick]
  const top = BASE + floors * FLOOR
  const cz = -d / 2
  const pav = { w: Math.min(14, Math.round(w * 0.3)), out: 0.9 }

  parts.add(m.limestone, place(box(w + 0.3, BASE, d + 0.3), [0, BASE / 2, cz]))
  parts.add(brickMat, place(box(w, top - BASE, d), [0, (BASE + top) / 2, cz]))
  parts.add(m.limestone, place(moulding(w, d, [[0.1, 0.3]]), [0, BASE + FLOOR - 0.15, cz]))
  quoins.push(...quoinTransforms(-w / 2, 0, BASE, top, -1), ...quoinTransforms(w / 2, 0, BASE, top, 1))

  // Pavilion
  parts.add(brickMat, place(box(pav.w, top - BASE, pav.out), [0, (BASE + top) / 2, pav.out / 2]))
  parts.add(m.limestone, place(box(pav.w + 0.1, FLOOR, pav.out + 0.1), [0, BASE + FLOOR / 2, pav.out / 2]))
  quoins.push(...quoinTransforms(-pav.w / 2, pav.out, BASE + FLOOR, top, -1), ...quoinTransforms(pav.w / 2, pav.out, BASE + FLOOR, top, 1))

  let roofY = top
  if (roof === 'hip') {
    parts.add(m.whitePaint, place(moulding(w, d, [[0.08, 0.28], [0.26, 0.2], [0.5, 0.32]]), [0, top, cz]))
    parts.add(m.whitePaint, place(moulding(pav.w, pav.out, [[0.08, 0.28], [0.26, 0.2], [0.5, 0.32]], true), [0, top, pav.out / 2 - 0.05]))
    roofY = top + 0.7
    const roofH = d * 0.34
    parts.add(m.slate, place(hipRoof(w + 1.1, d + 1.1, roofH), [0, roofY, cz]))
    // Pediment over the pavilion with its own small gable roof.
    parts.add(m.whitePaint, place(triangularPrism(pav.w + 0.8, 2.6, 0.9), [0, roofY, pav.out + 0.1]))
    parts.add(m.slate, place(gableRoof(pav.w + 0.8, 3.6, 2.65, 0.25), [0, roofY + 0.02, pav.out - 1.6]))
    // Dormers on alternate bays, chimneys at the hips.
    const run = d / 2 + 0.55
    const dz = -2.2
    const dy = roofY + (roofH * (0.55 - dz)) / run
    const dormers: Transform[] = []
    for (const x of row(Math.floor((w - 4) / (BAY * 2)), BAY * 2)) {
      if (Math.abs(x) < pav.w / 2 + 1) continue
      parts.add(m.whitePaint, place(box(1.7, 2, 3.2), [x, dy + 0.7, dz - 1.6]))
      parts.add(m.slate, place(gableRoof(1.7, 3.5, 0.9, 0.2), [x, dy + 1.7, dz - 1.45]))
      parts.add(m.whitePaint, place(triangularPrism(2.1, 0.95, 0.16), [x, dy + 1.68, dz + 0.08]))
      dormers.push({ position: [x, dy + 0.1, dz] })
    }
    parts.addWindows(DORMER, dormers)
    for (const x of [-(w / 2 - d * 0.4), w / 2 - d * 0.4]) {
      parts.add(brickMat, place(box(1.4, 5.5, 0.9), [x, roofY + roofH - 1.8, cz - 2]))
      parts.add(m.stoneTrim, place(box(1.7, 0.25, 1.2), [x, roofY + roofH + 1.05, cz - 2]))
    }
  } else {
    // Flat roof behind a stone parapet with a balustraded centre.
    parts.add(m.limestone, place(moulding(w, d, [[0.05, 0.9], [0.3, 0.3], [0.45, 0.3]]), [0, top, cz]))
    parts.add(m.limestone, place(moulding(pav.w, pav.out, [[0.05, 0.9], [0.3, 0.3], [0.45, 0.3]], true), [0, top, pav.out / 2]))
    parts.add(m.limestone, place(box(w + 0.2, 0.9, d + 0.2), [0, top + 1.95, cz]))
    parts.add(m.lead, place(box(w - 1, 0.2, d - 1), [0, top + 1.6, cz]))
    parts.add(brickMat, place(box(w * 0.3, 3, d * 0.4), [0, top + 2.5, cz - d * 0.1]))
  }

  // Windows: bays across the front (pavilion bays sit forward), plus the ends.
  const ground: Transform[] = []
  const upper: Transform[] = []
  const topRow: Transform[] = []
  const doors: Transform[] = []
  const bays = Math.floor((w - 3) / BAY) | 1
  for (const x of row(bays, BAY)) {
    const z = Math.abs(x) < pav.w / 2 ? pav.out : 0
    if (Math.abs(x) < 0.5 && entrance === 'door') {
      doors.push({ position: [x, BASE - 0.05, z] })
      parts.add(m.doorWood, place(box(DOOR.width - 0.1, 2.8, 0.06), [x, BASE + 1.4, z + 0.04]))
    } else if (!(entrance === 'portico' && Math.abs(x) < pav.w / 2)) {
      ground.push({ position: [x, BASE + 0.7, z] })
    }
    for (let f = 1; f < floors; f++) {
      const list = f === floors - 1 && floors > 2 ? topRow : upper
      list.push({ position: [x, BASE + f * FLOOR + (list === topRow ? 0.9 : 0.7), z] })
    }
  }
  for (const side of [-1, 1]) {
    for (const zz of row(Math.floor((d - 3) / 3.6), 3.6)) {
      const t = { position: [side * (w / 2), 0, cz + zz] as [number, number, number], rotationY: side * (Math.PI / 2) }
      ground.push({ ...t, position: [t.position[0], BASE + 0.7, t.position[2]] })
      for (let f = 1; f < floors; f++) {
        const list = f === floors - 1 && floors > 2 ? topRow : upper
        list.push({ ...t, position: [t.position[0], BASE + f * FLOOR + (list === topRow ? 0.9 : 0.7), t.position[2]] })
      }
    }
  }
  parts.addWindows(GROUND, ground).addWindows(UPPER, upper).addWindows(TOP, topRow).addWindows(DOOR, doors)

  // Entrance
  if (entrance === 'door') {
    for (let i = 0; i < 3; i++) parts.add(m.stoneTrim, place(box(5 - i * 0.3, BASE - i * 0.3, 0.45), [0, (BASE - i * 0.3) / 2, pav.out + 0.22 + i * 0.45]))
    // Stone surround with a small segmental pediment over the door.
    parts.add(m.limestone, place(box(0.45, 4.2, 0.25), [-1.6, BASE + 2.1, pav.out + 0.12]))
    parts.add(m.limestone, place(box(0.45, 4.2, 0.25), [1.6, BASE + 2.1, pav.out + 0.12]))
    parts.add(m.stoneTrim, place(triangularPrism(4.4, 0.9, 0.5), [0, BASE + 4.45, pav.out + 0.25]))
    parts.add(m.stoneTrim, place(box(4.2, 0.25, 0.5), [0, BASE + 4.33, pav.out + 0.25]))
  } else {
    const colH = FLOOR * 2 - 0.6
    const colZ = pav.out + 3.2
    parts.add(m.limestone, place(box(pav.w + 1, BASE, 4.2), [0, BASE / 2, pav.out + 2.1]))
    for (let i = 0; i < 3; i++) parts.add(m.stoneTrim, place(box(pav.w - 2, BASE - (i + 1) * 0.3 + 0.001, 0.4), [0, (BASE - (i + 1) * 0.3) / 2, pav.out + 4.4 + i * 0.4]))
    for (const x of row(4, (pav.w - 2) / 3)) columns.push({ position: [x, BASE, colZ] })
    const entY = BASE + colH
    parts.add(m.limestone, place(box(pav.w + 0.4, 1.4, 4.3), [0, entY + 0.7, pav.out + 1.85]))
    parts.add(m.stoneTrim, place(box(pav.w + 1, 0.4, 4.8), [0, entY + 1.6, pav.out + 1.9]))
    parts.add(m.limestone, place(triangularPrism(pav.w + 0.6, 2.8, 4.4), [0, entY + 1.8, pav.out + 1.85]))
    for (const x of [-4.2, 0, 4.2].filter((x) => Math.abs(x) < pav.w / 2 - 1)) {
      doors.push({ position: [x, BASE - 0.05, pav.out] })
      parts.add(m.doorWood, place(box(DOOR.width - 0.1, 2.8, 0.06), [x, BASE + 1.4, pav.out + 0.04]))
    }
  }

  return { parts: parts.build(), windows: parts.windows, quoins, columns, colH: FLOOR * 2 - 0.6, top, roof, pav }
}

export function AcademicBuilding({ site }: { site: BuildingSite }) {
  const b = useMemo(() => buildAcademic(site), [site])
  const m = getMaterials()
  const quoin = useMemo(() => box(1, 1, 1), [])

  return (
    <group position={[site.position[0], 0, site.position[1]]} rotation={[0, site.rotation, 0]}>
      <Parts parts={b.parts} />
      {b.windows.map((w, i) => (
        <WindowSet key={i} spec={w.spec} placements={w.placements} />
      ))}
      <Instanced geometry={quoin} material={m.limestone} transforms={b.quoins} />
      {b.columns.length > 0 && (
        <IonicColumns height={b.colH} radius={0.45} shafts={[{ material: m.limestone, transforms: b.columns }]} trimMaterial={m.limestone} />
      )}
      {b.roof === 'flat' && (
        <Balustrade from={[-b.pav.w / 2, b.pav.out + 0.1]} to={[b.pav.w / 2, b.pav.out + 0.1]} y={b.top + 1.5} />
      )}
    </group>
  )
}

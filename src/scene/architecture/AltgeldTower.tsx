import { useMemo } from 'react'
import { ConeGeometry, Shape, ShapeGeometry } from 'three'
import { ALTGELD_TOWER } from '../../config/quadLayout'
import { getMaterials } from '../materials/materials'
import { box, hipRoof, moulding, place, row } from './geometry'
import { PartList, Parts } from './kit'
import type { Transform } from './parts/Instanced'
import { WindowSet } from './parts/WindowSet'
import type { WindowSpec } from './parts/windows'

const HALL_WINDOW: WindowSpec = { width: 1.6, height: 3, arched: true, cols: 2, rows: 3, head: 'none' }

/*
 * Altgeld Hall's Romanesque bell tower: rough sandstone shaft, arcaded belfry
 * and the steep red pyramid roof that peeks over the trees north-west of the
 * Quad in references 1 and 2. The hall itself is only suggested.
 */
const T = { w: 8.5, h: 29 }

function buildAltgeld() {
  const m = getMaterials()
  const parts = new PartList()
  parts.add(m.sandstone, place(box(T.w, T.h, T.w), [0, T.h / 2, 0]))
  parts.add(m.sandstone, place(moulding(T.w, T.w, [[0.25, 0.6], [0.45, 0.4]]), [0, T.h - 7.5, 0]))
  parts.add(m.sandstone, place(moulding(T.w, T.w, [[0.2, 0.4], [0.55, 0.5]]), [0, T.h, 0]))

  const arch = new Shape()
  arch.moveTo(-0.75, 0)
  arch.lineTo(0.75, 0)
  arch.lineTo(0.75, 3)
  arch.absarc(0, 3, 0.75, 0, Math.PI, false)
  arch.lineTo(-0.75, 0)
  const opening = new ShapeGeometry(arch, 10)
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2
    for (const x of row(3, 2.2)) {
      const px = Math.cos(a) * x + Math.sin(a) * (T.w / 2 + 0.02)
      const pz = -Math.sin(a) * x + Math.cos(a) * (T.w / 2 + 0.02)
      parts.add(m.lead, place(opening, [px, T.h - 6.5, pz], [0, a, 0]))
    }
  }
  // Steep pyramid roof with corner pinnacles.
  parts.add(m.redTile, place(new ConeGeometry((T.w / Math.SQRT2) * 1.12, 12, 4, 1), [0, T.h + 0.9 + 6, 0], [0, Math.PI / 4, 0]))
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    parts.add(m.sandstone, place(box(1.1, 2.2, 1.1), [x * (T.w / 2), T.h + 1.6, z * (T.w / 2)]))
    parts.add(m.redTile, place(new ConeGeometry(0.85, 2.4, 4), [x * (T.w / 2), T.h + 3.9, z * (T.w / 2)], [0, Math.PI / 4, 0]))
  }
  parts.add(m.ironBlack, place(box(0.12, 2.4, 0.12), [0, T.h + 14, 0]))

  // The hall: a long sandstone block with a red tile roof.
  parts.add(m.sandstone, place(box(44, 16, 22), [-24, 8, 6]))
  parts.add(m.redTile, place(hipRoof(45, 23, 7), [-24, 16, 6]))
  // Romanesque arched windows on the faces seen from the Quad (south and east).
  const windows: Transform[] = []
  for (const x of row(9, 4.6)) for (const y of [2, 8.5]) windows.push({ position: [-24 + x, y, 17.02] })
  for (const z of row(4, 4.6)) for (const y of [2, 8.5]) windows.push({ position: [-1.98, y, 6 + z], rotationY: Math.PI / 2 })
  return { parts: parts.build(), windows }
}

export function AltgeldTower() {
  const { parts, windows } = useMemo(buildAltgeld, [])
  return (
    <group position={[ALTGELD_TOWER[0], 0, ALTGELD_TOWER[1]]}>
      <Parts parts={parts} />
      <WindowSet spec={HALL_WINDOW} placements={windows} frameColor="stone" />
    </group>
  )
}

import { ExtrudeGeometry, Shape } from 'three'
import { FORECOURT, lengthOf, outline, pointAt, type OutlinePoint } from '../../config/foellingerForecourt'

/*
 * Three.js geometry for Foellinger's semicircular forecourt. The plan shape
 * and every parameter live in config/foellingerForecourt.ts; here each layer
 * — foundation, wall, coping, rails, bed — is the same D-shaped outline,
 * offset in or out and extruded between two heights.
 */

const Y = FORECOURT.height
const { inset, height: RAIL_H } = FORECOURT.rail

/** Closed D-shaped plan grown by `offset`, its straight back edge at `back`. */
function footprintShape(offset: number, back: number = FORECOURT.back) {
  const pts = outline(offset)
  const shape = new Shape()
  shape.moveTo(pts[0].x, back)
  for (const p of pts) shape.lineTo(p.x, Math.max(p.z, back))
  shape.lineTo(pts[pts.length - 1].x, back)
  shape.lineTo(pts[0].x, back)
  return shape
}

/** A band between two offsets of the outline (rails, the planted bed). */
function bandShape(inner: number, outer: number, part: 'all' | 'curve') {
  const a = outline(outer, part)
  const b = outline(inner, part).reverse()
  const shape = new Shape()
  a.forEach((p, i) => (i ? shape.lineTo(p.x, p.z) : shape.moveTo(p.x, p.z)))
  for (const p of b) shape.lineTo(p.x, p.z)
  return shape
}

/** Extrudes a plan shape (x, z) vertically between two heights. UVs stay in metres. */
function extrudeUp(shape: Shape, bottom: number, top: number) {
  const g = new ExtrudeGeometry(shape, { depth: top - bottom, bevelEnabled: false, curveSegments: 1 })
  // Shape (x, y) → world (x, z); extrusion axis → downward y. Then lift into place.
  g.rotateX(Math.PI / 2)
  g.translate(0, top, 0)
  return g
}

/** Solid stonework: projecting foundation course, ashlar retaining wall, overhanging coping. */
export function createTerraceStone() {
  return {
    foundation: extrudeUp(footprintShape(0.2), 0, 0.3),
    wall: extrudeUp(footprintShape(0), 0.3, Y - 0.14),
    coping: extrudeUp(footprintShape(0.12, FORECOURT.back - 0.1), Y - 0.14, Y),
  }
}

/** Continuous curved rails following the curve: a base course and a two-step handrail with a nosing. */
export function createCurvedRails() {
  const c = -inset
  return [
    extrudeUp(bandShape(c - 0.2, c + 0.2, 'curve'), Y, Y + 0.14),
    extrudeUp(bandShape(c - 0.15, c + 0.15, 'curve'), Y + RAIL_H - 0.16, Y + RAIL_H - 0.1),
    extrudeUp(bandShape(c - 0.21, c + 0.21, 'curve'), Y + RAIL_H - 0.1, Y + RAIL_H),
  ]
}

/** Mulch bed hugging the curve. */
export const createBed = () => extrudeUp(bandShape(FORECOURT.bed.inner, FORECOURT.bed.outer, 'curve'), 0, 0.08)

export interface Placement {
  position: [number, number, number]
  rotationY: number
}

/** Rotation that turns a model's front (+z) to face along an outward normal. */
const facing = (p: OutlinePoint) => Math.atan2(p.nx, p.nz)

/**
 * Posts at even intervals along the curve (one at each end) and individual
 * balusters evenly spaced between each pair, all turned to face outward.
 * The curve itself is generated from angular coordinates (curvePoint(φ));
 * positions here are resampled by arc length so spacing stays even.
 */
export function balustradeLayout() {
  const path = outline(-inset, 'curve')
  const length = lengthOf(path)
  const bays = Math.max(1, Math.round(length / FORECOURT.rail.postSpacing))
  const bayLength = length / bays
  const at = (s: number, y: number): Placement => {
    const p = pointAt(path, s)
    return { position: [p.x, y, p.z], rotationY: facing(p) }
  }

  const posts: Placement[] = []
  const balusters: Placement[] = []
  const postWidth = 0.5
  for (let b = 0; b <= bays; b++) posts.push(at(b * bayLength, Y))
  const clear = bayLength - postWidth
  const count = Math.floor(clear / FORECOURT.rail.balusterSpacing)
  const step = clear / count
  for (let b = 0; b < bays; b++) {
    for (let i = 0; i < count; i++) balusters.push(at(b * bayLength + postWidth / 2 + step * (i + 0.5), Y + 0.14))
  }
  return { posts, balusters }
}

/** Points along the middle of the planted bed at a given offset, for scattering plants. */
export function bedRow(offset: number) {
  const path = outline(offset, 'curve')
  return { length: lengthOf(path), at: (s: number) => pointAt(path, s) }
}

/** Bed outline as a polygon in local (x, z), used to keep lawn blades out of the mulch. */
export function bedPolygon(): [number, number][] {
  const outer = outline(FORECOURT.bed.outer, 'curve', 60).map((p): [number, number] => [p.x, p.z])
  const inner = outline(0, 'curve', 60).map((p): [number, number] => [p.x, p.z]).reverse()
  return [...outer, ...inner]
}

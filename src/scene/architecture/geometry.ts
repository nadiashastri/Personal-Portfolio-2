import {
  BoxGeometry,
  CylinderGeometry,
  BufferAttribute,
  BufferGeometry,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Geometry helpers for the procedural architecture kit. All UVs are in metres
 * so tiling textures (brick, stone, slate) keep their real-world scale on any
 * size of wall.
 */

/** Box with UVs in metres on every face. */
export function box(w: number, h: number, d: number) {
  const g = new BoxGeometry(w, h, d)
  const uv = g.attributes.uv as BufferAttribute
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z; 4 vertices each.
  const faceSize: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  faceSize.forEach(([fu, fv], face) => {
    for (let i = 0; i < 4; i++) {
      const idx = face * 4 + i
      uv.setXY(idx, uv.getX(idx) * fu, uv.getY(idx) * fv)
    }
  })
  return g
}

type V3 = readonly [number, number, number]

/** Returns a transformed copy of a geometry (position, Euler rotation, scale). */
export function place(geometry: BufferGeometry, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) {
  const m = new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromEuler(new Euler(...rotation)),
    new Vector3(...scale),
  )
  return geometry.clone().applyMatrix4(m)
}

/** Merges geometries after normalising attributes (drops anything not shared by all). */
export function merge(geometries: BufferGeometry[]) {
  const prepared = geometries.map((g) => (g.index ? g.toNonIndexed() : g))
  const names = ['position', 'normal', 'uv'] as const
  for (const g of prepared) {
    for (const name of Object.keys(g.attributes)) if (!names.includes(name as never)) g.deleteAttribute(name)
    if (!g.attributes.uv) g.setAttribute('uv', new BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2))
  }
  const merged = mergeGeometries(prepared, false)
  if (!merged) throw new Error('merge: incompatible geometries')
  return merged
}

/** Builds a non-indexed geometry from triangles, with flat normals and the given UVs. */
function fromTriangles(positions: number[], uvs: number[]) {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  g.computeVertexNormals()
  return g
}

/**
 * Hip roof over a w × d rectangle (centred on the origin, eaves at y = 0),
 * rising to `height`. The ridge runs along the longer side. UVs: u along the
 * eave, v up the slope, both in metres.
 */
export function hipRoof(w: number, d: number, height: number) {
  const along = w >= d
  const L = along ? w : d
  const S = along ? d : w
  const ridgeHalf = Math.max((L - S) / 2, 0.01)
  const hx = L / 2
  const hz = S / 2
  const slopeLong = Math.hypot(hz, height)
  const slopeEnd = Math.hypot(hx - ridgeHalf, height)

  const pos: number[] = []
  const uv: number[] = []
  const tri = (a: V3, b: V3, c: V3, ua: [number, number], ub: [number, number], uc: [number, number]) => {
    pos.push(...a, ...b, ...c)
    uv.push(...ua, ...ub, ...uc)
  }
  // Coordinates in "long axis = X" space; rotated afterwards if needed.
  const A: V3 = [-hx, 0, hz]
  const B: V3 = [hx, 0, hz]
  const C: V3 = [hx, 0, -hz]
  const D: V3 = [-hx, 0, -hz]
  const R1: V3 = [-ridgeHalf, height, 0]
  const R2: V3 = [ridgeHalf, height, 0]

  // Front slope (+z) and back slope (-z): trapezoids.
  tri(A, B, R2, [0, 0], [L, 0], [hx + ridgeHalf, slopeLong])
  tri(A, R2, R1, [0, 0], [hx + ridgeHalf, slopeLong], [hx - ridgeHalf, slopeLong])
  tri(C, D, R1, [0, 0], [L, 0], [hx + ridgeHalf, slopeLong])
  tri(C, R1, R2, [0, 0], [hx + ridgeHalf, slopeLong], [hx - ridgeHalf, slopeLong])
  // Hip ends: triangles.
  tri(B, C, R2, [0, 0], [S, 0], [hz, slopeEnd])
  tri(D, A, R1, [0, 0], [S, 0], [hz, slopeEnd])

  const g = fromTriangles(pos, uv)
  if (!along) g.rotateY(Math.PI / 2)
  return g
}

/**
 * Gable roof: ridge along Z (front-to-back), so the gable triangle faces +Z.
 * Used for dormers and porches.
 */
export function gableRoof(w: number, d: number, height: number, overhang = 0.15) {
  const hw = w / 2 + overhang
  const hd = d / 2
  const slope = Math.hypot(hw, height)
  const pos: number[] = []
  const uv: number[] = []
  const quad = (a: V3, b: V3, c: V3, e: V3, ua: number[], ub: number[], uc: number[], ue: number[]) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...e)
    uv.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ue)
  }
  // Left and right slopes.
  quad([-hw, 0, hd], [0, height, hd], [0, height, -hd], [-hw, 0, -hd], [0, 0], [0, slope], [d, slope], [d, 0])
  quad([hw, 0, -hd], [0, height, -hd], [0, height, hd], [hw, 0, hd], [0, 0], [0, slope], [d, slope], [d, 0])
  return fromTriangles(pos, uv)
}

/** Solid triangular prism (pediment / gable end): base width w, height h, depth d, front face at +z. */
export function triangularPrism(w: number, h: number, d: number) {
  const hw = w / 2
  const hd = d / 2
  const f: V3[] = [[-hw, 0, hd], [hw, 0, hd], [0, h, hd]]
  const b: V3[] = [[-hw, 0, -hd], [hw, 0, -hd], [0, h, -hd]]
  const pos: number[] = []
  const uv: number[] = []
  const push = (verts: V3[], uvs: number[][]) => verts.forEach((v, i) => (pos.push(...v), uv.push(...uvs[i])))
  push([f[0], f[1], f[2]], [[0, 0], [w, 0], [hw, h]])
  push([b[1], b[0], b[2]], [[0, 0], [w, 0], [hw, h]])
  const slope = Math.hypot(hw, h)
  push([f[1], b[1], b[2], f[1], b[2], f[2]], [[0, 0], [d, 0], [d, slope], [0, 0], [d, slope], [0, slope]])
  push([b[0], f[0], f[2], b[0], f[2], b[2]], [[0, 0], [d, 0], [d, slope], [0, 0], [d, slope], [0, slope]])
  push([f[0], b[0], b[1], f[0], b[1], f[1]], [[0, 0], [0, d], [w, d], [0, 0], [w, d], [w, 0]])
  return fromTriangles(pos, uv)
}

/**
 * Stepped moulding that wraps a w × d rectangle — cornices, belt courses and
 * water tables. Each step is [outset, height]; steps stack upwards from y = 0.
 */
export function moulding(w: number, d: number, steps: readonly (readonly [number, number])[], open = false) {
  const parts: BufferGeometry[] = []
  let y = 0
  for (const [out, h] of steps) {
    // `open` mouldings only run along the front face (e.g. a portico frieze).
    parts.push(open ? place(box(w + out * 2, h, out * 2 + 0.02), [0, y + h / 2, d / 2]) : place(box(w + out * 2, h, d + out * 2), [0, y + h / 2, 0]))
    y += h
  }
  return merge(parts)
}

/** Positions for a row of `count` items centred on 0 with the given spacing. */
export function row(count: number, spacing: number) {
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * spacing)
}

/** Cylinder with UVs in metres (u around the circumference, v up). */
export function cylinder(radiusTop: number, radiusBottom: number, height: number, segments: number, openEnded = false) {
  const g = new CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, openEnded)
  const uv = g.attributes.uv as BufferAttribute
  const circumference = Math.PI * (radiusTop + radiusBottom)
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circumference, uv.getY(i) * height)
  return g
}

/** Quoins: alternating long/short stone blocks up a building corner. Returns box transforms. */
export function quoinTransforms(x: number, z: number, fromY: number, toY: number, faceSign: 1 | -1, courseH = 0.46) {
  const out: { position: [number, number, number]; scale: [number, number, number] }[] = []
  let i = 0
  for (let y = fromY + courseH / 2; y < toY - courseH / 4; y += courseH, i++) {
    const long = i % 2 === 0
    const len = long ? 1.0 : 0.6
    out.push({ position: [x - faceSign * (len / 2 - 0.02), y, z + 0.04], scale: [len, courseH - 0.05, 0.12] })
  }
  return out
}

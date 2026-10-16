import { PlaneGeometry, Shape, ShapeGeometry, type BufferGeometry } from 'three'
import { box, merge, place } from '../geometry'

export interface WindowSpec {
  width: number
  height: number
  /** Semicircular head (ground-floor windows and doors on Georgian buildings). */
  arched?: boolean
  /** Panes across and down (e.g. 3 × 4 per sash on a 12-over-12 window). */
  cols: number
  rows: number
  /** Stone head above the window. */
  head?: 'flat' | 'keystone' | 'none'
}

export interface WindowGeometries {
  glass: BufferGeometry
  frame: BufferGeometry
  stone: BufferGeometry | null
}

const FRAME = 0.09
const MUNTIN = 0.035

/** Ring of short boxes approximating an arc (frames, voussoirs). */
function arc(radius: number, thickness: number, depth: number, z: number, centreY: number, segments: number) {
  const parts: BufferGeometry[] = []
  for (let i = 0; i < segments; i++) {
    const a = ((i + 0.5) / segments) * Math.PI
    const len = (Math.PI * radius) / segments + 0.02
    parts.push(place(box(len, thickness, depth), [Math.cos(a) * radius, centreY + Math.sin(a) * radius, z], [0, 0, a - Math.PI / 2]))
  }
  return parts
}

/**
 * Builds a window in local space: bottom-centre of the opening at the origin,
 * facing +Z, wall face at z = 0. Frames and stone trim stand proud of the wall
 * so they catch light and cast small shadows, which reads as depth.
 */
export function createWindowGeometries(spec: WindowSpec): WindowGeometries {
  const { width: w, height: h, arched = false, cols, rows, head = 'flat' } = spec
  const r = w / 2
  const rectH = arched ? h - r : h

  // Glass
  let glass: BufferGeometry
  if (arched) {
    const shape = new Shape()
    shape.moveTo(-r, 0)
    shape.lineTo(r, 0)
    shape.lineTo(r, rectH)
    shape.absarc(0, rectH, r, 0, Math.PI, false)
    shape.lineTo(-r, 0)
    glass = place(new ShapeGeometry(shape, 16), [0, 0, 0.02])
  } else {
    glass = place(new PlaneGeometry(w, h), [0, h / 2, 0.02])
  }

  // Painted frame + muntins
  const frame: BufferGeometry[] = [
    place(box(w + FRAME, FRAME, 0.12), [0, 0, 0.06]),
    place(box(FRAME, rectH, 0.12), [-r, rectH / 2, 0.06]),
    place(box(FRAME, rectH, 0.12), [r, rectH / 2, 0.06]),
  ]
  if (arched) frame.push(...arc(r, FRAME, 0.12, 0.06, rectH, 14))
  else frame.push(place(box(w + FRAME, FRAME, 0.12), [0, h, 0.06]))

  for (let c = 1; c < cols; c++) {
    frame.push(place(box(MUNTIN, rectH, 0.06), [-r + (w * c) / cols, rectH / 2, 0.05]))
  }
  for (let i = 1; i < rows; i++) {
    const meeting = i === rows / 2
    frame.push(place(box(w, meeting ? MUNTIN * 2 : MUNTIN, 0.06), [0, (rectH * i) / rows, 0.05]))
  }
  if (arched) {
    // Fanlight: transom bar plus radiating glazing bars.
    frame.push(place(box(w, MUNTIN * 1.6, 0.07), [0, rectH, 0.05]))
    for (const a of [Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
      frame.push(place(box(MUNTIN, r, 0.06), [Math.cos(a) * r * 0.5, rectH + Math.sin(a) * r * 0.5, 0.05], [0, 0, a - Math.PI / 2]))
    }
  }

  // Stone sill and head
  const stone: BufferGeometry[] = []
  stone.push(place(box(w + 0.32, 0.12, 0.24), [0, -0.06, 0.1]))
  if (head !== 'none') {
    if (arched) {
      stone.push(...arc(r + 0.2, 0.32, 0.1, 0.05, rectH, 9))
      if (head === 'keystone') stone.push(place(box(0.32, 0.5, 0.16), [0, h + 0.2, 0.08]))
    } else {
      stone.push(place(box(w + 0.42, 0.3, 0.1), [0, h + 0.2, 0.05]))
      if (head === 'keystone') stone.push(place(box(0.3, 0.44, 0.15), [0, h + 0.22, 0.08]))
    }
  }

  return { glass, frame: merge(frame), stone: stone.length ? merge(stone) : null }
}

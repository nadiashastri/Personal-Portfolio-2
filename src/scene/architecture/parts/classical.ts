import { CylinderGeometry, LatheGeometry, Vector2, type BufferGeometry } from 'three'
import { box, merge, place } from '../geometry'

/**
 * Fluted Ionic column, base at y = 0. Proportions follow the classical
 * order loosely: plinth, torus base, tapered fluted shaft, scrolled capital.
 */
export function createIonicColumn(height: number, radius: number): BufferGeometry {
  const { shaft, trim } = createIonicColumnParts(height, radius)
  return merge([shaft, trim])
}

/**
 * The same column split into its shaft and its stone trim (plinth, base,
 * capital), so shafts can be painted — e.g. Foellinger's orange and blue.
 */
/** The Blender capital (public/models/ionic_capital.glb) is modelled for a shaft of top radius 1. */
export const CAPITAL_MODEL_HEIGHT = 0.83

export function createIonicColumnParts(height: number, radius: number, fluted = true) {
  const plinthH = radius * 0.5
  const baseH = radius * 0.55
  const capitalH = radius * 0.9
  const shaftH = height - plinthH - baseH - capitalH

  // Shaft: 24 concave flutes carved by pulling vertices inward, with gentle taper.
  const shaft = new CylinderGeometry(radius * 0.86, radius, shaftH, 72, 6, true)
  const pos = shaft.attributes.position
  for (let i = 0; i < pos.count && fluted; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const a = Math.atan2(z, x)
    const flute = 1 - 0.045 * Math.pow(Math.abs(Math.cos(a * 12)), 0.6)
    pos.setXYZ(i, x * flute, pos.getY(i), z * flute)
  }
  shaft.computeVertexNormals()

  const parts: BufferGeometry[] = [
    place(box(radius * 2.7, plinthH, radius * 2.7), [0, plinthH / 2, 0]),
    // Attic base: torus – scotia – torus, approximated with a lathe profile.
    place(
      new LatheGeometry(
        [
          new Vector2(radius * 1.3, 0),
          new Vector2(radius * 1.32, baseH * 0.2),
          new Vector2(radius * 1.2, baseH * 0.42),
          new Vector2(radius * 1.08, baseH * 0.55),
          new Vector2(radius * 1.16, baseH * 0.75),
          new Vector2(radius * 1.05, baseH),
          new Vector2(radius, baseH),
        ],
        32,
      ),
      [0, plinthH, 0],
    ),
  ]
  const shaftPart = place(shaft, [0, plinthH + baseH + shaftH / 2, 0])

  const base = merge(parts)
  // Procedural capital (fallback until the Blender model loads): astragal ring, echinus, volutes, abacus.
  const capY = plinthH + baseH + shaftH
  parts.push(place(new CylinderGeometry(radius * 0.95, radius * 0.9, capitalH * 0.18, 32), [0, capY + capitalH * 0.09, 0]))
  parts.push(place(new CylinderGeometry(radius * 1.15, radius * 0.95, capitalH * 0.32, 32), [0, capY + capitalH * 0.34, 0]))
  for (const side of [-1, 1]) {
    parts.push(
      place(new CylinderGeometry(radius * 0.36, radius * 0.36, radius * 2.3, 20), [side * radius * 1.12, capY + capitalH * 0.48, 0], [Math.PI / 2, 0, 0]),
    )
  }
  parts.push(place(box(radius * 2.7, capitalH * 0.16, radius * 2.7), [0, capY + capitalH * 0.6 + capitalH * 0.08, 0]))
  parts.push(place(box(radius * 2.5, capitalH * 0.24, radius * 2.5), [0, capY + capitalH * 0.88, 0]))
  return {
    shaft: merge([shaftPart]),
    /** Plinth, base and procedural capital together. */
    trim: merge(parts),
    /** Plinth and base only, for use with the modelled capital. */
    base,
    shaftRadius: radius * 0.93,
    shaftBottom: plinthH + baseH,
    /** Where a modelled capital sits, and its uniform scale (= shaft top radius). */
    capitalY: capY,
    capitalScale: (capitalH / CAPITAL_MODEL_HEIGHT) * 0.98,
  }
}

/** Turned stone baluster, base at y = 0. */
export function createBaluster(height: number): BufferGeometry {
  const h = height
  const profile = [
    [0.09, 0], [0.09, 0.08], [0.06, 0.12], [0.07, 0.2], [0.1, 0.38], [0.085, 0.55], [0.05, 0.72],
    [0.06, 0.8], [0.085, 0.86], [0.085, 0.92], [0.06, 1],
  ].map(([r, y]) => new Vector2(r * (h / 0.75), y * h))
  return new LatheGeometry(profile, 12)
}

/** Dentil block, sized for cornices. */
export const createDentil = () => box(0.12, 0.16, 0.14)

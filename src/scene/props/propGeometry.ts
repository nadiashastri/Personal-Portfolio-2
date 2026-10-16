import { ConeGeometry, CylinderGeometry, LatheGeometry, SphereGeometry, Vector2 } from 'three'
import { box, merge, place } from '../architecture/geometry'

/**
 * Campus lamppost (reference 10): tall slender black post with a hexagonal
 * lantern head under a pointed cap. Returns iron + glass parts.
 */
export function createLamppost() {
  const iron = merge([
    new LatheGeometry(
      [[0.17, 0], [0.17, 0.1], [0.12, 0.18], [0.12, 0.4], [0.08, 0.5], [0.06, 0.6]].map(([r, y]) => new Vector2(r, y)),
      12,
    ),
    place(new CylinderGeometry(0.045, 0.06, 3.3, 10), [0, 2.25, 0]),
    // Collar and lantern base
    place(new CylinderGeometry(0.1, 0.06, 0.2, 6), [0, 4, 0]),
    place(new CylinderGeometry(0.15, 0.13, 0.05, 6), [0, 4.12, 0]),
    // Corner frames of the lantern
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2
      return place(box(0.025, 0.5, 0.025), [Math.cos(a) * 0.16, 4.39, Math.sin(a) * 0.16], [Math.sin(a) * -0.12, 0, Math.cos(a) * 0.12])
    }),
    // Pointed cap and finial
    place(new CylinderGeometry(0.24, 0.24, 0.04, 6), [0, 4.66, 0]),
    place(new ConeGeometry(0.24, 0.3, 6), [0, 4.83, 0]),
    place(new SphereGeometry(0.035, 8, 6), [0, 5.0, 0]),
  ])
  const glass = place(new CylinderGeometry(0.19, 0.13, 0.5, 6), [0, 4.39, 0])
  return { iron, glass }
}

/** Backless bench: a plain cast-concrete block with a slightly proud top slab. Front faces +Z. */
export function createBench() {
  return merge([place(box(1.8, 0.4, 0.5), [0, 0.2, 0]), place(box(1.86, 0.06, 0.56), [0, 0.43, 0])])
}

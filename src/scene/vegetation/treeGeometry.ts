import { BufferAttribute, BufferGeometry, ConeGeometry, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { createRandom } from '../../lib/random'
import { cylinder, merge, place } from '../architecture/geometry'

export interface Blob {
  centre: readonly [number, number, number]
  radius: readonly [number, number, number]
}

export interface CanopySpec {
  blobs: readonly Blob[]
  cards: number
  cardSize: number
  seed: number
  /** Upright cards rooted at the ground, fanning out — for grasses rather than leafy crowns. */
  upright?: boolean
  /** Card texture: leaf clusters (default) or arching grass blades. */
  texture?: 'leaves' | 'blades'
}

/**
 * A canopy made of many alpha-tested leaf-cluster cards scattered through a
 * few ellipsoid "blobs". Every card's normal points away from the canopy
 * centre, so lighting treats the whole crown as one soft, rounded volume
 * (the painterly look of stylised games) rather than a pile of flat quads.
 * Vertex colours darken the underside and interior as cheap ambient occlusion.
 */
export function createCanopyGeometry({ blobs, cards, cardSize, seed, upright = false }: CanopySpec): BufferGeometry {
  const rand = createRandom(seed)
  const volumes = blobs.map((b) => b.radius[0] * b.radius[1] * b.radius[2])
  const total = volumes.reduce((a, b) => a + b, 0)
  const centroid = new Vector3()
  blobs.forEach((b, i) => centroid.addScaledVector(new Vector3(...b.centre), volumes[i] / total))
  const minY = Math.min(...blobs.map((b) => b.centre[1] - b.radius[1]))
  const maxY = Math.max(...blobs.map((b) => b.centre[1] + b.radius[1]))

  const positions = new Float32Array(cards * 4 * 3)
  const normals = new Float32Array(cards * 4 * 3)
  const colors = new Float32Array(cards * 4 * 3)
  const uvs = new Float32Array(cards * 4 * 2)
  const indices: number[] = []

  const q = new Quaternion()
  const e = new Euler()
  const corner = new Vector3()
  const p = new Vector3()
  const n = new Vector3()
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]

  for (let c = 0; c < cards; c++) {
    // Pick a blob weighted by volume.
    let pick = rand() * total
    let blob = blobs[0]
    for (let i = 0; i < blobs.length; i++) {
      pick -= volumes[i]
      if (pick <= 0) {
        blob = blobs[i]
        break
      }
    }
    // Random direction, biased towards the surface so the crown stays full.
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)
    const depth = 0.5 + 0.5 * Math.sqrt(rand())
    p.set(
      blob.centre[0] + Math.sin(phi) * Math.cos(theta) * blob.radius[0] * depth,
      blob.centre[1] + Math.cos(phi) * blob.radius[1] * depth,
      blob.centre[2] + Math.sin(phi) * Math.sin(theta) * blob.radius[2] * depth,
    )
    n.copy(p).sub(centroid).normalize()
    n.y += 0.25
    n.normalize()

    const height = (p.y - minY) / (maxY - minY)
    const shade = 0.58 + 0.42 * Math.min(1, 0.55 * height + 0.45 * depth + (rand() - 0.5) * 0.15)
    const hueJitter = 1 + (rand() - 0.5) * 0.14

    if (upright) {
      // Rooted at the ground, leaning slightly outward, random heading.
      p.y = 0
      q.setFromEuler(e.set((rand() - 0.5) * 0.5, rand() * Math.PI * 2, (rand() - 0.5) * 0.3, 'YXZ'))
    } else {
      q.setFromEuler(e.set(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI))
    }
    const size = cardSize * (0.75 + rand() * 0.5)
    corners.forEach(([cx, cy], k) => {
      corner.set(cx * size, (upright ? cy + 0.5 : cy) * size, 0).applyQuaternion(q).add(p)
      const v = c * 4 + k
      positions.set([corner.x, corner.y, corner.z], v * 3)
      normals.set([n.x, n.y, n.z], v * 3)
      colors.set([shade, shade * hueJitter, shade], v * 3)
      uvs.set([cx + 0.5, cy + 0.5], v * 2)
    })
    const b = c * 4
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(positions, 3))
  g.setAttribute('normal', new BufferAttribute(normals, 3))
  g.setAttribute('color', new BufferAttribute(colors, 3))
  g.setAttribute('uv', new BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeBoundingSphere()
  return g
}

export interface TrunkSpec {
  height: number
  radius: number
  /** Main limbs reaching into the crown: [yaw, pitch-from-vertical, length]. */
  limbs: readonly (readonly [number, number, number])[]
  lean?: number
}

/** Tapered trunk with a root flare and a few main limbs, UV'd for the bark texture. */
export function createTrunkGeometry({ height, radius, limbs, lean = 0 }: TrunkSpec): BufferGeometry {
  const parts: BufferGeometry[] = []
  parts.push(place(cylinder(radius * 0.7, radius, height, 10, true), [0, height / 2, 0], [lean, 0, 0]))
  parts.push(place(new ConeGeometry(radius * 1.7, radius * 2.2, 10, 1, true), [0, radius * 1.1 - 0.15, 0]))
  const top = new Vector3(0, height, 0).applyEuler(new Euler(lean, 0, 0))
  for (const [yaw, pitch, length] of limbs) {
    const dir = new Vector3(0, 1, 0).applyEuler(new Euler(pitch, yaw, 0, 'YXZ'))
    const mid = top.clone().addScaledVector(dir, length / 2).addScaledVector(new Vector3(0, -1, 0), length * 0.15)
    // lookAt(eye = dir, target = origin) points local +Z along dir, so the thin end reaches outward.
    const m = new Matrix4().lookAt(dir, new Vector3(), new Vector3(0, 0, 1))
    const rot = new Euler().setFromRotationMatrix(m)
    const limb = cylinder(radius * 0.25, radius * 0.5, length, 7, true)
    limb.rotateX(Math.PI / 2)
    parts.push(place(limb, [mid.x, mid.y, mid.z], [rot.x, rot.y, rot.z]))
  }
  return merge(parts)
}

import type { CanopySpec, TrunkSpec } from './treeGeometry'

/**
 * Tree archetypes found around the Quad. Each becomes two instanced meshes
 * (trunks + leaves), so ~100 trees cost 8 draw calls.
 */
export interface TreeType {
  trunk: TrunkSpec
  canopy: CanopySpec
  /** Canopy radius at scale 1, used for ground shade and spacing. */
  spread: number
  /** Shrubs and flowers have no visible trunk. */
  noTrunk?: boolean
}

export const TREE_TYPES = {
  /** American elm: tall clear trunk, vase-shaped, broad flat-topped crown. */
  elm: {
    trunk: { height: 6.5, radius: 0.42, limbs: [[0, 0.55, 5], [2.1, 0.6, 5], [4.2, 0.5, 5.5], [1, 0.3, 4]] },
    canopy: {
      blobs: [
        { centre: [0, 11.5, 0], radius: [6.5, 3.4, 6.5] },
        { centre: [3.5, 10, 1.5], radius: [3.8, 3, 3.8] },
        { centre: [-3.2, 10.4, -1.8], radius: [3.8, 3, 3.8] },
        { centre: [-1, 13.6, 2], radius: [3.6, 2.4, 3.6] },
        { centre: [1.6, 9.2, -3.4], radius: [3, 2.4, 3] },
      ],
      cards: 240,
      cardSize: 2.7,
      seed: 101,
    },
    spread: 7,
  },
  /** Oak: shorter trunk, dense rounded crown. */
  oak: {
    trunk: { height: 4.2, radius: 0.48, limbs: [[0.4, 0.75, 4.5], [2.5, 0.8, 4.5], [4.5, 0.7, 4], [1.5, 0.25, 3.5]], lean: 0.04 },
    canopy: {
      blobs: [
        { centre: [0, 8.6, 0], radius: [5.4, 4, 5.4] },
        { centre: [3.4, 7.4, -1], radius: [3.2, 2.8, 3.2] },
        { centre: [-3, 7.8, 1.6], radius: [3.2, 2.8, 3.2] },
        { centre: [0.6, 10.6, -1.2], radius: [3.4, 2.4, 3.4] },
      ],
      cards: 210,
      cardSize: 2.5,
      seed: 202,
    },
    spread: 5.8,
  },
  /** Maple: medium, oval crown. */
  maple: {
    trunk: { height: 3.6, radius: 0.32, limbs: [[0, 0.45, 3.5], [2.2, 0.5, 3.5], [4.3, 0.45, 3]] },
    canopy: {
      blobs: [
        { centre: [0, 7.6, 0], radius: [3.8, 4.2, 3.8] },
        { centre: [1.6, 6.2, 1], radius: [2.6, 2.6, 2.6] },
        { centre: [-1.4, 9, -0.8], radius: [2.6, 2.4, 2.6] },
      ],
      cards: 160,
      cardSize: 2.2,
      seed: 303,
    },
    spread: 4.2,
  },
  /** Young street tree. */
  young: {
    trunk: { height: 2.6, radius: 0.18, limbs: [[0, 0.4, 2], [2.5, 0.45, 2], [4.6, 0.4, 1.8]] },
    canopy: {
      blobs: [
        { centre: [0, 4.6, 0], radius: [2.2, 2.4, 2.2] },
        { centre: [0.6, 5.6, 0.4], radius: [1.5, 1.4, 1.5] },
      ],
      cards: 80,
      cardSize: 1.6,
      seed: 404,
    },
    spread: 2.4,
  },
  /** Foundation shrub along building bases (no trunk). */
  shrub: {
    trunk: { height: 0.3, radius: 0.08, limbs: [] },
    canopy: {
      blobs: [
        { centre: [0, 0.7, 0], radius: [1.1, 0.75, 0.9] },
        { centre: [0.6, 0.55, 0.2], radius: [0.7, 0.55, 0.6] },
      ],
      cards: 34,
      cardSize: 0.85,
      seed: 505,
    },
    spread: 1.1,
    noTrunk: true,
  },
  /** Tall ornamental grass clump (reference 12). */
  ornamentalGrass: {
    trunk: { height: 0.1, radius: 0.02, limbs: [] },
    canopy: {
      blobs: [{ centre: [0, 0, 0], radius: [0.16, 0.05, 0.16] }],
      cards: 10,
      cardSize: 1.45,
      seed: 707,
      upright: true,
      texture: 'blades',
    },
    spread: 0.4,
    noTrunk: true,
  },
  /** A clump of bedding flowers. */
  flowers: {
    trunk: { height: 0.1, radius: 0.02, limbs: [] },
    canopy: {
      blobs: [{ centre: [0, 0.32, 0], radius: [0.42, 0.22, 0.42] }],
      cards: 14,
      cardSize: 0.36,
      seed: 606,
    },
    spread: 0.4,
    noTrunk: true,
  },
} satisfies Record<string, TreeType>


export type TreeKind = keyof typeof TREE_TYPES

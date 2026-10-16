import { Color, DoubleSide, MeshStandardMaterial } from 'three'
import {
  createBarkTexture,
  createBrickTextures,
  createPatinaTexture,
  createSlateTextures,
  createStoneTextures,
  type BrickPalette,
} from './textures'

/**
 * Shared materials for all architecture and props. Created lazily once and
 * reused everywhere, so each material compiles a single shader program.
 */

const BRICK_PALETTES = {
  /** Classic campus red brick. */
  red: { bricks: ['#8f3d2b', '#9b4631', '#a34d35', '#883a2b', '#7f3528', '#a8553b'], mortar: '#c4b8a6' },
  /** Warmer orange-red, like the Illini Union. */
  warm: { bricks: ['#a5502f', '#b05a37', '#9a472c', '#b4633f', '#94432b', '#a9573a'], mortar: '#cdbfa9' },
  /** Deeper brown-red. */
  dark: { bricks: ['#7c3527', '#723024', '#86402d', '#6c2d22', '#80392a'], mortar: '#b9ad9b' },
} satisfies Record<string, BrickPalette>

export type BrickKind = keyof typeof BRICK_PALETTES

function brick(kind: BrickKind, seed: number) {
  const { map, bump } = createBrickTextures(BRICK_PALETTES[kind], seed)
  return new MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.4, roughness: 0.92 })
}

function createMaterials() {
  const limestone = createStoneTextures('#ddd3c1', 3)
  const sandstone = createStoneTextures('#b9a27f', 4)
  const slate = createSlateTextures(['#4a4d57', '#53555e', '#44464f', '#5a5a62', '#4d4f5a'])

  return {
    brick: {
      red: brick('red', 1),
      warm: brick('warm', 2),
      dark: brick('dark', 3),
    } satisfies Record<BrickKind, MeshStandardMaterial>,
    limestone: new MeshStandardMaterial({ map: limestone.map, bumpMap: limestone.bump, bumpScale: 0.8, roughness: 0.85 }),
    /** Rough tan sandstone (Altgeld Hall). */
    sandstone: new MeshStandardMaterial({ map: sandstone.map, bumpMap: sandstone.bump, bumpScale: 1.5, roughness: 0.95 }),
    /** Plain stone for small mouldings where ashlar joints would be too busy. */
    stoneTrim: new MeshStandardMaterial({ color: '#e3dac9', roughness: 0.8 }),
    whitePaint: new MeshStandardMaterial({ color: '#f1ede4', roughness: 0.55 }),
    slate: new MeshStandardMaterial({ map: slate.map, bumpMap: slate.bump, bumpScale: 1.2, roughness: 0.75, side: DoubleSide }),
    redTile: new MeshStandardMaterial({ color: '#b34a2e', map: slate.map, roughness: 0.8, side: DoubleSide }),
    copper: new MeshStandardMaterial({ map: createPatinaTexture(), roughness: 0.55, metalness: 0.25, side: DoubleSide }),
    /** Foellinger's painted columns: Illinois orange and blue. */
    paintOrange: new MeshStandardMaterial({ color: '#e0532b', roughness: 0.55 }),
    paintBlue: new MeshStandardMaterial({ color: '#23408e', roughness: 0.55 }),
    /** Foellinger's dome: weathered blue-grey standing-seam metal, with paler ribs. */
    domeMetal: new MeshStandardMaterial({ color: '#8399ae', roughness: 0.55, metalness: 0.15, side: DoubleSide }),
    domeRib: new MeshStandardMaterial({ color: '#c3cfd9', roughness: 0.5, metalness: 0.1 }),
    bronze: new MeshStandardMaterial({ color: '#5a4630', roughness: 0.5, metalness: 0.4 }),
    navy: new MeshStandardMaterial({ color: '#13294b', roughness: 0.5 }),
    /** Dark lead/zinc for small domes, flashing and caps. */
    lead: new MeshStandardMaterial({ color: '#3d4247', roughness: 0.5, metalness: 0.4 }),
    glass: new MeshStandardMaterial({ color: '#1d2a36', roughness: 0.08, metalness: 0.85, envMapIntensity: 1.2 }),
    doorWood: new MeshStandardMaterial({ color: '#2e3d33', roughness: 0.6 }),
    ironBlack: new MeshStandardMaterial({ color: '#1c1e20', roughness: 0.45, metalness: 0.6 }),
    concrete: new MeshStandardMaterial({ color: '#c9c3b7', roughness: 0.9 }),
    /** Warm, lightly textured limestone for Foellinger's terrace coping, rails and steps. */
    terraceCoping: new MeshStandardMaterial({ color: '#f3ede2', map: limestone.map, bumpMap: limestone.bump, bumpScale: 0.6, roughness: 0.9 }),
    /** Rough cast concrete for the backless Quad benches. */
    benchConcrete: new MeshStandardMaterial({ color: '#bdb4a3', map: limestone.map, bumpMap: limestone.bump, bumpScale: 2, roughness: 0.97 }),
    /** Frosted lamp globes, faintly glowing even by day. */
    lampGlass: new MeshStandardMaterial({ color: '#fbf4e4', emissive: '#ffd59a', emissiveIntensity: 0.35, roughness: 0.25 }),
    mulch: new MeshStandardMaterial({ color: '#4b3627', roughness: 1 }),
    clockFace: new MeshStandardMaterial({ color: '#f6f2e8', roughness: 0.4 }),
    bark: new MeshStandardMaterial({ map: createBarkTexture(), color: new Color('#cbbfb0'), roughness: 1 }),
  }
}

export type Materials = ReturnType<typeof createMaterials>

let cache: Materials | null = null

export function getMaterials(): Materials {
  cache ??= createMaterials()
  return cache
}

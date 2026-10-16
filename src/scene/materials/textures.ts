import {
  CanvasTexture,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three'
import { createRandom } from '../../lib/random'

/**
 * Procedural material textures painted on canvases at start-up — no image
 * downloads. Every texture tiles seamlessly and is mapped in metres: geometry
 * UVs are in metres, and `repeat` converts to the texture's real-world size.
 */

type Ctx = CanvasRenderingContext2D

function canvas(size: number, paint: (ctx: Ctx, size: number) => void) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  paint(c.getContext('2d')!, size)
  return c
}

function toTexture(c: HTMLCanvasElement, tileMetres: number, color = true): Texture {
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(1 / tileMetres, 1 / tileMetres)
  t.colorSpace = color ? SRGBColorSpace : NoColorSpace
  t.anisotropy = 8
  return t
}

/** Fine speckle to break up flat colour. */
function speckle(ctx: Ctx, size: number, seed: number, count: number, alpha: number) {
  const rand = createRandom(seed)
  for (let i = 0; i < count; i++) {
    const v = rand() < 0.5 ? 0 : 255
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rand()})`
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2)
  }
}

export interface BrickPalette {
  bricks: string[]
  mortar: string
}

/** Running-bond brick, 2 m tile: 9 bricks across, 30 courses. */
export function createBrickTextures(palette: BrickPalette, seed = 1) {
  const size = 512
  const cols = 9
  const rows = 30
  const bw = size / cols
  const bh = size / rows
  const mortar = 2.2
  const rand = createRandom(seed)
  const bricks: [number, number, number, number, string, number][] = []
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 ? bw / 2 : 0
    for (let c = -1; c < cols; c++) {
      const color = palette.bricks[Math.floor(rand() * palette.bricks.length)]
      bricks.push([c * bw + offset, r * bh, bw, bh, color, 0.75 + rand() * 0.25])
    }
  }

  const map = canvas(size, (ctx) => {
    ctx.fillStyle = palette.mortar
    ctx.fillRect(0, 0, size, size)
    for (const [x, y, w, h, color] of bricks) {
      ctx.fillStyle = color
      for (const ox of [0, size]) ctx.fillRect(x + mortar / 2 - ox, y + mortar / 2, w - mortar, h - mortar)
    }
    speckle(ctx, size, seed + 7, 9000, 0.12)
  })

  const bump = canvas(size, (ctx) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, size, size)
    for (const [x, y, w, h, , height] of bricks) {
      const v = Math.round(height * 255)
      ctx.fillStyle = `rgb(${v},${v},${v})`
      for (const ox of [0, size]) ctx.fillRect(x + mortar / 2 - ox, y + mortar / 2, w - mortar, h - mortar)
    }
    speckle(ctx, size, seed + 9, 5000, 0.2)
  })

  return { map: toTexture(map, 2), bump: toTexture(bump, 2, false) }
}

/** Dressed limestone ashlar: 1.2 × 0.6 m blocks, 2.4 m tile. */
export function createStoneTextures(base: string, seed = 3) {
  const size = 512
  const rows = 4
  const cols = 2
  const bh = size / rows
  const bw = size / cols
  const rand = createRandom(seed)
  const blocks: [number, number, number][] = []
  for (let r = 0; r < rows; r++) {
    for (let c = -1; c < cols; c++) blocks.push([c * bw + (r % 2 ? bw / 2 : 0), r * bh, 0.88 + rand() * 0.14])
  }

  const map = canvas(size, (ctx) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, size, size)
    for (const [x, y, shade] of blocks) {
      const v = shade > 0.95 ? 255 : 0
      ctx.fillStyle = `rgba(${v},${v},${v},${Math.abs(shade - 0.95) * 0.5})`
      ctx.fillRect(x, y, bw, bh)
    }
    speckle(ctx, size, seed, 14000, 0.1)
    ctx.strokeStyle = 'rgba(70,60,50,0.22)'
    ctx.lineWidth = 2
    for (const [x, y] of blocks) ctx.strokeRect(x + 1, y + 1, bw - 2, bh - 2)
  })

  const bump = canvas(size, (ctx) => {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, size, size)
    speckle(ctx, size, seed + 1, 8000, 0.25)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 3
    for (const [x, y] of blocks) ctx.strokeRect(x + 1, y + 1, bw - 2, bh - 2)
  })

  return { map: toTexture(map, 2.4), bump: toTexture(bump, 2.4, false) }
}

/** Slate shingles in staggered courses, 2 m tile. */
export function createSlateTextures(colors: string[], seed = 5) {
  const size = 512
  const rows = 8
  const cols = 7
  const rh = size / rows
  const cw = size / cols
  const rand = createRandom(seed)
  const tiles: [number, number, string, number][] = []
  for (let r = 0; r < rows; r++) {
    for (let c = -1; c < cols; c++) {
      tiles.push([c * cw + (r % 2 ? cw / 2 : 0), r * rh, colors[Math.floor(rand() * colors.length)], 0.6 + rand() * 0.4])
    }
  }

  const map = canvas(size, (ctx) => {
    ctx.fillStyle = '#1d1e22'
    ctx.fillRect(0, 0, size, size)
    for (const [x, y, color] of tiles) {
      ctx.fillStyle = color
      for (const ox of [0, size]) ctx.fillRect(x + 1.5 - ox, y + 1.5, cw - 3, rh - 2)
    }
    // Each course overlaps the one below: shade the lower edge of every row.
    for (let r = 0; r < rows; r++) {
      const g = ctx.createLinearGradient(0, r * rh + rh * 0.6, 0, (r + 1) * rh)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.35)')
      ctx.fillStyle = g
      ctx.fillRect(0, r * rh, size, rh)
    }
    speckle(ctx, size, seed, 6000, 0.12)
  })

  const bump = canvas(size, (ctx) => {
    for (let r = 0; r < rows; r++) {
      const g = ctx.createLinearGradient(0, r * rh, 0, (r + 1) * rh)
      g.addColorStop(0, '#333')
      g.addColorStop(1, '#fff')
      ctx.fillStyle = g
      ctx.fillRect(0, r * rh, size, rh)
    }
    ctx.fillStyle = '#000'
    for (const [x, y] of tiles) for (const ox of [0, size]) ctx.fillRect(x - ox, y, 2, rh)
  })

  return { map: toTexture(map, 2), bump: toTexture(bump, 2, false) }
}

/** Weathered copper patina with vertical rain streaks, 4 m tile. */
export function createPatinaTexture(seed = 8) {
  const size = 256
  const rand = createRandom(seed)
  return toTexture(
    canvas(size, (ctx) => {
      ctx.fillStyle = '#6fa79d'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 160; i++) {
        const x = rand() * size
        const w = 2 + rand() * 10
        ctx.fillStyle = rand() < 0.5 ? `rgba(40,90,90,${0.15 * rand()})` : `rgba(200,235,220,${0.18 * rand()})`
        ctx.fillRect(x, 0, w, size)
        ctx.fillRect(x - size, 0, w, size)
      }
      speckle(ctx, size, seed, 4000, 0.15)
    }),
    4,
  )
}

/** Bark: vertical fissures, 1 m tile. */
export function createBarkTexture(seed = 13) {
  const size = 256
  const rand = createRandom(seed)
  return toTexture(
    canvas(size, (ctx) => {
      ctx.fillStyle = '#6a5a4c'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 90; i++) {
        let x = rand() * size
        ctx.strokeStyle = rand() < 0.6 ? `rgba(30,22,16,${0.3 + rand() * 0.4})` : `rgba(160,145,125,${0.25 * rand()})`
        ctx.lineWidth = 1 + rand() * 4
        ctx.beginPath()
        ctx.moveTo(x, 0)
        for (let y = 0; y <= size; y += 16) {
          x += (rand() - 0.5) * 6
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }),
    1,
  )
}

/**
 * Leaf-cluster card: a dense, ragged clump of small leaves on transparent
 * background. Greyscale so instances can be tinted.
 */
export function createLeafClusterTexture(seed = 21) {
  const size = 256
  const rand = createRandom(seed)
  const c = canvas(size, (ctx) => {
    ctx.clearRect(0, 0, size, size)
    const cx = size / 2
    for (let i = 0; i < 230; i++) {
      // Denser towards the middle, ragged at the rim.
      const a = rand() * Math.PI * 2
      const r = Math.pow(rand(), 0.65) * size * 0.42
      const x = cx + Math.cos(a) * r
      const y = cx + Math.sin(a) * r
      const len = 9 + rand() * 11
      const v = Math.round(150 + rand() * 105 - (r / (size * 0.42)) * 40)
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rand() * Math.PI * 2)
      ctx.beginPath()
      ctx.ellipse(0, 0, len, len * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  })
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

/**
 * Ornamental-grass card: a fountain of thin blades rising from the bottom
 * centre and arching outward, lighter towards the tips. Greyscale, tinted per clump.
 */
export function createGrassClumpTexture(seed = 31) {
  const size = 256
  const rand = createRandom(seed)
  const c = canvas(size, (ctx) => {
    ctx.clearRect(0, 0, size, size)
    for (let i = 0; i < 70; i++) {
      const lean = (rand() - 0.5) * 2 // -1 … 1
      const height = size * (0.55 + rand() * 0.42)
      const baseX = size / 2 + (rand() - 0.5) * size * 0.12
      const tipX = baseX + lean * size * 0.42
      const tipY = size - height
      const ctrlX = baseX + lean * size * 0.08
      const ctrlY = size - height * 0.75
      const g = ctx.createLinearGradient(0, size, 0, tipY)
      const v = Math.round(150 + rand() * 60)
      g.addColorStop(0, `rgb(${v - 50},${v - 50},${v - 50})`)
      g.addColorStop(1, `rgb(${Math.min(255, v + 60)},${Math.min(255, v + 60)},${Math.min(255, v + 50)})`)
      ctx.strokeStyle = g
      ctx.lineCap = 'round'
      ctx.lineWidth = 2 + rand() * 2.5
      ctx.beginPath()
      ctx.moveTo(baseX, size)
      ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY)
      ctx.stroke()
    }
  })
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

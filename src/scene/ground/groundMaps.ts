import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
} from 'three'
import { PATHS, PLAZAS, type Vec2 } from '../../config/quadLayout'

/** World rectangle covered by the ground maps. */
export const GROUND_MAP_EXTENT = { minX: -110, maxX: 110, minZ: -190, maxZ: 190 } as const

const WIDTH_M = GROUND_MAP_EXTENT.maxX - GROUND_MAP_EXTENT.minX
const DEPTH_M = GROUND_MAP_EXTENT.maxZ - GROUND_MAP_EXTENT.minZ

function createCanvas(pxPerMetre: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(WIDTH_M * pxPerMetre)
  canvas.height = Math.round(DEPTH_M * pxPerMetre)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // Draw in metres: world (x, z) → canvas pixels.
  ctx.setTransform(pxPerMetre, 0, 0, pxPerMetre, -GROUND_MAP_EXTENT.minX * pxPerMetre, -GROUND_MAP_EXTENT.minZ * pxPerMetre)
  return { canvas, ctx }
}

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = NoColorSpace
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.anisotropy = 8
  // Canvas Y grows with world +Z, so keep the image as-is.
  texture.flipY = false
  return texture
}

function strokeSegment(ctx: CanvasRenderingContext2D, from: Vec2, to: Vec2) {
  ctx.beginPath()
  ctx.moveTo(from[0], from[1])
  ctx.lineTo(to[0], to[1])
  ctx.stroke()
}

/**
 * Paving mask at 8 px/m.
 *  R = paved coverage, G = plaza pavers, B = walk direction (angle / π),
 *  used by the ground shader to lay concrete joints across each walk.
 */
export function createPavingMap(extraPaved: readonly (readonly Vec2[])[] = []) {
  const { canvas, ctx } = createCanvas(8)
  ctx.lineCap = 'round'
  for (const { from, to, width } of PATHS) {
    let angle = Math.atan2(to[1] - from[1], to[0] - from[0])
    if (angle < 0) angle += Math.PI
    ctx.strokeStyle = `rgb(255, 0, ${Math.round((angle / Math.PI) * 255)})`
    ctx.lineWidth = width
    strokeSegment(ctx, from, to)
  }
  ctx.fillStyle = 'rgb(255, 255, 0)'
  for (const [minX, minZ, maxX, maxZ] of PLAZAS) ctx.fillRect(minX, minZ, maxX - minX, maxZ - minZ)
  // Planted beds etc.: marked "paved" so no lawn blades grow there (they're covered anyway).
  ctx.fillStyle = 'rgb(255, 0, 0)'
  for (const poly of extraPaved) {
    ctx.beginPath()
    poly.forEach(([x, z], i) => (i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)))
    ctx.fill()
  }
  return toTexture(canvas)
}

export interface ShadeSpot {
  position: Vec2
  radius: number
  strength: number
}

/**
 * Low-res detail map at 2 px/m.
 *  R = soft ambient shade (under tree canopies, along facades),
 *  G = worn grass along walk edges.
 */
export function createDetailMap(shadeSpots: readonly ShadeSpot[]) {
  const { canvas, ctx } = createCanvas(2)
  ctx.globalCompositeOperation = 'lighter'

  // Worn edges: a few widening, faint strokes approximate a blur.
  ctx.lineCap = 'round'
  for (const { from, to, width } of PATHS) {
    for (const [extra, alpha] of [[0.5, 0.35], [1.2, 0.2], [2.2, 0.1]] as const) {
      ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`
      ctx.lineWidth = width + extra
      strokeSegment(ctx, from, to)
    }
  }

  for (const { position: [x, z], radius, strength } of shadeSpots) {
    const g = ctx.createRadialGradient(x, z, 0, x, z, radius)
    g.addColorStop(0, `rgba(255, 0, 0, ${strength})`)
    g.addColorStop(0.6, `rgba(255, 0, 0, ${strength * 0.6})`)
    g.addColorStop(1, 'rgba(255, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x - radius, z - radius, radius * 2, radius * 2)
  }
  return toTexture(canvas)
}

/** GLSL: world XZ → ground-map UV. */
export const GROUND_UV_GLSL = /* glsl */ `
  vec2 groundUv(vec2 p) {
    return (p - vec2(${GROUND_MAP_EXTENT.minX.toFixed(1)}, ${GROUND_MAP_EXTENT.minZ.toFixed(1)})) /
      vec2(${WIDTH_M.toFixed(1)}, ${DEPTH_M.toFixed(1)});
  }
`

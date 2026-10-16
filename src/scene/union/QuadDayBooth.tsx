import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type BufferAttribute,
  type Mesh,
} from 'three'
import type { BoothPlacement } from '../../config/quadDay'
import type { Organization } from '../../content/involvement'
import { box, place } from '../architecture/geometry'
import { PartList, Parts } from '../architecture/kit'
import { getMaterials } from '../materials/materials'

/** Draws onto a canvas texture, repainting once web fonts have loaded. */
export function paintedTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  const draw = () => {
    ctx.clearRect(0, 0, width, height)
    paint(ctx, width, height)
    texture.needsUpdate = true
  }
  draw()
  document.fonts?.ready
    .then(() => document.fonts.load('64px "Lilita One"'))
    .then(draw)
    .catch(() => {})
  return texture
}

/** Fits text into a width by shrinking the font size. */
function fitText(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, maxWidth: number, start: number) {
  let px = start
  ctx.font = font(px)
  while (ctx.measureText(text).width > maxWidth && px > 10) {
    px -= 2
    ctx.font = font(px)
  }
  return px
}

const TENT = { half: 1.45, legHeight: 2.3, roofHeight: 0.75 }
const TABLE = { w: 2.0, d: 0.78, h: 0.74 }

/** Tent valance: the organisation's short name and full name. */
function valanceTexture(org: Organization) {
  return paintedTexture(1024, 112, (ctx, w, h) => {
    ctx.fillStyle = org.colors.primary
    ctx.fillRect(0, 0, w, h)
    // Scalloped lower edge
    ctx.fillStyle = org.colors.secondary
    ctx.fillRect(0, h - 10, w, 10)
    ctx.fillStyle = org.colors.ink
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    const px = fitText(ctx, `${org.short}  ·  ${org.name.toUpperCase()}`, (p) => `${p}px "Lilita One", sans-serif`, w - 60, 54)
    ctx.font = `${px}px "Lilita One", sans-serif`
    ctx.fillText(`${org.short}  ·  ${org.name.toUpperCase()}`, w / 2, h / 2 - 4)
  })
}

/** Banner taped to the front of the tablecloth. */
function bannerTexture(org: Organization) {
  return paintedTexture(768, 288, (ctx, w, h) => {
    ctx.fillStyle = '#fbf6ee'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = org.colors.primary
    ctx.fillRect(14, 14, w - 28, h - 28)
    ctx.fillStyle = org.colors.secondary
    ctx.fillRect(14, h - 54, w - 28, 12)
    ctx.fillStyle = org.colors.ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '132px "Lilita One", sans-serif'
    ctx.fillText(org.short, w / 2, h / 2 - 26)
    ctx.font = '600 30px Figtree, sans-serif'
    fitText(ctx, 'JOIN US · QUAD DAY', (p) => `600 ${p}px Figtree, sans-serif`, w - 80, 30)
    ctx.fillText('JOIN US · QUAD DAY', w / 2, h - 82)
  })
}

function buildBooth(org: Organization, tint: { primary: MeshStandardMaterial; secondary: MeshStandardMaterial }) {
  const m = getMaterials()
  const parts = new PartList()
  const metal = m.ironBlack
  const white = m.whitePaint

  // Pop-up canopy: four legs, a pyramid roof, valance on three sides (front is textured separately).
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.add(metal, place(new CylinderGeometry(0.028, 0.032, TENT.legHeight, 8), [sx * TENT.half, TENT.legHeight / 2, sz * TENT.half]))
      parts.add(metal, place(new CylinderGeometry(0.07, 0.07, 0.03, 8), [sx * TENT.half, 0.015, sz * TENT.half]))
    }
  }
  const roof = new ConeGeometry(TENT.half * Math.SQRT2 + 0.05, TENT.roofHeight, 4, 1, true)
  parts.add(tint.primary, place(roof, [0, TENT.legHeight + TENT.roofHeight / 2, 0], [0, Math.PI / 4, 0]))
  for (const [x, z, ry] of [[0, -TENT.half, 0], [-TENT.half, 0, Math.PI / 2], [TENT.half, 0, Math.PI / 2]] as const) {
    parts.add(tint.primary, place(box(TENT.half * 2 + 0.04, 0.3, 0.02), [x, TENT.legHeight - 0.12, z], [0, ry, 0]))
  }

  // Folding table with a draped cloth.
  for (const sx of [-1, 1]) parts.add(metal, place(box(0.04, TABLE.h, TABLE.d - 0.1), [sx * (TABLE.w / 2 - 0.15), TABLE.h / 2, 0]))
  parts.add(tint.primary, place(box(TABLE.w + 0.06, 0.03, TABLE.d + 0.06), [0, TABLE.h + 0.015, 0]))
  for (const sx of [-1, 1]) parts.add(tint.primary, place(box(0.012, TABLE.h - 0.05, TABLE.d + 0.06), [sx * (TABLE.w / 2 + 0.03), (TABLE.h + 0.05) / 2, 0]))
  parts.add(tint.primary, place(box(TABLE.w + 0.06, TABLE.h - 0.05, 0.012), [0, (TABLE.h + 0.05) / 2, -TABLE.d / 2 - 0.03]))

  // Two folding chairs behind the table.
  for (const x of [-0.5, 0.5]) {
    const cz = -TABLE.d / 2 - 0.55
    parts.add(metal, place(box(0.42, 0.03, 0.4), [x, 0.45, cz]))
    parts.add(metal, place(box(0.42, 0.34, 0.03), [x, 0.78, cz - 0.2], [-0.08, 0, 0]))
    for (const sx of [-0.19, 0.19]) for (const sz of [-0.17, 0.17]) parts.add(metal, place(box(0.025, 0.45, 0.025), [x + sx, 0.225, cz + sz]))
  }

  // Signature prop on the table top.
  const top = TABLE.h + 0.03
  switch (org.prop) {
    case 'laptop':
      parts.add(m.ironBlack, place(box(0.36, 0.02, 0.25), [0.35, top + 0.01, 0.02]))
      parts.add(m.ironBlack, place(box(0.36, 0.24, 0.015), [0.35, top + 0.13, -0.11], [-0.25, 0, 0]))
      parts.add(tint.secondary, place(box(0.32, 0.2, 0.004), [0.35, top + 0.13, -0.1], [-0.25, 0, 0]))
      parts.add(white, place(box(0.2, 0.01, 0.28), [-0.45, top + 0.005, 0.05], [0, 0.2, 0]))
      parts.add(white, place(box(0.2, 0.01, 0.28), [-0.2, top + 0.005, 0.08], [0, -0.1, 0]))
      break
    case 'flyers':
      for (const [x, n, mat] of [[-0.55, 6, white], [-0.25, 4, tint.secondary], [0.05, 5, white]] as const) {
        for (let i = 0; i < n; i++) parts.add(mat, place(box(0.22, 0.008, 0.29), [x, top + 0.004 + i * 0.008, 0.05], [0, (i % 2 ? 0.04 : -0.03) + x * 0.2, 0]))
      }
      parts.add(white, place(new CylinderGeometry(0.13, 0.08, 0.1, 16, 1, true), [0.5, top + 0.05, 0.02]))
      parts.add(tint.primary, place(new CylinderGeometry(0.11, 0.11, 0.02, 16), [0.5, top + 0.07, 0.02]))
      break
    case 'trifold': {
      const h = 0.6
      parts.add(white, place(box(0.5, h, 0.01), [0, top + h / 2, -0.22]))
      for (const sx of [-1, 1]) parts.add(white, place(box(0.32, h, 0.01), [sx * 0.39, top + h / 2, -0.13], [0, -sx * 0.6, 0]))
      parts.add(tint.primary, place(box(0.4, 0.1, 0.012), [0, top + h - 0.1, -0.215]))
      for (const [x, y] of [[-0.1, 0.25], [0.1, 0.32], [0, 0.14]] as const) parts.add(tint.secondary, place(box(0.14, 0.1, 0.012), [x, top + y, -0.214]))
      parts.add(white, place(box(0.2, 0.01, 0.28), [0.6, top + 0.005, 0.08], [0, 0.15, 0]))
      break
    }
    case 'notebooks':
      for (const [x, i, mat] of [[-0.5, 0, tint.primary], [-0.5, 1, tint.secondary], [-0.5, 2, white], [0.1, 0, tint.secondary]] as const) {
        parts.add(mat, place(box(0.21, 0.025, 0.28), [x + i * 0.01, top + 0.0125 + i * 0.026, 0.02], [0, i * 0.12 - 0.1, 0]))
      }
      parts.add(m.ironBlack, place(new CylinderGeometry(0.045, 0.045, 0.12, 12), [0.55, top + 0.06, -0.05]))
      for (const dx of [-0.015, 0.012]) parts.add(tint.primary, place(new CylinderGeometry(0.005, 0.005, 0.16, 6), [0.55 + dx, top + 0.15, -0.05], [0.1, 0, dx * 8]))
      break
  }
  return parts.build()
}

/** Feather flag beside the tent, rippling gently. */
function FeatherFlag({ org, x, z }: { org: Organization; x: number; z: number }) {
  const flag = useRef<Mesh>(null)
  const { geometry, base } = useMemo(() => {
    const g = new PlaneGeometry(0.5, 1.8, 6, 10)
    g.translate(0.25, 0, 0)
    return { geometry: g, base: Float32Array.from(g.attributes.position.array) }
  }, [])
  const texture = useMemo(
    () =>
      paintedTexture(96, 320, (ctx, w, h) => {
        ctx.fillStyle = org.colors.primary
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = org.colors.secondary
        ctx.fillRect(0, h * 0.78, w, h * 0.06)
        ctx.save()
        ctx.translate(w / 2 + 14, h * 0.4)
        ctx.rotate(-Math.PI / 2)
        ctx.fillStyle = org.colors.ink
        ctx.font = '58px "Lilita One", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(org.short, 0, 0)
        ctx.restore()
      }),
    [org],
  )
  useEffect(() => () => (geometry.dispose(), texture.dispose()), [geometry, texture])

  useFrame(({ clock }) => {
    const pos = flag.current?.geometry.attributes.position as BufferAttribute | undefined
    if (!pos) return
    const t = clock.elapsedTime
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3]
      const by = base[i * 3 + 1]
      pos.setZ(i, Math.sin(t * 1.8 + bx * 5 + by * 0.8 + x) * 0.05 * (bx / 0.5))
    }
    pos.needsUpdate = true
  })

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.2, 0]} material={getMaterials().ironBlack}>
        <cylinderGeometry args={[0.015, 0.02, 2.4, 6]} />
      </mesh>
      <mesh ref={flag} geometry={geometry} position={[0.02, 1.45, 0]}>
        <meshStandardMaterial map={texture} side={DoubleSide} roughness={0.85} />
      </mesh>
    </group>
  )
}

/** Gently bobbing diamond: the game's "something to see here" cue. */
export function FloatingMarker({ y, phase = 0 }: { y: number; phase?: number }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime + phase
    ref.current.rotation.y = t * 0.9
    ref.current.position.y = y + Math.sin(t * 1.6) * 0.07
  })
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <octahedronGeometry args={[0.15, 0]} />
      <meshStandardMaterial color="#ff5f05" emissive="#ff5f05" emissiveIntensity={0.35} roughness={0.35} flatShading />
    </mesh>
  )
}

/**
 * A Quad Day booth: pop-up canopy in the org's colour with its name on the
 * valance, a draped table with a painted banner, two folding chairs, a
 * signature prop and a feather flag.
 */
export function QuadDayBooth({ placement, index }: { placement: BoothPlacement; index: number }) {
  const { org, position, rotationY } = placement
  const tint = useMemo(
    () => ({
      primary: new MeshStandardMaterial({ color: org.colors.primary, roughness: 0.85, side: DoubleSide }),
      secondary: new MeshStandardMaterial({ color: org.colors.secondary, roughness: 0.6, emissive: org.prop === 'laptop' ? org.colors.secondary : '#000000', emissiveIntensity: org.prop === 'laptop' ? 0.4 : 0 }),
    }),
    [org],
  )
  const parts = useMemo(() => buildBooth(org, tint), [org, tint])
  const valance = useMemo(() => valanceTexture(org), [org])
  const banner = useMemo(() => bannerTexture(org), [org])
  useEffect(
    () => () => {
      tint.primary.dispose()
      tint.secondary.dispose()
      valance.dispose()
      banner.dispose()
    },
    [tint, valance, banner],
  )

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotationY, 0]}>
      <Parts parts={parts} />
      {/* Front valance and tablecloth banner (painted) */}
      <mesh position={[0, TENT.legHeight - 0.12, TENT.half + 0.012]}>
        <planeGeometry args={[TENT.half * 2 + 0.04, 0.3]} />
        <meshStandardMaterial map={valance} roughness={0.85} />
      </mesh>
      <mesh position={[0, (TABLE.h + 0.05) / 2, TABLE.d / 2 + 0.04]} castShadow>
        <planeGeometry args={[TABLE.w + 0.06, TABLE.h - 0.05]} />
        <meshStandardMaterial map={banner} roughness={0.8} />
      </mesh>
      <FeatherFlag org={org} x={TENT.half + 0.35} z={TENT.half - 0.2} />
      <FloatingMarker y={TENT.legHeight + TENT.roofHeight + 0.5} phase={index * 1.3} />
    </group>
  )
}

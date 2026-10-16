import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace, Vector3, type Mesh } from 'three'
import { ABOUT_ME_INSTALLATION, PALETTE } from '../../config/world'
import { nextInRange } from '../../lib/movement'
import { getMaterials } from '../materials/materials'

const BOARD = { w: 1.5, h: 0.95, tilt: -0.22, y: 1.45 }

/** Paints the board face: navy panel, orange header band, the stop's title. */
function createBoardTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 486
  const ctx = canvas.getContext('2d')!
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8

  const paint = () => {
    const { width: w, height: h } = canvas
    ctx.fillStyle = PALETTE.illinoisBlue
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = PALETTE.illinoisOrange
    ctx.fillRect(0, 0, w, 92)
    // Header: stop number, like campus wayfinding signs.
    ctx.fillStyle = '#fbf6ee'
    ctx.font = '600 34px Figtree, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText('STOP 01  ·  CENTER QUAD', 44, 48)
    // Title
    ctx.font = '120px "Lilita One", sans-serif'
    ctx.fillText('ABOUT ME', 44, 228)
    // Fine rule and a small block-I emblem.
    ctx.fillStyle = 'rgba(251, 246, 238, 0.35)'
    ctx.fillRect(44, 318, w - 88, 3)
    ctx.fillStyle = '#fbf6ee'
    ctx.font = '500 32px Figtree, sans-serif'
    ctx.fillText('Get to know the person behind the Quad.', 44, 384)
    ctx.fillStyle = PALETTE.illinoisOrange
    const ix = w - 104
    const iy = 360
    ctx.fillRect(ix, iy, 56, 14)
    ctx.fillRect(ix + 18, iy, 20, 72)
    ctx.fillRect(ix, iy + 58, 56, 14)
    texture.needsUpdate = true
  }
  paint()
  // Repaint once the web fonts are ready (the title face loads with the page).
  document.fonts?.ready
    .then(() => document.fonts.load('120px "Lilita One"'))
    .then(paint)
    .catch(() => {})
  return texture
}

interface AboutMeInstallationProps {
  /** Reports when the player walks into or out of interaction range. */
  onRangeChange: (inRange: boolean) => void
  /** DOM prompt (ui/InteractionPrompt) to keep positioned above the board. */
  promptRef?: RefObject<HTMLDivElement | null>
}

/** Where the floating prompt hangs, above the marker. */
const PROMPT_ANCHOR_Y = 3.4

/**
 * The About Me stop: a campus-style information board on a stone plinth,
 * with a slowly turning orange marker above it (the game's "something here"
 * cue). It reports when the player is in range and keeps the on-screen
 * prompt (rendered by App) positioned above it.
 */
export function AboutMeInstallation({ onRangeChange, promptRef }: AboutMeInstallationProps) {
  const m = getMaterials()
  const board = useMemo(createBoardTexture, [])
  const marker = useRef<Mesh>(null)
  const inRange = useRef(false)
  const size = useThree((st) => st.size)
  const anchor = useMemo(() => new Vector3(), [])
  const [x, , z] = ABOUT_ME_INSTALLATION.position
  const { enter, exit } = ABOUT_ME_INSTALLATION.range

  useEffect(() => () => board.dispose(), [board])

  useFrame(({ camera, clock }) => {
    const distance = Math.hypot(camera.position.x - x, camera.position.z - z)
    const next = nextInRange(distance, inRange.current, enter, exit)
    if (next !== inRange.current) {
      inRange.current = next
      onRangeChange(next)
    }
    // Keep the DOM prompt pinned above the board on screen (hidden when behind the camera).
    const el = promptRef?.current
    if (el) {
      anchor.set(x, PROMPT_ANCHOR_Y, z).project(camera)
      const behind = anchor.z > 1
      el.style.visibility = behind ? 'hidden' : 'visible'
      el.style.transform = `translate3d(${((anchor.x + 1) / 2) * size.width}px, ${((1 - anchor.y) / 2) * size.height}px, 0)`
    }
    const t = clock.elapsedTime
    if (marker.current) {
      marker.current.rotation.y = t * 0.9
      marker.current.position.y = 2.55 + Math.sin(t * 1.6) * 0.07
    }
  })

  return (
    <group position={[x, 0, z]} rotation={[0, ABOUT_ME_INSTALLATION.rotationY, 0]}>
      {/* Stone plinth with a moulded cap */}
      <mesh position={[0, 0.17, 0]} material={m.limestone} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.34, 0.8]} />
      </mesh>
      <mesh position={[0, 0.37, 0]} material={m.stoneTrim} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.07, 0.9]} />
      </mesh>
      {/* Cast-iron posts */}
      {[-0.68, 0.68].map((px) => (
        <mesh key={px} position={[px, 1.05, -0.05]} material={m.ironBlack} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 1.35, 10]} />
        </mesh>
      ))}
      {/* Tilted board in a cream frame, like a lectern */}
      <group position={[0, BOARD.y, 0]} rotation={[BOARD.tilt, 0, 0]}>
        <mesh material={m.whitePaint} castShadow receiveShadow>
          <boxGeometry args={[BOARD.w + 0.1, BOARD.h + 0.1, 0.06]} />
        </mesh>
        <mesh position={[0, 0, 0.032]}>
          <planeGeometry args={[BOARD.w, BOARD.h]} />
          <meshStandardMaterial map={board} roughness={0.6} />
        </mesh>
        <mesh position={[0, BOARD.h / 2 + 0.07, 0.01]} material={m.ironBlack} castShadow>
          <boxGeometry args={[BOARD.w + 0.2, 0.04, 0.12]} />
        </mesh>
      </group>
      {/* Floating marker */}
      <mesh ref={marker} position={[0, 2.55, 0]} castShadow>
        <octahedronGeometry args={[0.17, 0]} />
        <meshStandardMaterial color={PALETTE.illinoisOrange} emissive={PALETTE.illinoisOrange} emissiveIntensity={0.35} roughness={0.35} flatShading />
      </mesh>

    </group>
  )
}

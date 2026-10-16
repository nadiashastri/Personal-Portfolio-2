import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  BackSide,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  MeshStandardMaterial,
  NeutralToneMapping,
  Path,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type PerspectiveCamera,
  type SpotLight,
} from 'three'
import { createRandom } from '../../lib/random'
import { box, merge, place } from '../architecture/geometry'
import { Instanced, type Transform } from '../architecture/parts/Instanced'

/*
 * Foellinger's interior, stylised: a raked, curved bowl of seats facing a
 * stage framed by a gilded proscenium arch, under a shallow dome ringed with
 * lights (the real auditorium is a domed hall). It's a composed set, not a
 * walkable level: the camera sits in the audience looking at the screen.
 *
 * Units are metres; the stage front is at z = 0, the audience towards +z.
 */

export const SCREEN = { width: 12.8, height: 8, centreY: 5.95, z: -6.4 } as const
const STAGE = { top: 1.1, front: 0.6, back: -9, halfWidth: 13 }
const PROSCENIUM = { z: -1.6, halfWidth: 10.4, springY: 8.6, crownY: 11.2 }
const SEATS = { rows: 12, firstZ: 3.2, rowDepth: 1.12, rake: 0.24, arcCentreZ: -10, spacing: 0.64, aisle: 1.3 }
const FOV = 50
/** Seated eye height in the audience; the view looks up at the screen over the rows ahead. */
const EYE_Y = 2.7

const COLORS = {
  fog: '#0b1424',
  plaster: '#e9dcc6',
  gold: '#c9a25a',
  curtain: '#8f2414',
  seatFabric: '#1d335c',
  wood: '#6e4a31',
  carpet: '#5b1f1c',
  screen: '#f4ede0',
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function plankTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const rand = createRandom(4)
  for (let i = 0; i < 8; i++) {
    const v = 120 + rand() * 40
    ctx.fillStyle = `rgb(${v + 30},${v - 5},${v - 45})`
    ctx.fillRect(0, i * 32, 256, 32)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, i * 32, 256, 1.5)
    ctx.fillRect(rand() * 256, i * 32, 1.5, 32)
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(6, 3)
  t.colorSpace = SRGBColorSpace
  return t
}

/** Seat row positions on concentric arcs round the stage, with two aisles. */
function seatLayout() {
  const seats: Transform[] = []
  const risers: { radius: number; top: number }[] = []
  for (let r = 0; r < SEATS.rows; r++) {
    const z0 = SEATS.firstZ + r * SEATS.rowDepth
    const radius = z0 - SEATS.arcCentreZ
    const top = r * SEATS.rake
    risers.push({ radius, top })
    const halfAngle = Math.min(0.62, 12.5 / radius)
    const count = Math.floor((2 * halfAngle * radius) / SEATS.spacing)
    for (let i = 0; i <= count; i++) {
      const a = -halfAngle + (2 * halfAngle * i) / count
      const x = radius * Math.sin(a)
      const z = SEATS.arcCentreZ + radius * Math.cos(a)
      // Aisles a third of the way across each side.
      if (Math.abs(Math.abs(x) - 4.2) < SEATS.aisle / 2) continue
      // Seats face the centre of the arc (towards the stage); front is local -Z.
      const dx = -x
      const dz = SEATS.arcCentreZ - z
      seats.push({ position: [x, top, z], rotationY: Math.atan2(-dx, -dz) })
    }
  }
  return { seats, risers }
}

function seatGeometries() {
  const fabric = merge([
    place(box(0.52, 0.12, 0.48), [0, 0.44, -0.02]),
    place(box(0.5, 0.58, 0.1), [0, 0.8, 0.2], [-0.16, 0, 0]),
  ])
  const wood = merge([
    place(box(0.06, 0.32, 0.5), [-0.29, 0.62, 0]),
    place(box(0.06, 0.32, 0.5), [0.29, 0.62, 0]),
    place(box(0.54, 0.66, 0.05), [0, 0.8, 0.27], [-0.16, 0, 0]),
    place(box(0.08, 0.4, 0.4), [0, 0.2, 0.05]),
  ])
  return { fabric, wood }
}

/** Carpeted, stepped floor: each row is an extruded annular sector. */
function riserGeometry(risers: { radius: number; top: number }[]) {
  return merge(
    risers.map(({ radius, top }) => {
      const shape = new Shape()
      const half = 0.8
      const inner = radius - SEATS.rowDepth / 2
      const outer = radius + SEATS.rowDepth / 2
      shape.absarc(0, 0, outer, Math.PI / 2 - half, Math.PI / 2 + half, false)
      shape.absarc(0, 0, inner, Math.PI / 2 + half, Math.PI / 2 - half, true)
      const g = new ExtrudeGeometry(shape, { depth: top + 0.3, bevelEnabled: false, curveSegments: 24 })
      // Shape XY → floor XZ (shape +y → world +z), extruded downward from the riser top.
      g.rotateX(Math.PI / 2)
      g.translate(0, top, SEATS.arcCentreZ)
      return g
    }),
  )
}

/** Proscenium wall with a segmental-arched opening, plus the gilded moulding round it. */
function proscenium() {
  const { halfWidth: w, springY, crownY } = PROSCENIUM
  const wall = new Shape()
  wall.moveTo(-17, 0)
  wall.lineTo(17, 0)
  wall.lineTo(17, 16)
  wall.lineTo(-17, 16)
  wall.lineTo(-17, 0)
  const rise = crownY - springY
  const radius = (w * w + rise * rise) / (2 * rise)
  const centreY = crownY - radius
  const startAngle = Math.atan2(springY - centreY, w)
  const opening = new Path()
  opening.moveTo(-w, STAGE.top)
  opening.lineTo(w, STAGE.top)
  opening.lineTo(w, springY)
  opening.absarc(0, centreY, radius, startAngle, Math.PI - startAngle, false)
  opening.lineTo(-w, STAGE.top)
  wall.holes.push(opening)
  const wallGeometry = new ExtrudeGeometry(wall, { depth: 0.8, bevelEnabled: false, curveSegments: 48 })
  wallGeometry.translate(0, 0, PROSCENIUM.z - 0.4)

  const points = [new Vector3(-w, STAGE.top, 0), new Vector3(-w, springY, 0)]
  for (let i = 0; i <= 32; i++) {
    const a = Math.PI - startAngle - ((Math.PI - 2 * startAngle) * i) / 32
    points.push(new Vector3(radius * Math.cos(a), centreY + radius * Math.sin(a), 0))
  }
  points.push(new Vector3(w, springY, 0), new Vector3(w, STAGE.top, 0))
  const trim = new TubeGeometry(new CatmullRomCurve3(points, false, 'catmullrom', 0.05), 160, 0.16, 8, false)
  trim.translate(0, 0, PROSCENIUM.z + 0.42)
  return { wall: wallGeometry, trim }
}

/** Velvet curtain panel with soft vertical folds. */
function curtainGeometry(width: number, height: number, folds: number) {
  const g = new PlaneGeometry(width, height, folds * 8, 1)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / width) * folds * Math.PI * 2) * 0.16)
  g.computeVertexNormals()
  return g
}

interface SceneProps {
  /** DOM element kept exactly over the projection screen (the presentation UI). */
  screenRef: RefObject<HTMLDivElement | null>
}

function Auditorium({ screenRef }: SceneProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const intro = useRef(reducedMotion() ? 1 : 0)
  const spots = useRef<(SpotLight | null)[]>([])

  const assets = useMemo(() => {
    const { seats, risers } = seatLayout()
    return {
      seats,
      seat: seatGeometries(),
      risers: riserGeometry(risers),
      proscenium: proscenium(),
      curtain: curtainGeometry(3.4, 9.2, 5),
      valance: curtainGeometry(21.5, 1.6, 22),
      planks: plankTexture(),
      materials: {
        plaster: new MeshStandardMaterial({ color: COLORS.plaster, roughness: 0.85 }),
        gold: new MeshStandardMaterial({ color: COLORS.gold, roughness: 0.35, metalness: 0.75 }),
        curtain: new MeshStandardMaterial({ color: COLORS.curtain, roughness: 0.9, side: DoubleSide }),
        fabric: new MeshStandardMaterial({ color: COLORS.seatFabric, roughness: 0.95 }),
        wood: new MeshStandardMaterial({ color: COLORS.wood, roughness: 0.6 }),
        carpet: new MeshStandardMaterial({ color: COLORS.carpet, roughness: 1 }),
        dark: new MeshStandardMaterial({ color: '#141a24', roughness: 0.8 }),
        glow: new MeshStandardMaterial({ color: '#ffe2b0', emissive: '#ffcf86', emissiveIntensity: 2.2 }),
      },
    }
  }, [])

  useEffect(
    () => () => {
      for (const g of [assets.seat.fabric, assets.seat.wood, assets.risers, assets.proscenium.wall, assets.proscenium.trim, assets.curtain, assets.valance]) g.dispose()
      assets.planks.dispose()
      for (const m of Object.values(assets.materials)) m.dispose()
    },
    [assets],
  )

  // Frame the screen: generous context on wide screens, filling the width on narrow ones.
  const framing = useMemo(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const tanHalf = Math.tan((FOV * Math.PI) / 360)
    const fill = aspect >= 1.2 ? 0.62 : 0.94
    // Far enough that the screen fits the width, and its top stays inside the frame.
    const distW = SCREEN.width / 2 / (tanHalf * aspect * fill)
    const top = SCREEN.centreY + SCREEN.height / 2 - EYE_Y
    const distH = top / Math.tan((FOV * Math.PI) / 180 * 0.42 + 0.06)
    const dist = Math.max(distW, distH)
    // Aim below the screen so it sits in the upper frame, with seat rows across the bottom.
    return { dist, target: new Vector3(0, EYE_Y + 0.6, SCREEN.z) }
  }, [size])

  useLayoutEffect(() => {
    camera.fov = FOV
    camera.updateProjectionMatrix()
  }, [camera])

  useLayoutEffect(() => {
    for (const s of spots.current) {
      s?.target.position.set(0, STAGE.top, -4)
      s?.target.updateMatrixWorld()
    }
  }, [])

  const corner = useMemo(() => new Vector3(), [])
  useFrame((_, dt) => {
    // Opening dolly: drift a few metres down the aisle and settle.
    intro.current = Math.min(1, intro.current + dt / 2.4)
    const k = 1 - Math.pow(1 - intro.current, 3)
    const back = (1 - k) * 4
    camera.position.set(0, EYE_Y + (1 - k) * 1.2, framing.target.z + framing.dist + back)
    camera.lookAt(framing.target)
    camera.updateMatrixWorld()

    // Keep the presentation UI exactly over the screen's on-screen rectangle.
    const el = screenRef.current
    if (!el) return
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      corner.set((sx * SCREEN.width) / 2, SCREEN.centreY + (sy * SCREEN.height) / 2, SCREEN.z).project(camera)
      const px = ((corner.x + 1) / 2) * size.width
      const py = ((1 - corner.y) / 2) * size.height
      minX = Math.min(minX, px)
      maxX = Math.max(maxX, px)
      minY = Math.min(minY, py)
      maxY = Math.max(maxY, py)
    }
    if (size.width < 640) {
      // Phones: the screen is too small to read, so the presentation grows into a
      // full-width sheet that starts at the screen's top edge.
      const top = Math.max(minY, 72)
      el.style.left = '12px'
      el.style.top = `${top}px`
      el.style.width = `${size.width - 24}px`
      el.style.height = `${Math.max(size.height - top - 96, 240)}px`
    } else {
      el.style.left = `${minX}px`
      el.style.top = `${minY}px`
      el.style.width = `${maxX - minX}px`
      el.style.height = `${maxY - minY}px`
    }
  })

  const m = assets.materials
  const sconces = [-1, 1].flatMap((side) => [2, 9].map((z) => [side * 14.6, 6.2, z] as [number, number, number]))
  const domeLights: Transform[] = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2
        return { position: [Math.cos(a) * 9.5, 15.6, 6 + Math.sin(a) * 9.5], scale: [0.16, 0.16, 0.16] }
      }),
    [],
  )
  const pilasters: Transform[] = useMemo(
    () => [-1, 1].flatMap((side) => [-0.5, 5.5, 12.5].map((z): Transform => ({ position: [side * 14.75, 6.5, z] }))),
    [],
  )
  const pilaster = useMemo(() => box(0.5, 13, 0.9), [])
  const sphere = useMemo(() => new SphereGeometry(1, 12, 8), [])
  const sconceShade = useMemo(() => new CylinderGeometry(0.22, 0.12, 0.42, 12, 1, true), [])

  return (
    <>
      <color attach="background" args={[COLORS.fog]} />
      <fog attach="fog" args={[COLORS.fog, 22, 48]} />
      <ambientLight intensity={0.25} color="#ffe6c4" />
      <hemisphereLight args={['#ffdcae', '#2a1a14', 0.35]} />
      {/* Warm stage spots from the ceiling, and the glow thrown back by the screen. */}
      {[-6, 6].map((x, i) => (
        <spotLight
          key={x}
          ref={(s) => {
            spots.current[i] = s
          }}
          position={[x, 13, 9]}
          angle={0.42}
          penumbra={0.8}
          intensity={260}
          decay={2}
          color="#ffd7a1"
        />
      ))}
      {/* Low warm house lights over the audience */}
      <pointLight position={[0, 9, 9]} intensity={45} distance={22} decay={2} color="#ffd9a8" />
      <pointLight position={[0, SCREEN.centreY, SCREEN.z + 3]} intensity={30} distance={22} decay={2} color="#fff1dc" />
      {sconces.map((p) => (
        <pointLight key={p.join()} position={[p[0] * 0.95, p[1], p[2]]} intensity={5} distance={9} decay={2} color="#ffc27a" />
      ))}

      {/* Stage: wood floor, dark apron face with a fine orange line, front step. */}
      <mesh position={[0, STAGE.top / 2, (STAGE.front + STAGE.back) / 2]}>
        <boxGeometry args={[STAGE.halfWidth * 2, STAGE.top, STAGE.front - STAGE.back]} />
        <meshStandardMaterial map={assets.planks} roughness={0.55} />
      </mesh>
      <mesh position={[0, STAGE.top / 2, STAGE.front + 0.01]} material={m.dark}>
        <planeGeometry args={[STAGE.halfWidth * 2, STAGE.top]} />
      </mesh>
      <mesh position={[0, STAGE.top - 0.12, STAGE.front + 0.02]}>
        <planeGeometry args={[STAGE.halfWidth * 2, 0.04]} />
        <meshBasicMaterial color="#ff5f05" toneMapped={false} />
      </mesh>

      {/* Projection screen in a black frame */}
      <mesh position={[0, SCREEN.centreY, SCREEN.z - 0.06]} material={m.dark}>
        <boxGeometry args={[SCREEN.width + 0.5, SCREEN.height + 0.5, 0.08]} />
      </mesh>
      <mesh position={[0, SCREEN.centreY, SCREEN.z]}>
        <planeGeometry args={[SCREEN.width, SCREEN.height]} />
        <meshBasicMaterial color={COLORS.screen} toneMapped={false} />
      </mesh>

      {/* Proscenium arch, gilded moulding, curtains */}
      <mesh geometry={assets.proscenium.wall} material={m.plaster} />
      <mesh geometry={assets.proscenium.trim} material={m.gold} />
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={assets.curtain} material={m.curtain} position={[side * (PROSCENIUM.halfWidth - 1.5), STAGE.top + 4.6, PROSCENIUM.z - 0.6]} />
      ))}
      <mesh geometry={assets.valance} material={m.curtain} position={[0, PROSCENIUM.springY + 0.4, PROSCENIUM.z - 0.5]} />

      {/* Audience: carpeted risers and curved rows of seats */}
      <mesh geometry={assets.risers} material={m.carpet} />
      <Instanced geometry={assets.seat.fabric} material={m.fabric} transforms={assets.seats} />
      <Instanced geometry={assets.seat.wood} material={m.wood} transforms={assets.seats} />

      {/* Side walls with pilasters and sconces */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 15, 8, 8]} rotation={[0, -side * (Math.PI / 2), 0]} material={m.plaster}>
          <planeGeometry args={[34, 16]} />
        </mesh>
      ))}
      <Instanced geometry={pilaster} material={m.plaster} transforms={pilasters} />
      <Instanced geometry={sconceShade} material={m.glow} transforms={sconces.map((p) => ({ position: p }))} />

      {/* Shallow dome with a ring of lights and a glowing oculus */}
      <mesh position={[0, -6, 6]}>
        <sphereGeometry args={[24, 48, 16, 0, Math.PI * 2, 0, 0.62]} />
        <meshStandardMaterial color="#d8c6a8" roughness={0.9} side={BackSide} />
      </mesh>
      <Instanced geometry={sphere} material={m.glow} transforms={domeLights} />
      <mesh position={[0, 17.6, 6]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
        <torusGeometry args={[3.2, 0.18, 8, 48]} />
      </mesh>
    </>
  )
}

/**
 * The auditorium as its own lightweight canvas, mounted only while the
 * visitor is inside Foellinger. No shadows or post-processing.
 */
export function AuditoriumScene({ screenRef }: SceneProps) {
  return (
    <div className="fixed inset-0" aria-hidden>
      <Canvas dpr={[1, 2]} gl={{ antialias: true, toneMapping: NeutralToneMapping }} camera={{ fov: FOV, near: 0.1, far: 120 }}>
        <Auditorium screenRef={screenRef} />
      </Canvas>
    </div>
  )
}

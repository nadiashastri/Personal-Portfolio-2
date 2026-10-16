import { Component, Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { Box3, Color, MeshPhysicalMaterial, NeutralToneMapping, Vector3, type Group, type Mesh, type Object3D } from 'three'

/**
 * The opening title as real 3D lettering: "Nadia" in Illinois navy over
 * "Shastri" in Illinois orange. Letters are extruded and bevelled in Blender
 * (blender/build_assets.py → public/models/title.glb, one object per letter)
 * and rendered in a small transparent canvas with their own studio lighting,
 * so they read like painted toy blocks set down over the Quad.
 */

const TITLE_URL = '/models/title.glb'
useGLTF.preload(TITLE_URL)

const PAINT = {
  Nadia: { face: '#1b3563', side: '#0c1a33' },
  Shastri: { face: '#ff6512', side: '#c03d08' },
} as const

/** When each letter starts (s), relative to the title mounting; Shastri follows Nadia. */
const START = 0.35
const STAGGER = 0.07
const LINE_GAP = 0.18
const DURATION = 0.85

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Lacquered paint: a soft clear-coat sheen on the faces, a deeper, matte tone down the sides. */
function paint(color: string, side: boolean) {
  return new MeshPhysicalMaterial({
    color: new Color(color),
    roughness: side ? 0.6 : 0.38,
    metalness: 0,
    clearcoat: side ? 0.15 : 0.7,
    clearcoatRoughness: 0.35,
    envMapIntensity: side ? 0.6 : 1.1,
  })
}

/** Ease-out with a very small overshoot: the letter's weight lands, then rests. */
function settle(t: number) {
  const c = 1.25
  const u = t - 1
  return 1 + (c + 1) * u * u * u + c * u * u
}

interface Letter {
  object: Object3D
  rest: Vector3
  delay: number
}

function Lettering({ onReady }: { onReady?: () => void }) {
  const { scene } = useGLTF(TITLE_URL)
  const group = useRef<Group>(null)
  const clock = useRef(-1)
  const animate = useMemo(() => !reducedMotion(), [])

  const { root, letters, size } = useMemo(() => {
    const root = scene.clone(true)
    const letters: Letter[] = []
    root.traverse((o) => {
      const match = /^(Nadia|Shastri)_(\d+)/.exec(o.name)
      if (!match || o.parent?.name.startsWith(match[1] + '_')) return
      const word = match[1] as keyof typeof PAINT
      const index = Number(match[2])
      o.traverse((child) => {
        const mesh = child as Mesh
        if (!mesh.isMesh) return
        const isSide = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.name === 'side'
        mesh.material = paint(PAINT[word][isSide ? 'side' : 'face'], isSide)
        mesh.castShadow = true
      })
      letters.push({ object: o, rest: o.position.clone(), delay: START + (word === 'Shastri' ? 5 * STAGGER + LINE_GAP : 0) + index * STAGGER })
    })
    // Centre the block of lettering on the origin.
    const box = new Box3().setFromObject(root)
    const centre = box.getCenter(new Vector3())
    root.position.sub(centre)
    return { root, letters, size: box.getSize(new Vector3()) }
  }, [scene])

  // Fit the lettering to the canvas width.
  const camera = useThree((s) => s.camera)
  const viewport = useThree((s) => s.size)
  useLayoutEffect(() => {
    const fov = (40 * Math.PI) / 180
    const aspect = viewport.width / viewport.height
    const fitWidth = (size.x * 1.08) / 2 / (Math.tan(fov / 2) * aspect)
    const fitHeight = (size.y * 1.2) / 2 / Math.tan(fov / 2)
    camera.position.set(0, 0.05, Math.max(fitWidth, fitHeight) + size.z)
    camera.lookAt(0, 0, 0)
    onReady?.()
  }, [camera, viewport, size, onReady])

  useFrame(({ pointer, clock: frameClock }, dt) => {
    // Real elapsed time since mount, so the sequence keeps its timing even at low frame rates.
    if (clock.current < 0) clock.current = frameClock.elapsedTime
    const t = frameClock.elapsedTime - clock.current
    for (const { object, rest, delay } of letters) {
      const p = animate ? Math.min(Math.max((t - delay) / DURATION, 0), 1) : 1
      const k = settle(p)
      // Each letter drops in from a little above, tipped back, and sets down on its baseline.
      object.position.set(rest.x, rest.y + (1 - k) * 0.55, rest.z + (1 - k) * 0.25)
      object.rotation.set(-(1 - k) * 0.55, 0, (1 - k) * 0.12 * Math.sign(rest.x || 1))
      object.scale.setScalar(p === 0 ? 0.0001 : 0.85 + 0.15 * Math.min(1, p * 1.6))
    }
    // A slight three-quarter turn shows the extruded sides, easing a little towards the pointer.
    const g = group.current
    if (g) {
      g.rotation.y += ((-0.2 + pointer.x * 0.06) - g.rotation.y) * Math.min(1, dt * 3)
      g.rotation.x += ((0.08 - pointer.y * 0.04) - g.rotation.x) * Math.min(1, dt * 3)
    }
  })

  return (
    <group ref={group}>
      <primitive object={root} />
    </group>
  )
}

/** Plain-type fallback if WebGL or the model is unavailable. */
class TitleErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function TitleFallback() {
  return (
    <div className="font-title text-[clamp(3rem,7vw,5.5rem)] leading-[0.95] tracking-[0.01em]">
      <span className="block text-illini-blue">Nadia</span>
      <span className="block text-illini-orange">Shastri</span>
    </div>
  )
}

export function TitleLettering({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none ${className}`}>
      <TitleErrorBoundary fallback={<TitleFallback />}>
        <Canvas
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, toneMapping: NeutralToneMapping }}
          camera={{ fov: 40, near: 0.1, far: 100 }}
          style={{ pointerEvents: 'none' }}
          eventSource={typeof document !== 'undefined' ? document.body : undefined}
        >
          {/* Studio light: warm key from the upper left, cool fill, a crisp rim from behind. */}
          <ambientLight intensity={0.35} />
          <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#fff3e2" />
          <directionalLight position={[4, -1, 3]} intensity={0.5} color="#cfe0ff" />
          <directionalLight position={[2, 3, -4]} intensity={1.4} color="#ffffff" />
          <Environment resolution={64} frames={1}>
            <Lightformer form="rect" intensity={2.4} position={[-3, 3, 4]} scale={[6, 2, 1]} color="#fff7ec" />
            <Lightformer form="rect" intensity={1.2} position={[4, 0, 3]} scale={[2, 5, 1]} color="#dfe9ff" />
            <Lightformer form="rect" intensity={0.6} position={[0, -4, 2]} scale={[8, 1, 1]} color="#9fbf7a" />
          </Environment>
          <Suspense fallback={null}>
            <Lettering />
          </Suspense>
        </Canvas>
      </TitleErrorBoundary>
    </div>
  )
}

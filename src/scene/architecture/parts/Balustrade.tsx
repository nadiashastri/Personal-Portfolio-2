import { useMemo } from 'react'
import { getMaterials } from '../../materials/materials'
import { box } from '../geometry'
import { createBaluster } from './classical'
import { Instanced, type Transform } from './Instanced'
import { ModelInstances, ORNAMENT_URLS } from './ornaments'

interface BalustradeProps {
  /** Start and end of the run on the XZ plane (local to the parent group). */
  from: readonly [number, number]
  to: readonly [number, number]
  /** Height of the base the balustrade stands on. */
  y?: number
  height?: number
}

/** The Blender bay spans 2.4 m between post centres and stands 1 m tall. */
const BAY = 2.4
const balusterGeometry = createBaluster(0.72)

/**
 * Stone balustrade. Uses the Blender-modelled bays (turned balusters, moulded
 * rails) and panelled posts, stretched by a few percent so a whole number of
 * bays fits each run. A simple procedural version shows while they load.
 */
export function Balustrade({ from, to, y = 0, height = 1 }: BalustradeProps) {
  const layout = useMemo(() => {
    const dx = to[0] - from[0]
    const dz = to[1] - from[1]
    const length = Math.hypot(dx, dz)
    const angle = -Math.atan2(dz, dx)
    const ux = dx / length
    const uz = dz / length
    const bays = Math.max(1, Math.round(length / BAY))
    const stretch = length / (bays * BAY)
    const at = (t: number, yy: number): [number, number, number] => [from[0] + ux * t, yy, from[1] + uz * t]

    const bayTransforms: Transform[] = []
    const posts: Transform[] = []
    for (let i = 0; i < bays; i++) {
      bayTransforms.push({ position: at((i + 0.5) * BAY * stretch, y), rotationY: angle, scale: [stretch, height, 1] })
    }
    for (let i = 0; i <= bays; i++) posts.push({ position: at(i * BAY * stretch, y), rotationY: angle, scale: [1, height, 1] })

    // Procedural fallback pieces.
    const balusters: Transform[] = []
    for (let t = 0.35; t < length - 0.2; t += 0.3) {
      if (posts.some((p) => Math.hypot(p.position[0] - at(t, 0)[0], p.position[2] - at(t, 0)[2]) < 0.35)) continue
      balusters.push({ position: at(t, y + 0.14) })
    }
    return { bayTransforms, posts, balusters, length, angle, mid: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2] as const }
  }, [from, to, y, height])

  const m = getMaterials()
  const postGeometry = useMemo(() => box(0.38, height, 0.38).translate(0, height / 2, 0), [height])
  const fallback = (
    <>
      <Instanced geometry={balusterGeometry} material={m.stoneTrim} transforms={layout.balusters} />
      <Instanced geometry={postGeometry} material={m.stoneTrim} transforms={layout.posts.map((p) => ({ ...p, scale: undefined }))} castShadow />
      <mesh position={[layout.mid[0], y + 0.07, layout.mid[1]]} rotation={[0, layout.angle, 0]} material={m.stoneTrim} receiveShadow>
        <boxGeometry args={[layout.length, 0.14, 0.34]} />
      </mesh>
      <mesh position={[layout.mid[0], y + height - 0.07, layout.mid[1]]} rotation={[0, layout.angle, 0]} material={m.stoneTrim} castShadow receiveShadow>
        <boxGeometry args={[layout.length, 0.14, 0.42]} />
      </mesh>
    </>
  )

  return (
    <group>
      <ModelInstances url={ORNAMENT_URLS.balustradeBay} transforms={layout.bayTransforms} fallback={fallback} />
      <ModelInstances url={ORNAMENT_URLS.balustradePost} transforms={layout.posts} fallback={null} />
    </group>
  )
}

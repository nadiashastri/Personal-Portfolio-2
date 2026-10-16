import { useMemo } from 'react'
import { createRandom } from '../../lib/random'
import { box, merge, place } from '../architecture/geometry'
import { Instanced } from '../architecture/parts/Instanced'
import { ModelInstances, ORNAMENT_URLS } from '../architecture/parts/ornaments'
import { getMaterials } from '../materials/materials'
import { Trees } from '../vegetation/Trees'
import type { TreeInstance } from '../vegetation/treeLayout'
import { createBench, createLamppost } from './propGeometry'
import type { PropLayout } from './propLayout'

/** Orange marigolds and purple salvia (reference 12), with a little white. */
const FLOWER_TINTS = ['#ff5a1a', '#f0702a', '#7d55c4', '#8f63cf', '#f4efe2']

/** Lampposts, benches and flower beds — a handful of draw calls in total. */
export function Props({ layout }: { layout: PropLayout }) {
  const m = getMaterials()
  const lamp = useMemo(createLamppost, [])
  const bench = useMemo(createBench, [])

  const { beds, flowers } = useMemo(() => {
    const rand = createRandom(31)
    const flowers: TreeInstance[] = []
    const beds = merge(
      layout.flowerBeds.map(({ centre: [x, z], size: [w, d], wallSide }) => {
        if (wallSide) {
          // Tiered like Foellinger's beds (reference 12): ornamental grasses against
          // the wall, purple salvia in the middle, orange marigolds at the front.
          for (let fx = -w / 2 + 0.35; fx <= w / 2 - 0.3; fx += 0.42) {
            for (let fz = -d / 2 + 0.25; fz <= d / 2 - 0.2; fz += 0.4) {
              const depth = (fz * wallSide + d / 2) / d // 0 = front edge, 1 = against the wall
              const back = depth > 0.68
              if (back && Math.round(fx / 0.42) % 2) continue
              flowers.push({
                kind: back ? 'ornamentalGrass' : 'flowers',
                position: [x + fx + (rand() - 0.5) * 0.12, z + fz + (rand() - 0.5) * 0.12],
                scale: back ? 0.9 + rand() * 0.3 : 0.85 + rand() * 0.3,
                rotation: rand() * Math.PI * 2,
                tint: back ? '#d6d79a' : depth > 0.36 ? FLOWER_TINTS[2 + Math.floor(rand() * 2)] : FLOWER_TINTS[Math.floor(rand() * 2)],
              })
            }
          }
          return place(box(w, 0.12, d), [x, 0.06, z])
        }
        // Bands of colour across each bed, like municipal bedding schemes.
        for (let fx = -w / 2 + 0.35; fx <= w / 2 - 0.3; fx += 0.48) {
          for (let fz = -d / 2 + 0.3; fz <= d / 2 - 0.25; fz += 0.45) {
            const band = Math.floor(((fx + w / 2) / w) * 3 + rand() * 0.6) % 3
            flowers.push({
              kind: 'flowers',
              position: [x + fx + (rand() - 0.5) * 0.15, z + fz + (rand() - 0.5) * 0.15],
              scale: 0.85 + rand() * 0.3,
              rotation: rand() * Math.PI * 2,
              tint: band === 1 ? FLOWER_TINTS[2 + Math.floor(rand() * 2)] : rand() < 0.15 ? FLOWER_TINTS[4] : FLOWER_TINTS[Math.floor(rand() * 2)],
            })
          }
        }
        return place(box(w, 0.12, d), [x, 0.06, z])
      }),
    )
    const curbs = merge(
      layout.flowerBeds.flatMap(({ centre: [x, z], size: [w, d] }) => [
        place(box(w + 0.3, 0.18, 0.15), [x, 0.09, z - d / 2 - 0.07]),
        place(box(w + 0.3, 0.18, 0.15), [x, 0.09, z + d / 2 + 0.07]),
        place(box(0.15, 0.18, d), [x - w / 2 - 0.07, 0.09, z]),
        place(box(0.15, 0.18, d), [x + w / 2 + 0.07, 0.09, z]),
      ]),
    )
    return { beds: { mulch: beds, curbs }, flowers }
  }, [layout])

  return (
    <>
      <ModelInstances
        url={ORNAMENT_URLS.lampLantern}
        transforms={layout.lamps}
        fallback={
          <>
            <Instanced geometry={lamp.iron} material={m.ironBlack} transforms={layout.lamps} castShadow />
            <Instanced geometry={lamp.glass} material={m.lampGlass} transforms={layout.lamps} />
          </>
        }
      />
      <Instanced geometry={bench} material={m.benchConcrete} transforms={layout.benches} castShadow />
      <mesh geometry={beds.mulch} material={m.mulch} receiveShadow />
      <mesh geometry={beds.curbs} material={m.limestone} receiveShadow castShadow />
      <Trees trees={flowers} />
    </>
  )
}

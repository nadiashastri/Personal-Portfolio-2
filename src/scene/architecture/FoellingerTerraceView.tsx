import { useEffect, useMemo } from 'react'
import { createRandom } from '../../lib/random'
import { getMaterials } from '../materials/materials'
import { Trees } from '../vegetation/Trees'
import type { TreeInstance } from '../vegetation/treeLayout'
import { box, merge, place } from './geometry'
import { createBaluster } from './parts/classical'
import { Instanced, type Transform } from './parts/Instanced'
import { ModelInstances, ORNAMENT_URLS } from './parts/ornaments'
import { CURVE_START_Z, FORECOURT } from '../../config/foellingerForecourt'
import { balustradeLayout, bedRow, createBed, createCurvedRails, createTerraceStone } from './foellingerTerrace'

const FLOWER_TINTS = { orange: ['#ff5a1a', '#f26b1d', '#e8501c'], red: ['#d8341f', '#c92a1c'], white: ['#f4f1ea', '#ebe6dc'] }
const GRASS_TINTS = ['#9aab5c', '#a7b766', '#8fa253', '#b2bd73']

/**
 * Planting that follows the curve: an uneven band of ornamental grasses
 * against the wall, then low orange, red and white flowers along the front
 * edge in drifts rather than a regular pattern. Kept below the balustrade so
 * the forecourt's shape stays readable.
 */
function generatePlanting(): TreeInstance[] {
  const rand = createRandom(1915)
  const plants: TreeInstance[] = []
  const { inner, outer } = FORECOURT.bed
  const scatter = (offset: number, spacing: () => number, make: (s: number) => Omit<TreeInstance, 'position' | 'rotation'>) => {
    const row = bedRow(offset)
    for (let s = rand() * 0.4; s < row.length - 0.2; s += spacing()) {
      const jitter = (rand() - 0.5) * 0.25
      const p = row.at(s)
      plants.push({ ...make(s), position: [p.x + p.nx * jitter, p.z + p.nz * jitter], rotation: rand() * Math.PI * 2 })
    }
  }

  for (const [offset, scaleBase] of [[inner + 0.45, 0.74], [inner + 0.95, 0.6]] as const) {
    scatter(offset, () => 0.48 + rand() * 0.35, () => ({
      kind: rand() < 0.08 ? 'shrub' : 'ornamentalGrass',
      scale: scaleBase * (0.8 + rand() * 0.45),
      tint: GRASS_TINTS[Math.floor(rand() * GRASS_TINTS.length)],
    }))
  }
  for (const offset of [outer - 0.85, outer - 0.5, outer - 0.2]) {
    scatter(offset, () => 0.32 + rand() * 0.14, (s) => {
      const drift = Math.sin(s * 0.21 + offset) + Math.sin(s * 0.53) * 0.6
      const palette = drift > 0.95 ? FLOWER_TINTS.white : drift < -0.9 ? FLOWER_TINTS.red : FLOWER_TINTS.orange
      return { kind: 'flowers', scale: 0.55 + rand() * 0.3, tint: palette[Math.floor(rand() * palette.length)] }
    })
  }
  return plants
}

const balusterFallback = createBaluster(0.7)

/**
 * Foellinger's semicircular forecourt: a D-shaped raised platform with a
 * curved stone retaining wall on a foundation course, overhanging coping, a
 * continuous curved balustrade, side stairs in the straight shoulders, and
 * the planted bed hugging the curve.
 */
export function FoellingerTerrace() {
  const m = getMaterials()
  const stone = useMemo(createTerraceStone, [])
  const rails = useMemo(() => merge(createCurvedRails()), [])
  const bed = useMemo(createBed, [])
  const layout = useMemo(balustradeLayout, [])
  const planting = useMemo(generatePlanting, [])

  // Side stairs fill each straight shoulder, stepping down outward to the walk.
  const sideStairs = useMemo(() => {
    const { steps, run } = FORECOURT.sideStairs
    const rise = FORECOURT.height / steps
    const hw = FORECOURT.width / 2
    const from = FORECOURT.back + 0.6
    const to = CURVE_START_Z - 0.6
    const parts = []
    for (const side of [-1, 1]) {
      for (let i = 1; i < steps; i++) {
        const top = FORECOURT.height - i * rise
        parts.push(place(box(run, top, to - from), [side * (hw + (i - 0.5) * run), top / 2, (from + to) / 2]))
      }
      // Low cheek walls framing each flight.
      for (const z of [from - 0.2, to + 0.2]) {
        parts.push(place(box(steps * run, FORECOURT.height + 0.1, 0.4), [side * (hw + (steps * run) / 2 - 0.1), (FORECOURT.height + 0.1) / 2, z]))
      }
    }
    return merge(parts)
  }, [])

  // Larger piers where the curved balustrade ends and at the back corners, framing the side stairs.
  const endPiers = useMemo<Transform[]>(() => {
    const x = FORECOURT.width / 2 - FORECOURT.rail.inset
    return ([-1, 1] as const).flatMap((side) => [
      { position: [side * x, FORECOURT.height, CURVE_START_Z], rotationY: side * (Math.PI / 2), scale: [1.25, 1.12, 1.25] },
      { position: [side * x, FORECOURT.height, FORECOURT.back + 0.25], rotationY: side * (Math.PI / 2), scale: [1.1, 1.05, 1.1] },
    ])
  }, [])

  useEffect(
    () => () => {
      for (const g of [stone.foundation, stone.wall, stone.coping, rails, bed, sideStairs]) g.dispose()
    },
    [stone, rails, bed, sideStairs],
  )

  return (
    <group>
      <mesh geometry={stone.foundation} material={m.limestone} castShadow receiveShadow />
      <mesh geometry={stone.wall} material={m.limestone} castShadow receiveShadow />
      <mesh geometry={stone.coping} material={m.terraceCoping} castShadow receiveShadow />
      <mesh geometry={sideStairs} material={m.terraceCoping} castShadow receiveShadow />

      {/* Curved balustrade */}
      <mesh geometry={rails} material={m.terraceCoping} castShadow receiveShadow />
      <ModelInstances
        url={ORNAMENT_URLS.baluster}
        transforms={layout.balusters}
        fallback={<Instanced geometry={balusterFallback} material={m.stoneTrim} transforms={layout.balusters} castShadow />}
      />
      <ModelInstances url={ORNAMENT_URLS.balustradePost} transforms={[...layout.posts, ...endPiers]} fallback={null} />

      {/* Planted bed following the same curve */}
      <mesh geometry={bed} material={m.mulch} receiveShadow />
      <Trees trees={planting} />
    </group>
  )
}

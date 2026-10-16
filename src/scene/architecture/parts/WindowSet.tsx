import { useMemo } from 'react'
import { getMaterials } from '../../materials/materials'
import { Instanced, type Transform } from './Instanced'
import { createWindowGeometries, type WindowSpec } from './windows'

interface WindowSetProps {
  spec: WindowSpec
  /** Bottom-centre of each opening on the wall face; rotationY turns the window to its wall. */
  placements: readonly Transform[]
  frameColor?: 'white' | 'stone'
}

/** Glass tints: most windows reflect the sky, a few show drawn blinds or warm curtains. */
const GLASS_TINTS = ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#d8d2c4', '#c4b496']

/** Renders every copy of one window design with three instanced draw calls. */
export function WindowSet({ spec, placements, frameColor = 'white' }: WindowSetProps) {
  const geometries = useMemo(
    () => createWindowGeometries(spec),
    // Specs are small literal objects; rebuild only when their contents change.
    [JSON.stringify(spec)],
  )
  const m = getMaterials()
  const glassTransforms = useMemo(
    () =>
      placements.map((p, i) => ({
        ...p,
        color: GLASS_TINTS[(i * 7 + Math.round(p.position[0] * 3 + p.position[1])) % GLASS_TINTS.length],
      })),
    [placements],
  )

  return (
    <>
      <Instanced geometry={geometries.glass} material={m.glass} transforms={glassTransforms} />
      <Instanced
        geometry={geometries.frame}
        material={frameColor === 'white' ? m.whitePaint : m.stoneTrim}
        transforms={placements}
      />
      {geometries.stone && <Instanced geometry={geometries.stone} material={m.stoneTrim} transforms={placements} />}
    </>
  )
}

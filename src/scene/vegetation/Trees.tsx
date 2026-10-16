import { useMemo } from 'react'
import { getMaterials } from '../materials/materials'
import { Instanced, type Transform } from '../architecture/parts/Instanced'
import { getFoliageMaterial } from './foliageMaterial'
import { createCanopyGeometry, createTrunkGeometry, type CanopySpec } from './treeGeometry'
import type { TreeInstance } from './treeLayout'
import { TREE_TYPES, type TreeKind } from './treeTypes'

interface TreesProps {
  trees: readonly TreeInstance[]
}

/** All trees and shrubs: two instanced draw calls per tree type. */
export function Trees({ trees }: TreesProps) {
  const groups = useMemo(() => {
    const byKind = new Map<TreeKind, TreeInstance[]>()
    for (const t of trees) byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t])
    return [...byKind].map(([kind, list]) => {
      const type = TREE_TYPES[kind]
      const transforms: Transform[] = list.map((t) => ({
        position: [t.position[0], 0, t.position[1]],
        rotationY: t.rotation,
        scale: [t.scale, t.scale, t.scale],
        color: t.tint,
      }))
      return {
        kind,
        transforms,
        trunk: 'noTrunk' in type && type.noTrunk ? null : createTrunkGeometry(type.trunk),
        canopy: createCanopyGeometry(type.canopy),
        texture: (type.canopy as CanopySpec).texture ?? 'leaves',
      }
    })
  }, [trees])

  const bark = getMaterials().bark

  return (
    <>
      {groups.map((g) => (
        <group key={g.kind}>
          {g.trunk && <Instanced geometry={g.trunk} material={bark} transforms={g.transforms} castShadow />}
          <Instanced geometry={g.canopy} material={getFoliageMaterial(g.texture)} transforms={g.transforms} castShadow />
        </group>
      ))}
    </>
  )
}

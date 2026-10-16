import { useEffect } from 'react'
import type { BufferGeometry, Material } from 'three'
import { merge } from './geometry'
import type { Transform } from './parts/Instanced'
import type { WindowSpec } from './parts/windows'

/**
 * Collects a building's static geometry grouped by material, then merges each
 * group into a single mesh — so a whole building is a handful of draw calls.
 */
export class PartList {
  private groups = new Map<Material, BufferGeometry[]>()
  windows: { spec: WindowSpec; placements: Transform[] }[] = []

  add(material: Material, ...geometries: BufferGeometry[]) {
    const list = this.groups.get(material) ?? []
    list.push(...geometries)
    this.groups.set(material, list)
    return this
  }

  addWindows(spec: WindowSpec, placements: Transform[]) {
    this.windows.push({ spec, placements })
    return this
  }

  build() {
    return [...this.groups].map(([material, geometries]) => ({ material, geometry: merge(geometries) }))
  }
}

export type BuiltParts = ReturnType<PartList['build']>

/** Renders merged parts; frees GPU geometry when the building unmounts. */
export function Parts({ parts }: { parts: BuiltParts }) {
  useEffect(() => () => parts.forEach((p) => p.geometry.dispose()), [parts])
  return (
    <>
      {parts.map(({ material, geometry }, i) => (
        <mesh key={i} geometry={geometry} material={material} castShadow receiveShadow />
      ))}
    </>
  )
}

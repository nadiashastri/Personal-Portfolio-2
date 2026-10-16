import { useLayoutEffect, useRef } from 'react'
import { Color, Euler, Matrix4, Quaternion, Vector3, type BufferGeometry, type InstancedMesh, type Material } from 'three'

export interface Transform {
  position: readonly [number, number, number]
  rotationY?: number
  scale?: readonly [number, number, number]
  color?: string
}

interface InstancedProps {
  geometry: BufferGeometry
  material: Material
  transforms: readonly Transform[]
  castShadow?: boolean
  receiveShadow?: boolean
}

/** One draw call for many copies of a mesh (windows, columns, balusters, dentils…). */
export function Instanced({ geometry, material, transforms, castShadow = false, receiveShadow = true }: InstancedProps) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new Matrix4()
    const q = new Quaternion()
    const e = new Euler()
    const color = new Color()
    transforms.forEach((t, i) => {
      q.setFromEuler(e.set(0, t.rotationY ?? 0, 0))
      m.compose(new Vector3(...t.position), q, new Vector3(...(t.scale ?? [1, 1, 1])))
      mesh.setMatrixAt(i, m)
      if (t.color) mesh.setColorAt(i, color.set(t.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [transforms])

  if (transforms.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, transforms.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}

import { useFrame } from '@react-three/fiber'
import { windTime } from '../shaders/patches'
import type { TreeInstance } from './treeLayout'
import { Trees } from './Trees'

/** Trees and shrubs placed around the Quad; also drives the shared wind clock. */
export function Vegetation({ plants }: { plants: readonly TreeInstance[] }) {
  useFrame((_, dt) => {
    windTime.value += dt
  })
  return <Trees trees={plants} />
}

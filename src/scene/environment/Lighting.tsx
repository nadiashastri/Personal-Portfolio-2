import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type DirectionalLight } from 'three'
import { PALETTE, SUN_DIRECTION } from '../../config/world'

/** Everything that casts shadows lies inside this box (whole campus incl. backdrop trees). */
const SHADOW_BOUNDS = { min: new Vector3(-150, 0, -215), max: new Vector3(150, 40, 215) }
const SUN_DISTANCE = 300
/** Frames to keep re-rendering the shadow map while instanced meshes settle. */
const SHADOW_WARMUP_FRAMES = 12
/** Phones and tablets get a smaller (blurrier, cheaper) shadow map. */
const SHADOW_MAP_SIZE =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 2048 : 4096

/**
 * Warm afternoon sun plus soft sky fill. Nothing in the world moves (apart
 * from leaves swaying a few centimetres), so the shadow map is rendered once
 * for the whole campus and then frozen — full-scene shadows at almost no
 * per-frame cost.
 */
export function Lighting() {
  const sun = useRef<DirectionalLight>(null)
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)

  useLayoutEffect(() => {
    const light = sun.current
    if (!light) return
    const dir = new Vector3(...SUN_DIRECTION).normalize()
    light.position.copy(dir).multiplyScalar(SUN_DISTANCE)
    light.target.position.set(0, 0, 0)
    light.target.updateMatrixWorld()
    light.updateMatrixWorld()

    // Fit the orthographic shadow camera tightly around the campus, in light space.
    const cam = light.shadow.camera
    cam.position.copy(light.position)
    cam.lookAt(0, 0, 0)
    cam.updateMatrixWorld()
    const inv = cam.matrixWorldInverse
    const p = new Vector3()
    let [minX, maxX, minY, maxY, minZ, maxZ] = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity]
    for (const x of [SHADOW_BOUNDS.min.x, SHADOW_BOUNDS.max.x])
      for (const y of [SHADOW_BOUNDS.min.y, SHADOW_BOUNDS.max.y])
        for (const z of [SHADOW_BOUNDS.min.z, SHADOW_BOUNDS.max.z]) {
          p.set(x, y, z).applyMatrix4(inv)
          minX = Math.min(minX, p.x)
          maxX = Math.max(maxX, p.x)
          minY = Math.min(minY, p.y)
          maxY = Math.max(maxY, p.y)
          minZ = Math.min(minZ, p.z)
          maxZ = Math.max(maxZ, p.z)
        }
    Object.assign(cam, { left: minX, right: maxX, bottom: minY, top: maxY, near: -maxZ - 10, far: -minZ + 10 })
    cam.updateProjectionMatrix()

    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
  }, [gl])

  useFrame(() => {
    if (frames.current < SHADOW_WARMUP_FRAMES) {
      frames.current++
      gl.shadowMap.needsUpdate = true
    }
  })

  return (
    <>
      <hemisphereLight args={['#d4e6ff', '#8c8471', 0.55]} />
      <directionalLight
        ref={sun}
        color={PALETTE.sun}
        intensity={2.9}
        castShadow
        shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.06}
        shadow-radius={3}
      />
    </>
  )
}

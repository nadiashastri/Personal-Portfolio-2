import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type DirectionalLight, type HemisphereLight } from 'three'
import { PALETTE } from '../../config/world'
import { blendColor, blendNumber, blendSunDirection, timeOfDay } from '../../lib/timeOfDay'

/** Everything that casts shadows lies inside this box (whole campus incl. backdrop trees). */
const SHADOW_BOUNDS = { min: new Vector3(-150, 0, -215), max: new Vector3(150, 40, 215) }
const SUN_DISTANCE = 300
/** Frames to keep re-rendering the shadow map while instanced meshes settle. */
const SHADOW_WARMUP_FRAMES = 12
/** Phones and tablets get a smaller (blurrier, cheaper) shadow map. */
const SHADOW_MAP_SIZE =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 2048 : 4096

const corner = new Vector3()

/** Points the sun along `dir` and fits its orthographic shadow camera tightly around the campus. */
function aimSun(light: DirectionalLight, dir: Vector3) {
  light.position.copy(dir).multiplyScalar(SUN_DISTANCE)
  light.target.position.set(0, 0, 0)
  light.target.updateMatrixWorld()
  light.updateMatrixWorld()

  const cam = light.shadow.camera
  cam.position.copy(light.position)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld()
  const inv = cam.matrixWorldInverse
  let [minX, maxX, minY, maxY, minZ, maxZ] = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity]
  for (const x of [SHADOW_BOUNDS.min.x, SHADOW_BOUNDS.max.x])
    for (const y of [SHADOW_BOUNDS.min.y, SHADOW_BOUNDS.max.y])
      for (const z of [SHADOW_BOUNDS.min.z, SHADOW_BOUNDS.max.z]) {
        corner.set(x, y, z).applyMatrix4(inv)
        minX = Math.min(minX, corner.x)
        maxX = Math.max(maxX, corner.x)
        minY = Math.min(minY, corner.y)
        maxY = Math.max(maxY, corner.y)
        minZ = Math.min(minZ, corner.z)
        maxZ = Math.max(maxZ, corner.z)
      }
  Object.assign(cam, { left: minX, right: maxX, bottom: minY, top: maxY, near: -maxZ - 10, far: -minZ + 10 })
  cam.updateProjectionMatrix()
}

/**
 * Sun plus soft sky fill, blended between Daylight and Sunset (config/lighting.ts).
 * Nothing in the world moves (apart from leaves swaying a few centimetres), so
 * the campus-wide shadow map is rendered once and frozen — it is only redrawn
 * while the sun is actually moving during a Daylight ↔ Sunset transition.
 */
export function Lighting() {
  const sun = useRef<DirectionalLight>(null)
  const sky = useRef<HemisphereLight>(null)
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)
  const seen = useRef(-1)
  const dir = useRef(new Vector3())

  useLayoutEffect(() => {
    const light = sun.current
    if (!light) return
    aimSun(light, blendSunDirection(timeOfDay.value, dir.current))
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
  }, [gl])

  useFrame(() => {
    if (frames.current < SHADOW_WARMUP_FRAMES) {
      frames.current++
      gl.shadowMap.needsUpdate = true
    }
    const light = sun.current
    const hemi = sky.current
    if (!light || !hemi || seen.current === timeOfDay.version) return
    seen.current = timeOfDay.version
    const t = timeOfDay.value
    aimSun(light, blendSunDirection(t, dir.current))
    blendColor('sunColor', t, light.color)
    light.intensity = blendNumber('sunIntensity', t)
    blendColor('ambientSky', t, hemi.color)
    blendColor('ambientGround', t, hemi.groundColor)
    hemi.intensity = blendNumber('ambientIntensity', t)
    gl.shadowMap.needsUpdate = true
  })

  return (
    <>
      <hemisphereLight ref={sky} args={['#d4e6ff', '#8c8471', 0.55]} />
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

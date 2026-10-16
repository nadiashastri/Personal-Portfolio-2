import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  MeshStandardMaterial,
  Vector2,
  type Texture,
} from 'three'
import { createRandom } from '../../lib/random'
import { GROUND_UV_GLSL } from '../ground/groundMaps'
import { NOISE_GLSL } from '../shaders/noise'
import { keepNormalsOnBackfaces, windTime } from '../shaders/patches'

/** Side of the square tile of blades that travels with the player. */
const TILE = 30

/** One tapered blade: 3 segments + tip, 1 unit tall before scaling. */
function bladeGeometry() {
  const segs = 3
  const pos: number[] = []
  for (let i = 0; i < segs; i++) {
    const t = i / segs
    const w = 0.5 * (1 - t * 0.85)
    pos.push(-w, t, 0, w, t, 0)
  }
  pos.push(0, 1, 0)
  const index: number[] = []
  for (let i = 0; i < segs - 1; i++) {
    const a = i * 2
    index.push(a, a + 1, a + 3, a, a + 3, a + 2)
  }
  const last = (segs - 1) * 2
  index.push(last, last + 1, segs * 2)
  return { position: new Float32Array(pos), index }
}

function createGrass(count: number, paving: Texture) {
  const geometry = new InstancedBufferGeometry()
  const blade = bladeGeometry()
  geometry.setAttribute('position', new BufferAttribute(blade.position, 3))
  geometry.setIndex(blade.index)
  geometry.instanceCount = count

  const rand = createRandom(5)
  const offsets = new Float32Array(count * 2)
  const params = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    offsets[i * 2] = rand() * TILE
    offsets[i * 2 + 1] = rand() * TILE
    params.set([0.6 + rand() * 0.8, rand() * Math.PI * 2, rand(), rand()], i * 4)
  }
  geometry.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 2))
  geometry.setAttribute('aParams', new InstancedBufferAttribute(params, 4))

  const uniforms = { uCamera: { value: new Vector2() }, uPaving: { value: paving }, uTime: windTime }
  const material = new MeshStandardMaterial({ side: DoubleSide, roughness: 0.9 })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec2 uCamera;
        uniform sampler2D uPaving;
        uniform float uTime;
        attribute vec2 aOffset;
        attribute vec4 aParams;
        varying vec3 vBladeColor;
        ${NOISE_GLSL}
        ${GROUND_UV_GLSL}`,
      )
      // Lit like the lawn underneath, so blades never look like a separate layer.
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        // Wrap each blade into a tile that always surrounds the camera.
        vec2 base = uCamera + mod(aOffset - uCamera + ${TILE / 2}.0, ${TILE}.0) - ${TILE / 2}.0;
        float dist = length(base - uCamera);
        float fade = 1.0 - smoothstep(${(TILE * 0.3).toFixed(1)}, ${(TILE * 0.48).toFixed(1)}, dist);
        float paved = texture2D(uPaving, groundUv(base)).r;
        float clump = 0.55 + 0.9 * valueNoise(base * 0.7);
        float h = 0.13 * aParams.x * clump * fade * (1.0 - smoothstep(0.05, 0.3, paved));

        float t = position.y;
        float angle = aParams.y;
        vec2 across = vec2(cos(angle), sin(angle));
        vec2 lean = vec2(-across.y, across.x) * (0.25 + aParams.z * 0.35);
        float gust = sin(uTime * 1.6 + base.x * 0.35 + base.y * 0.22) * 0.5 + 0.5;
        vec2 wind = vec2(0.8, 0.4) * (0.06 + 0.12 * gust);
        vec2 bend = (lean * 0.35 + wind) * t * t * h * 2.5;

        vec3 transformed = vec3(
          base.x + across.x * position.x * 0.028 + bend.x,
          t * h,
          base.y + across.y * position.x * 0.028 + bend.y
        );
        // Averages to the textured lawn's brightness so the blade band has no visible edge.
        vBladeColor = lawnColor(base) * mix(0.62, 1.04, t) * (0.9 + aParams.w * 0.16);
        `,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBladeColor;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = vBladeColor;')
    keepNormalsOnBackfaces(shader)
  }
  return { geometry, material, uniforms }
}

interface GrassFieldProps {
  paving: Texture
  count: number
}

/**
 * Tens of thousands of instanced grass blades in a tile that follows the
 * player, fading out by ~14 m where the textured lawn takes over. Short and
 * fine, like a mown campus lawn. Blades
 * skip anything paved, using the same map as the ground shader.
 */
export function GrassField({ paving, count }: GrassFieldProps) {
  const grass = useMemo(() => createGrass(count, paving), [count, paving])
  useEffect(() => () => (grass.geometry.dispose(), grass.material.dispose()), [grass])
  useFrame(({ camera }) => grass.uniforms.uCamera.value.set(camera.position.x, camera.position.z))

  return <mesh geometry={grass.geometry} material={grass.material} frustumCulled={false} receiveShadow />
}

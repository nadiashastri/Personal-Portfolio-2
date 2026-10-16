import { DoubleSide, MeshStandardMaterial } from 'three'
import { createGrassClumpTexture, createLeafClusterTexture } from '../materials/textures'
import { keepNormalsOnBackfaces, windTime } from '../shaders/patches'

const materials = new Map<'leaves' | 'blades', MeshStandardMaterial>()

/**
 * Leaf-card material: alpha-tested clusters, volume normals on both sides,
 * and a gentle wind sway that grows towards the outer, upper leaves.
 * Each tree's instance position offsets the phase so trees don't move in lockstep.
 */
export function getFoliageMaterial(texture: 'leaves' | 'blades' = 'leaves') {
  const cached = materials.get(texture)
  if (cached) return cached
  const material = new MeshStandardMaterial({
    map: texture === 'blades' ? createGrassClumpTexture() : createLeafClusterTexture(),
    alphaTest: 0.42,
    // Smooths alpha-tested leaf edges using MSAA samples.
    alphaToCoverage: true,
    side: DoubleSide,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.7,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 treePos = instanceMatrix[3].xz;
        #else
          vec2 treePos = vec2(0.0);
        #endif
        float phase = uTime * 1.3 + treePos.x * 0.21 + treePos.y * 0.17;
        float reach = smoothstep(2.0, 12.0, position.y) * 0.6 + length(position.xz) * 0.04;
        transformed.x += sin(phase + position.y * 0.35) * 0.08 * reach;
        transformed.z += cos(phase * 0.8 + position.x * 0.3) * 0.06 * reach;
        transformed.y += sin(phase * 1.7 + position.x) * 0.025 * reach;
        `,
      )
    keepNormalsOnBackfaces(shader)
  }
  materials.set(texture, material)
  return material
}

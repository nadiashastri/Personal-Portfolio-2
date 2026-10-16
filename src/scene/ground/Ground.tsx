import { useEffect, useMemo } from 'react'
import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { createRandom } from '../../lib/random'
import { NOISE_GLSL } from '../shaders/noise'
import { GROUND_UV_GLSL } from './groundMaps'

const GROUND_SIZE = 900

/** Tiny tileable texture of grass-blade strokes for close-up lawn detail. */
function createBladeTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(200,200,200)'
  ctx.fillRect(0, 0, size, size)
  const rand = createRandom(11)
  for (let i = 0; i < 2200; i++) {
    const x = rand() * size
    const y = rand() * size
    const len = 3 + rand() * 7
    const lean = (rand() - 0.5) * 4
    const v = Math.round(150 + rand() * 105)
    ctx.strokeStyle = `rgb(${v},${v},${v})`
    ctx.lineWidth = 0.8 + rand()
    // Draw wrapped copies so the tile stays seamless.
    for (const [ox, oy] of [[0, 0], [-size, 0], [0, -size], [-size, -size]]) {
      ctx.beginPath()
      ctx.moveTo(x + ox, y + oy)
      ctx.lineTo(x + ox + lean, y + oy - len)
      ctx.stroke()
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function createGroundMaterial(paving: Texture, detail: Texture) {
  const blades = createBladeTexture()

  const material = new MeshStandardMaterial({ roughness: 0.95, metalness: 0 })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPaving = { value: paving }
    shader.uniforms.uDetail = { value: detail }
    shader.uniforms.uBlades = { value: blades }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGroundPos;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvGroundPos = (modelMatrix * vec4(transformed, 1.0)).xz;',
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vGroundPos;
        uniform sampler2D uPaving;
        uniform sampler2D uDetail;
        uniform sampler2D uBlades;
        ${NOISE_GLSL}
        ${GROUND_UV_GLSL}`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec2 p = vGroundPos;
        vec2 guv = groundUv(p);
        vec4 paving = texture2D(uPaving, guv);
        // Direction is fetched unfiltered so overlapping walks don't blend into bogus angles;
        // dividing by coverage (R) undoes canvas anti-aliasing at slab edges.
        vec4 pavingTexel = texelFetch(uPaving, ivec2(guv * vec2(textureSize(uPaving, 0))), 0);
        vec4 detail = texture2D(uDetail, guv);

        // --- Lawn
        vec3 lawn = lawnColor(p);
        float bladeA = texture2D(uBlades, p * 0.55).r;
        float bladeB = texture2D(uBlades, p * 0.13 + 0.37).r;
        lawn *= 0.72 + 0.42 * bladeA * (0.6 + 0.4 * bladeB);
        lawn = mix(lawn, vec3(0.36, 0.36, 0.2), clamp(detail.g, 0.0, 1.0) * 0.45);

        // --- Concrete walks with transverse expansion joints every 1.5 m
        float angle = clamp(pavingTexel.b / max(pavingTexel.r, 0.01), 0.0, 1.0) * PI;
        vec2 dir = vec2(cos(angle), sin(angle));
        float along = dot(p, dir) / 1.5;
        float jointDist = abs(fract(along) - 0.5);
        float jointWidth = max(fwidth(along) * 0.9, 0.012);
        float joint = smoothstep(0.5 - jointWidth, 0.5, jointDist);
        // Fade joints out before they alias in the distance.
        joint *= 1.0 - smoothstep(0.08, 0.25, fwidth(along));
        // Warm tan concrete, like the Quad's walks.
        vec3 concrete = vec3(0.72, 0.58, 0.40) * (0.9 + 0.1 * valueNoise(p * 2.5) + 0.05 * valueNoise(p * 19.0));
        concrete *= 1.0 - joint * 0.28;
        // Darker rim where the slab meets the lawn reads as a subtle curb shadow.
        concrete *= mix(0.86, 1.0, smoothstep(0.55, 0.95, paving.r));

        // --- Plaza pavers: 60 cm stone grid
        vec2 tile = abs(fract(p / 0.6) - 0.5);
        float tileLine = 1.0 - smoothstep(0.46, 0.49, max(tile.x, tile.y));
        vec3 pavers = vec3(0.72, 0.66, 0.58) * (0.88 + 0.16 * hash12(floor(p / 0.6)));
        pavers *= mix(0.78, 1.0, tileLine);
        vec3 paved = mix(concrete, pavers, step(0.5, paving.g));

        float pavedMask = smoothstep(0.4, 0.6, paving.r);
        vec3 groundColor = mix(lawn, paved, pavedMask);

        // Soft ambient occlusion under trees and along buildings.
        groundColor *= 1.0 - clamp(detail.r, 0.0, 1.0) * 0.38;

        diffuseColor.rgb *= groundColor;
        `,
      )
      // Matte concrete: a glossier value picks up the blue sky and cools the tan.
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.97, 0.96, pavedMask);',
      )
  }
  const dispose = () => {
    material.dispose()
    blades.dispose()
  }
  return { material, dispose }
}

interface GroundProps {
  /** Paving mask from createPavingMap(). */
  paving: Texture
  /** Shade / wear map from createDetailMap(). */
  detail: Texture
}

/** Lawn, sidewalks and plazas in a single draw call, driven by painted ground maps. */
export function Ground({ paving, detail }: GroundProps) {
  const { material, dispose } = useMemo(() => createGroundMaterial(paving, detail), [paving, detail])
  useEffect(() => dispose, [dispose])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={material} receiveShadow>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
    </mesh>
  )
}

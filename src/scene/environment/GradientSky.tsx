import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, Vector3, type Mesh } from 'three'
import { PALETTE, SUN_DIRECTION } from '../../config/world'
import { blendColor, blendNumber, blendSunDirection, timeOfDay } from '../../lib/timeOfDay'
import { NOISE_GLSL } from '../shaders/noise'

const vertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDirection;
  uniform float uTime;
  // Sunset additions — all neutral (0 / equal colours) in daylight.
  uniform vec3 uBand;
  uniform float uBandAmount;
  uniform vec3 uGlow;
  uniform float uGlowAmount;
  uniform vec3 uCloudNear;
  uniform vec3 uCloudFar;
  uniform vec3 uCloudShade;
  uniform float uCloudCover;
  varying vec3 vDirection;
  ${NOISE_GLSL}

  void main() {
    vec3 dir = normalize(vDirection);
    float h = max(dir.y, 0.0);
    // Wide, soft blend from a pale horizon band into the zenith blue.
    vec3 color = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.55, h), 0.75));

    // A soft band low in the sky (the pink of a sunset), fading out at the horizon itself
    // so the sky still meets the fog seamlessly.
    float band = smoothstep(0.0, 0.08, h) * (1.0 - smoothstep(0.12, 0.42, h));
    color = mix(color, uBand, band * uBandAmount);

    // Warm glow along the horizon on the sun's side of the sky.
    vec2 sunH = normalize(uSunDirection.xz + vec2(1e-5));
    vec2 dirH = normalize(dir.xz + vec2(1e-5));
    float facing = max(dot(dirH, sunH), 0.0);
    float glow = (pow(facing, 2.5) * 0.75 + pow(facing, 12.0) * 0.5) * smoothstep(0.0, 0.035, h) * (1.0 - smoothstep(0.03, 0.34, h));
    color = mix(color, uGlow, clamp(glow * uGlowAmount, 0.0, 1.0));

    float sunAmount = max(dot(dir, uSunDirection), 0.0);
    color += uSun * (pow(sunAmount, 8.0) * 0.18 + pow(sunAmount, 300.0) * 1.2);

    // Fair-weather cumulus: fbm projected onto a flat cloud deck.
    if (dir.y > 0.0) {
      vec2 deck = dir.xz / (dir.y + 0.1) * 0.9 + vec2(uTime * 0.004, uTime * 0.002);
      float shape = fbm(deck * 1.1) * 0.75 + fbm(deck * 3.3 + 7.0) * 0.25;
      float cover = smoothstep(0.52 - uCloudCover, 0.72 - uCloudCover, shape) * smoothstep(0.02, 0.2, dir.y);
      float light = 0.82 + 0.18 * smoothstep(0.45, 0.75, fbm(deck * 2.0 + uSunDirection.xz));
      // Clouds facing the sun take its colour; the rest of each cloud catches the sky's.
      vec3 cloudLit = mix(uCloudFar, uCloudNear, pow(sunAmount, 2.0));
      vec3 cloud = mix(uCloudShade, cloudLit, light) * (1.0 + pow(sunAmount, 6.0) * 0.25);
      color = mix(color, cloud, cover * 0.92);
    }
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

interface GradientSkyProps {
  /** Keep the dome centred on the camera (off when rendering the environment map). */
  follow?: boolean
}

/**
 * Stylised sky dome with drifting clouds. Its horizon colour equals the fog
 * colour, so distant ground and tree lines melt seamlessly into the sky.
 */
export function GradientSky({ follow = true }: GradientSkyProps) {
  const mesh = useRef<Mesh>(null)
  const uniforms = useMemo(
    () => ({
      uTop: { value: new Color(PALETTE.skyTop) },
      uHorizon: { value: new Color(PALETTE.fog) },
      uSun: { value: new Color(PALETTE.sun) },
      uSunDirection: { value: new Vector3(...SUN_DIRECTION).normalize() },
      uTime: { value: 0 },
      uBand: { value: new Color() },
      uBandAmount: { value: 0 },
      uGlow: { value: new Color() },
      uGlowAmount: { value: 0 },
      uCloudNear: { value: new Color() },
      uCloudFar: { value: new Color() },
      uCloudShade: { value: new Color() },
      uCloudCover: { value: 0 },
    }),
    [],
  )
  const seen = useRef(-1)

  useFrame(({ camera }, dt) => {
    uniforms.uTime.value += dt
    if (follow) mesh.current?.position.copy(camera.position)
    // Follow the Daylight ↔ Sunset blend (only when it changes).
    if (seen.current !== timeOfDay.version) {
      seen.current = timeOfDay.version
      const t = timeOfDay.value
      blendColor('skyTop', t, uniforms.uTop.value)
      blendColor('skyHorizon', t, uniforms.uHorizon.value)
      blendColor('sunDiscColor', t, uniforms.uSun.value)
      blendSunDirection(t, uniforms.uSunDirection.value)
      blendColor('skyBand', t, uniforms.uBand.value)
      uniforms.uBandAmount.value = blendNumber('skyBandAmount', t)
      blendColor('horizonGlow', t, uniforms.uGlow.value)
      uniforms.uGlowAmount.value = blendNumber('horizonGlowAmount', t)
      blendColor('cloudLitNearSun', t, uniforms.uCloudNear.value)
      blendColor('cloudLitAwayFromSun', t, uniforms.uCloudFar.value)
      blendColor('cloudShade', t, uniforms.uCloudShade.value)
      uniforms.uCloudCover.value = blendNumber('cloudCover', t)
    }
  })

  return (
    <mesh ref={mesh} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[500, 48, 24]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, Vector3, type Mesh } from 'three'
import { PALETTE, SUN_DIRECTION } from '../../config/world'
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
  varying vec3 vDirection;
  ${NOISE_GLSL}

  void main() {
    vec3 dir = normalize(vDirection);
    float h = max(dir.y, 0.0);
    // Wide, soft blend from a pale horizon band into the zenith blue.
    vec3 color = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.55, h), 0.75));
    float sunAmount = max(dot(dir, uSunDirection), 0.0);
    color += uSun * (pow(sunAmount, 8.0) * 0.18 + pow(sunAmount, 300.0) * 1.2);

    // Fair-weather cumulus: fbm projected onto a flat cloud deck.
    if (dir.y > 0.0) {
      vec2 deck = dir.xz / (dir.y + 0.1) * 0.9 + vec2(uTime * 0.004, uTime * 0.002);
      float shape = fbm(deck * 1.1) * 0.75 + fbm(deck * 3.3 + 7.0) * 0.25;
      float cover = smoothstep(0.52, 0.72, shape) * smoothstep(0.02, 0.2, dir.y);
      float light = 0.82 + 0.18 * smoothstep(0.45, 0.75, fbm(deck * 2.0 + uSunDirection.xz));
      vec3 cloud = mix(vec3(0.72, 0.76, 0.84), vec3(1.0, 0.99, 0.96), light) * (1.0 + pow(sunAmount, 6.0) * 0.25);
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
    }),
    [],
  )

  useFrame(({ camera }, dt) => {
    uniforms.uTime.value += dt
    if (follow) mesh.current?.position.copy(camera.position)
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

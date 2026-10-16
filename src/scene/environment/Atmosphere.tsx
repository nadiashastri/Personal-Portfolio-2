import { Environment, Sparkles } from '@react-three/drei'
import { PALETTE } from '../../config/world'
import { DistantTreeline } from './DistantTreeline'
import { GradientSky } from './GradientSky'

/**
 * Sky, haze and ambient light: the sky dome is also baked once into an
 * environment map, which gives glass real reflections and fills shaded
 * facades with soft sky light.
 */
export function Atmosphere() {
  return (
    <>
      <GradientSky />
      <Environment resolution={256} frames={1} environmentIntensity={0.75}>
        <GradientSky follow={false} />
        {/* A warm ground bounce in the lower hemisphere of the environment. */}
        <mesh position={[0, -60, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[480, 32]} />
          <meshBasicMaterial color="#7d8a5e" />
        </mesh>
      </Environment>
      <fogExp2 attach="fog" args={[PALETTE.fog, 0.0028]} />
      <DistantTreeline />
      <Sparkles count={160} scale={[90, 6, 220]} position={[0, 3, 0]} size={1.8} speed={0.2} opacity={0.4} color="#fff4d6" noise={1} />
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Sparkles } from '@react-three/drei'
import type { FogExp2 } from 'three'
import { LIGHTING_TRANSITION_SECONDS, type LightingMode } from '../../config/lighting'
import { PALETTE } from '../../config/world'
import { blendColor, blendNumber, ease, modeTarget, timeOfDay } from '../../lib/timeOfDay'
import { DistantTreeline } from './DistantTreeline'
import { GradientSky } from './GradientSky'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Advances the Daylight ↔ Sunset blend over ~2 s (instantly with reduced
 * motion), and keeps the fog and sky-light strength in step with it.
 * Reports when a transition starts and ends, so the sky reflections are only
 * re-rendered while something is actually changing.
 */
function TimeOfDayDriver({ mode, onLiveChange }: { mode: LightingMode; onLiveChange: (live: boolean) => void }) {
  const scene = useThree((s) => s.scene)
  const progress = useRef(modeTarget(mode))
  const moving = useRef(false)
  const seen = useRef(-1)

  // Start from the current mode with no transition (e.g. on first load).
  useEffect(() => {
    timeOfDay.value = ease(progress.current)
    timeOfDay.version++
    // Mount only: later mode changes animate via the target below.
  }, [])

  useEffect(() => {
    timeOfDay.target = modeTarget(mode)
  }, [mode])

  useFrame((_, dt) => {
    const target = timeOfDay.target
    if (progress.current !== target) {
      if (!moving.current) {
        moving.current = true
        onLiveChange(true)
      }
      const step = prefersReducedMotion() ? 1 : Math.min(dt, 0.05) / LIGHTING_TRANSITION_SECONDS
      progress.current = target > progress.current ? Math.min(target, progress.current + step) : Math.max(target, progress.current - step)
      timeOfDay.value = ease(progress.current)
      timeOfDay.version++
    } else if (moving.current) {
      moving.current = false
      onLiveChange(false)
    }
    if (seen.current !== timeOfDay.version) {
      seen.current = timeOfDay.version
      const t = timeOfDay.value
      const fog = scene.fog as FogExp2 | null
      if (fog) {
        blendColor('skyHorizon', t, fog.color)
        fog.density = blendNumber('fogDensity', t)
      }
      scene.environmentIntensity = blendNumber('environmentIntensity', t)
    }
  })
  return null
}

/**
 * Sky, haze and ambient light: the sky dome is also baked into an
 * environment map, which gives glass real reflections and fills shaded
 * facades with soft sky light. The bake happens once, and again only while
 * the lighting mode is changing.
 */
export function Atmosphere({ mode = 'daylight' }: { mode?: LightingMode }) {
  const [live, setLive] = useState(false)

  return (
    <>
      <TimeOfDayDriver mode={mode} onLiveChange={setLive} />
      <GradientSky />
      <Environment resolution={256} frames={live ? Infinity : 1} environmentIntensity={blendNumber('environmentIntensity', timeOfDay.value)}>
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

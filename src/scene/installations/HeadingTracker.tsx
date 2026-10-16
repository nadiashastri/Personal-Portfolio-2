import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { headingFromYaw } from '../../lib/compass'

interface HeadingTrackerProps {
  /** SVG group holding the compass needle; rotated so it keeps pointing north. */
  needleRef?: RefObject<SVGGElement | null>
  /** Text element showing the facing direction (N, NE, …). */
  headingRef?: RefObject<HTMLElement | null>
}

/**
 * Drives the top-left compass from the camera's real orientation, writing
 * straight to the DOM (no React re-renders) and only when something changed.
 */
export function HeadingTracker({ needleRef, headingRef }: HeadingTrackerProps) {
  const dir = useMemo(() => new Vector3(), [])
  const last = useRef({ angle: NaN, cardinal: '' })
  useFrame(({ camera }) => {
    camera.getWorldDirection(dir)
    const { bearing, cardinal } = headingFromYaw(Math.atan2(-dir.x, -dir.z))
    // The needle turns opposite to the view, so it always points at north.
    const angle = Math.round(-bearing * 2) / 2
    if (angle !== last.current.angle && needleRef?.current) {
      needleRef.current.setAttribute('transform', `rotate(${angle} 32 32)`)
      last.current.angle = angle
    }
    if (cardinal !== last.current.cardinal && headingRef?.current) {
      headingRef.current.textContent = cardinal
      last.current.cardinal = cardinal
    }
  })
  return null
}

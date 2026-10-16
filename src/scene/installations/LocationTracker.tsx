import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { LOCATION_POINTS, type LocationId } from '../../config/locationZones'
import { pickInteraction } from '../../lib/interactions'

/**
 * Watches the player's actual position (walking or teleporting alike) and
 * reports the named area they're in. Runs every frame but only calls back
 * when the area changes, so React re-renders just on transitions.
 */
export function LocationTracker({ onChange }: { onChange: (id: LocationId | null) => void }) {
  const current = useRef<string | null>(null)
  useFrame(({ camera }) => {
    const next = pickInteraction(LOCATION_POINTS, camera.position.x, camera.position.z, current.current)
    if (next !== current.current) {
      current.current = next
      onChange(next as LocationId | null)
    }
  })
  return null
}

import { useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { nextInRange } from '../../lib/movement'

interface InteractionZoneProps {
  /** World XZ centre of the zone. */
  centre: readonly [number, number]
  range: { readonly enter: number; readonly exit: number }
  /** World point the on-screen prompt hangs from. */
  promptAnchor: readonly [number, number, number]
  /** DOM prompt (ui/InteractionPrompt) kept positioned over `promptAnchor`. */
  promptRef?: RefObject<HTMLDivElement | null>
  onRangeChange: (inRange: boolean) => void
}

/**
 * An invisible interaction zone: reports when the player walks in or out
 * (with hysteresis, so the prompt doesn't flicker at the edge) and keeps a
 * DOM prompt pinned to a point in the world.
 */
export function InteractionZone({ centre, range, promptAnchor, promptRef, onRangeChange }: InteractionZoneProps) {
  const inRange = useRef(false)
  const size = useThree((s) => s.size)
  const anchor = useMemo(() => new Vector3(), [])

  useFrame(({ camera }) => {
    const distance = Math.hypot(camera.position.x - centre[0], camera.position.z - centre[1])
    const next = nextInRange(distance, inRange.current, range.enter, range.exit)
    if (next !== inRange.current) {
      inRange.current = next
      onRangeChange(next)
    }
    const el = promptRef?.current
    if (el) {
      anchor.set(...promptAnchor).project(camera)
      el.style.visibility = anchor.z > 1 ? 'hidden' : 'visible'
      el.style.transform = `translate3d(${((anchor.x + 1) / 2) * size.width}px, ${((1 - anchor.y) / 2) * size.height}px, 0)`
    }
  })

  return null
}

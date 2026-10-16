import { useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { pickInteraction, type InteractionPoint } from '../../lib/interactions'

interface InteractionPointsProps {
  points: readonly (InteractionPoint & { promptY: number })[]
  /** DOM prompt (ui/InteractionPrompt) kept positioned over the active point. */
  promptRef?: RefObject<HTMLDivElement | null>
  /** Called with the nearest point in range (or null) whenever it changes. */
  onTargetChange: (id: string | null) => void
}

/**
 * A group of interaction points sharing one prompt: each frame the nearest
 * point within range becomes the target (see pickInteraction), and the
 * prompt follows it on screen.
 */
export function InteractionPoints({ points, promptRef, onTargetChange }: InteractionPointsProps) {
  const current = useRef<string | null>(null)
  const size = useThree((s) => s.size)
  const anchor = useMemo(() => new Vector3(), [])

  useFrame(({ camera }) => {
    const next = pickInteraction(points, camera.position.x, camera.position.z, current.current)
    if (next !== current.current) {
      current.current = next
      onTargetChange(next)
    }
    const el = promptRef?.current
    const target = points.find((p) => p.id === current.current)
    if (el && target) {
      anchor.set(target.x, target.promptY, target.z).project(camera)
      el.style.visibility = anchor.z > 1 ? 'hidden' : 'visible'
      el.style.transform = `translate3d(${((anchor.x + 1) / 2) * size.width}px, ${((1 - anchor.y) / 2) * size.height}px, 0)`
    }
  })

  return null
}

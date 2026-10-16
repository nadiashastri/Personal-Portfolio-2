import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Viewpoint } from '../config/viewpoints'
import { EYE_HEIGHT, MOVEMENT } from '../config/world'
import { useMovementKeys } from '../hooks/useMovementKeys'
import { setPlayerPose } from '../lib/playerPose'
import {
  clampToBounds,
  damp,
  getMoveDirection,
  lookAngles,
  resolveCircleCollisions,
  type CircleCollider,
} from '../lib/movement'

interface FirstPersonControllerProps {
  /** Movement and mouse-look only respond while this is true. */
  enabled: boolean
  /** Where the camera starts. Review viewpoints may sit outside the walkable area. */
  start: Viewpoint
  /** Round obstacles (trunks, posts) the player can't walk through. */
  colliders?: readonly CircleCollider[]
  /** Opening shot: the camera drifts the last metre into place as the title appears. */
  settle?: boolean
  /** Moves the player instantly (e.g. back outside a building). A new `key` triggers each move. */
  teleport?: Viewpoint & { key: number }
}

const SETTLE = { duration: 2.6, back: 1.4, rise: 0.35, pitch: 0.03 }
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Drives the default R3F camera as a first-person player: mouse-look via
 * pointer-lock movement deltas, WASD/arrow movement with smoothing, a subtle
 * head bob, and clamping to the walkable area.
 */
export function FirstPersonController({ enabled, start, colliders = [], settle = false, teleport }: FirstPersonControllerProps) {
  const camera = useThree((s) => s.camera)
  const keys = useMovementKeys()

  const look = useRef(lookAngles(start.position, start.lookAt))
  const position = useRef<[number, number, number]>([...start.position])
  const velocity = useRef<[number, number]>([0, 0])
  const bobPhase = useRef(0)
  /** Becomes true on first movement; until then the start view is left untouched. */
  const grounded = useRef(false)
  /** Seconds into the opening settle; Infinity once finished or skipped. */
  const settleTime = useRef(settle && !prefersReducedMotion() ? 0 : Infinity)

  // Place the camera before the first frame so the intro shows the right view.
  useLayoutEffect(() => {
    camera.rotation.order = 'YXZ'
    camera.position.set(...position.current)
    camera.rotation.set(look.current.pitch, look.current.yaw, 0)
  }, [camera])

  useEffect(() => {
    if (!teleport) return
    position.current = [...teleport.position]
    look.current = lookAngles(teleport.position, teleport.lookAt)
    setPlayerPose(teleport.position[0], teleport.position[2], look.current.yaw)
    velocity.current = [0, 0]
    grounded.current = true
    settleTime.current = Infinity
    // Depends on the key only: each teleport is applied exactly once.
  }, [teleport?.key])

  useEffect(() => {
    if (!enabled) return
    const onMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return
      const { lookSensitivity, maxPitch } = MOVEMENT
      look.current.yaw -= e.movementX * lookSensitivity
      look.current.pitch = Math.max(
        -maxPitch,
        Math.min(maxPitch, look.current.pitch - e.movementY * lookSensitivity),
      )
    }
    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [enabled])

  useFrame((_, rawDelta) => {
    // Clamp delta so a backgrounded tab doesn't teleport the player on return.
    const dt = Math.min(rawDelta, 0.1)
    const { walkSpeed, sprintMultiplier, acceleration, headBob, bodyRadius } = MOVEMENT
    const input = keys.current

    const [dirX, dirZ] = enabled ? getMoveDirection(input, look.current.yaw) : [0, 0]
    const speed = walkSpeed * (enabled && input.sprint ? sprintMultiplier : 1)

    const v = velocity.current
    v[0] = damp(v[0], dirX * speed, acceleration, dt)
    v[1] = damp(v[1], dirZ * speed, acceleration, dt)
    const groundSpeed = Math.hypot(v[0], v[1])
    if (groundSpeed > 0.01) grounded.current = true

    const p = position.current
    if (grounded.current) {
      const [cx, cz] = resolveCircleCollisions(p[0] + v[0] * dt, p[2] + v[1] * dt, bodyRadius, colliders)
      const [x, y, z] = clampToBounds(cx, EYE_HEIGHT, cz)
      p[0] = x
      p[1] = y
      p[2] = z
    }

    // Head bob scales with actual ground speed, so it eases in and out naturally.
    bobPhase.current += dt * headBob.frequency * (groundSpeed / walkSpeed)
    const bob = Math.sin(bobPhase.current) * headBob.amplitude * Math.min(groundSpeed / walkSpeed, 1)

    // Opening settle: a visual-only offset that eases out (cubic) to exactly zero.
    let [ox, oy, oz, op] = [0, 0, 0, 0]
    if (settleTime.current < SETTLE.duration) {
      settleTime.current += dt
      const k = Math.pow(1 - Math.min(settleTime.current / SETTLE.duration, 1), 3)
      const yaw = look.current.yaw
      ox = Math.sin(yaw) * SETTLE.back * k
      oz = Math.cos(yaw) * SETTLE.back * k
      oy = SETTLE.rise * k
      op = -SETTLE.pitch * k
    }

    camera.position.set(p[0] + ox, p[1] + bob + oy, p[2] + oz)
    camera.rotation.set(look.current.pitch + op, look.current.yaw, 0)
    // Share the real (un-bobbed) position and facing with 2D UI such as the mini-map.
    setPlayerPose(p[0], p[2], look.current.yaw)
  })

  return null
}

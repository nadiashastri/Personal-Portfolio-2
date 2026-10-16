import { WORLD_BOUNDS, EYE_HEIGHT } from '../config/world'

export interface MoveInput {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
}

/**
 * Converts pressed keys + camera yaw into a normalised XZ direction.
 * Yaw follows three.js convention: 0 faces -Z, positive turns left.
 */
export function getMoveDirection(input: MoveInput, yaw: number): [number, number] {
  const f = Number(input.forward) - Number(input.backward)
  const s = Number(input.right) - Number(input.left)
  if (f === 0 && s === 0) return [0, 0]

  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)
  // forward vector = (-sin, -cos), right vector = (cos, -sin)
  const x = -sin * f + cos * s
  const z = -cos * f - sin * s
  const len = Math.hypot(x, z)
  return [x / len, z / len]
}

/** Keeps a position inside the walkable area and never below eye level. */
export function clampToBounds(
  x: number,
  y: number,
  z: number,
  bounds = WORLD_BOUNDS,
  minY = EYE_HEIGHT,
): [number, number, number] {
  return [
    Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    Math.max(minY, y),
    Math.min(bounds.maxZ, Math.max(bounds.minZ, z)),
  ]
}

/** Frame-rate independent exponential approach toward a target value. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt)
}

/** Yaw/pitch that make a camera at `from` look at `to`. */
export function lookAngles(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
): { yaw: number; pitch: number } {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const dz = to[2] - from[2]
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
  }
}

export interface CircleCollider {
  x: number
  z: number
  radius: number
}

/** Pushes a point out of any overlapping circles so the player slides around obstacles. */
export function resolveCircleCollisions(
  x: number,
  z: number,
  bodyRadius: number,
  colliders: readonly CircleCollider[],
): [number, number] {
  for (const c of colliders) {
    const dx = x - c.x
    const dz = z - c.z
    const minDist = c.radius + bodyRadius
    const distSq = dx * dx + dz * dz
    if (distSq >= minDist * minDist) continue
    const dist = Math.sqrt(distSq) || 1e-4
    x = c.x + (dx / dist) * minDist
    z = c.z + (dz / dist) * minDist
  }
  return [x, z]
}

/** In-range test with hysteresis: enter inside `enter`, leave only beyond `exit`. */
export function nextInRange(distance: number, wasInRange: boolean, enter: number, exit: number) {
  return wasInRange ? distance <= exit : distance <= enter
}

import { describe, expect, it } from 'vitest'
import { EYE_HEIGHT, WORLD_BOUNDS } from '../../config/world'
import { clampToBounds, damp, getMoveDirection, lookAngles, nextInRange, resolveCircleCollisions } from '../movement'

const none = { forward: false, backward: false, left: false, right: false }

describe('getMoveDirection', () => {
  it('returns zero when no keys are pressed', () => {
    expect(getMoveDirection(none, 0)).toEqual([0, 0])
  })

  it('moves toward -Z when facing forward with yaw 0', () => {
    const [x, z] = getMoveDirection({ ...none, forward: true }, 0)
    expect(x).toBeCloseTo(0)
    expect(z).toBeCloseTo(-1)
  })

  it('strafes right toward +X', () => {
    const [x, z] = getMoveDirection({ ...none, right: true }, 0)
    expect(x).toBeCloseTo(1)
    expect(z).toBeCloseTo(0)
  })

  it('normalises diagonal movement so it is not faster', () => {
    const [x, z] = getMoveDirection({ ...none, forward: true, right: true }, 0.7)
    expect(Math.hypot(x, z)).toBeCloseTo(1)
  })

  it('cancels out opposing keys', () => {
    expect(getMoveDirection({ ...none, forward: true, backward: true }, 1)).toEqual([0, 0])
  })
})

describe('clampToBounds', () => {
  it('keeps the player inside the walkable area', () => {
    expect(clampToBounds(999, EYE_HEIGHT, -999)).toEqual([
      WORLD_BOUNDS.maxX,
      EYE_HEIGHT,
      WORLD_BOUNDS.minZ,
    ])
  })

  it('never lets the camera drop below eye height', () => {
    expect(clampToBounds(0, -5, 0)[1]).toBe(EYE_HEIGHT)
  })
})

describe('damp', () => {
  it('approaches the target without overshooting', () => {
    const v = damp(0, 10, 10, 1 / 60)
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThan(10)
  })
})

describe('lookAngles', () => {
  it('produces a yaw that faces the target', () => {
    const { yaw, pitch } = lookAngles([0, 1.7, 8], [0, 1.7, -6])
    expect(yaw).toBeCloseTo(0)
    expect(pitch).toBeCloseTo(0)
    const [x, z] = getMoveDirection({ ...none, forward: true }, lookAngles([0, 0, 0], [5, 0, 0]).yaw)
    expect(x).toBeCloseTo(1)
    expect(z).toBeCloseTo(0)
  })
})

describe('resolveCircleCollisions', () => {
  const trunk = { x: 0, z: 0, radius: 0.5 }

  it('pushes the player out of an obstacle', () => {
    const [x, z] = resolveCircleCollisions(0.3, 0, 0.35, [trunk])
    expect(Math.hypot(x, z)).toBeCloseTo(0.85)
  })

  it('leaves the player alone when clear', () => {
    expect(resolveCircleCollisions(3, 3, 0.35, [trunk])).toEqual([3, 3])
  })
})

describe('nextInRange', () => {
  it('uses hysteresis so the prompt does not flicker at the edge', () => {
    expect(nextInRange(5, false, 4.5, 5.5)).toBe(false)
    expect(nextInRange(4.4, false, 4.5, 5.5)).toBe(true)
    expect(nextInRange(5, true, 4.5, 5.5)).toBe(true)
    expect(nextInRange(5.6, true, 4.5, 5.5)).toBe(false)
  })
})

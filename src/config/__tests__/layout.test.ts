import { describe, expect, it } from 'vitest'
import { PATHS, type Vec2 } from '../quadLayout'
import { VIEWPOINTS, getRequestedViewpoint } from '../viewpoints'
import { SPAWN_POSITION, WORLD_BOUNDS } from '../world'

function distanceToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz)
}

describe('Quad layout', () => {
  it('spawns the player standing on a sidewalk', () => {
    const p: Vec2 = [SPAWN_POSITION[0], SPAWN_POSITION[2]]
    expect(PATHS.some((s) => distanceToSegment(p, s.from, s.to) < s.width / 2)).toBe(true)
  })

  it('spawns inside the walkable area', () => {
    expect(SPAWN_POSITION[0]).toBeGreaterThan(WORLD_BOUNDS.minX)
    expect(SPAWN_POSITION[0]).toBeLessThan(WORLD_BOUNDS.maxX)
    expect(SPAWN_POSITION[2]).toBeGreaterThan(WORLD_BOUNDS.minZ)
    expect(SPAWN_POSITION[2]).toBeLessThan(WORLD_BOUNDS.maxZ)
  })

  it('keeps sidewalks a believable width', () => {
    for (const path of PATHS) {
      expect(path.width).toBeGreaterThanOrEqual(2)
      expect(path.width).toBeLessThanOrEqual(5)
    }
  })
})

describe('review viewpoints', () => {
  it('reads a known ?view= name and ignores unknown ones', () => {
    expect(getRequestedViewpoint('?view=union')).toBe('union')
    expect(getRequestedViewpoint('?view=nowhere')).toBeNull()
    expect(getRequestedViewpoint('')).toBeNull()
    // Inherited object keys must not be treated as viewpoints (they used to crash the app).
    for (const name of ['toString', '__proto__', 'constructor', 'hasOwnProperty', '<script>alert(1)</script>']) {
      expect(getRequestedViewpoint(`?view=${encodeURIComponent(name)}`)).toBeNull()
    }
    expect(VIEWPOINTS.spawn.position).toEqual(SPAWN_POSITION)
  })
})

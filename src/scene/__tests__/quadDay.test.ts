import { describe, expect, it } from 'vitest'
import { BOOTHS, QUAD_DAY_ARRIVAL, QUAD_DAY_POINTS, WORK_BOARD } from '../../config/quadDay'
import { PATHS, type Vec2 } from '../../config/quadLayout'
import { WORLD_BOUNDS } from '../../config/world'
import { generateTrees } from '../vegetation/treeLayout'

function distanceToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz)
}

const sites: Vec2[] = [...BOOTHS.map((b) => b.position), WORK_BOARD.position]

describe('mini Quad Day layout', () => {
  it('places four booths and the work board, each with an interaction point', () => {
    expect(BOOTHS).toHaveLength(4)
    expect(QUAD_DAY_POINTS.map((p) => p.id)).toEqual(['nobe', 'swe', 'ambassadors', 'wcs', 'work'])
  })

  it('keeps every booth and the board off the sidewalks (tents are ~3 m wide)', () => {
    for (const s of sites) {
      for (const p of PATHS) expect(distanceToSegment(s, p.from, p.to) - p.width / 2).toBeGreaterThan(1.5)
    }
  })

  it("leaves the approach to the Union's doors clear", () => {
    for (const [x] of sites) expect(Math.abs(x)).toBeGreaterThan(6.5)
  })

  it('spaces booths so the player can walk between them', () => {
    for (let i = 1; i < sites.length; i++) {
      for (let j = 0; j < i; j++) expect(Math.hypot(sites[i][0] - sites[j][0], sites[i][1] - sites[j][1])).toBeGreaterThan(7.5)
    }
  })

  it('keeps clear of trees', () => {
    const trees = generateTrees()
    for (const s of sites) for (const t of trees) expect(Math.hypot(s[0] - t.position[0], s[1] - t.position[1])).toBeGreaterThan(3.5)
  })

  it('is reachable: every interaction point is within range of somewhere walkable', () => {
    for (const p of QUAD_DAY_POINTS) {
      // The walkable edge in front of the booths is the strip down to WORLD_BOUNDS.minZ.
      expect(p.z).toBeGreaterThan(WORLD_BOUNDS.minZ - p.enter)
    }
  })

  it('the guide arrival point is out of range of every booth, looking at the setup', () => {
    const [x, , z] = QUAD_DAY_ARRIVAL.position
    for (const p of QUAD_DAY_POINTS) expect(Math.hypot(x - p.x, z - p.z)).toBeGreaterThan(p.exit)
  })
})

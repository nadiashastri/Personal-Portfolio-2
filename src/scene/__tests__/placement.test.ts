import { describe, expect, it } from 'vitest'
import { PATHS, QUAD, type Vec2 } from '../../config/quadLayout'
import { SPAWN_POSITION } from '../../config/world'
import { generateProps } from '../props/propLayout'
import { generateTrees } from '../vegetation/treeLayout'

function distanceToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz)
}
const onAPath = (p: Vec2) => PATHS.some((s) => distanceToSegment(p, s.from, s.to) < s.width / 2)

describe('procedural placement', () => {
  const trees = generateTrees()
  const props = generateProps()

  it('is deterministic between loads', () => {
    expect(generateTrees()).toEqual(trees)
  })

  it('never plants a tree on a sidewalk', () => {
    expect(trees.filter((t) => onAPath(t.position))).toEqual([])
  })

  it('keeps lampposts and benches off the concrete', () => {
    for (const item of [...props.lamps, ...props.benches]) {
      expect(onAPath([item.position[0], item.position[2]])).toBe(false)
    }
  })

  it('keeps the opening view clear of street furniture', () => {
    for (const item of [...props.lamps, ...props.benches]) {
      expect(Math.hypot(item.position[0] - SPAWN_POSITION[0], item.position[2] - SPAWN_POSITION[2])).toBeGreaterThan(20)
    }
  })

  it('keeps lampposts off the Quad itself, only at the corner exits', () => {
    for (const lamp of props.lamps) expect(Math.abs(lamp.position[0])).toBeGreaterThan(QUAD.halfWidth + 10)
  })

  it('leaves the central lawn open, like the real Quad', () => {
    const central = trees.filter((t) => Math.abs(t.position[0]) < 28 && Math.abs(t.position[1]) < 100)
    expect(central).toEqual([])
  })
})

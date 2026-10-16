import { describe, expect, it } from 'vitest'
import { pickInteraction, type InteractionPoint } from '../interactions'

const points: InteractionPoint[] = [
  { id: 'a', x: 0, z: 0, enter: 4.5, exit: 5.5 },
  { id: 'b', x: 8, z: 0, enter: 4.5, exit: 5.5 },
]

describe('pickInteraction', () => {
  it('returns null when nothing is in range', () => {
    expect(pickInteraction(points, 0, 20, null)).toBeNull()
  })

  it('picks the nearest point when two are in range', () => {
    expect(pickInteraction(points, 3.5, 0, null)).toBe('a')
    expect(pickInteraction(points, 4.5, 0, null)).toBe('b')
  })

  it('keeps the current target slightly beyond its enter radius (no flicker)', () => {
    expect(pickInteraction(points, 0, 5, null)).toBeNull()
    expect(pickInteraction(points, 0, 5, 'a')).toBe('a')
    expect(pickInteraction(points, 0, 5.6, 'a')).toBeNull()
  })

  it('lets a nearer point take over from the current one', () => {
    expect(pickInteraction(points, 5, 0, 'a')).toBe('b')
  })
})

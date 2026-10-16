import { describe, expect, it } from 'vitest'
import { pickInteraction } from '../../lib/interactions'
import { DEFAULT_LOCATION_LABEL, LOCATION_BUFFER, LOCATION_POINTS, LOCATION_ZONES, ZONE_INTERACTIONS, labelFor } from '../locationZones'
import { QUAD_DAY_ARRIVAL } from '../quadDay'
import { FOELLINGER_ENTRANCE, SPAWN_POSITION } from '../world'

const locate = (x: number, z: number, current: string | null = null) => pickInteraction(LOCATION_POINTS, x, z, current)

describe('location zones', () => {
  it('names each major area when the player is inside it', () => {
    expect(locate(0, -126)).toBe('union')
    expect(locate(0, 114)).toBe('foellinger')
    expect(locate(0, -14)).toBe('about')
    expect(labelFor('union')).toBe('Illini Union')
    expect(labelFor('foellinger')).toBe('Foellinger Auditorium')
    expect(labelFor('about')).toBe('Center Quad · About Me')
  })

  it('falls back to "Exploring the Quad" between areas, including at spawn', () => {
    expect(locate(SPAWN_POSITION[0], SPAWN_POSITION[2])).toBeNull()
    expect(locate(30, 60)).toBeNull()
    expect(labelFor(null)).toBe(DEFAULT_LOCATION_LABEL)
  })

  it('leaves a zone only after a buffer, so the label does not flicker at the edge', () => {
    const union = LOCATION_ZONES.find((z) => z.id === 'union')!
    const edgeZ = union.centre[1] + union.radius + LOCATION_BUFFER / 2
    expect(locate(0, edgeZ, null)).toBeNull() // not yet entered
    expect(locate(0, edgeZ, 'union')).toBe('union') // already inside: stays
    expect(locate(0, union.centre[1] + union.radius + LOCATION_BUFFER + 0.5, 'union')).toBeNull()
  })

  it('picks the nearest zone where two overlap', () => {
    const zones = [
      { id: 'a', x: 0, z: 0, enter: 10, exit: 12 },
      { id: 'b', x: 12, z: 0, enter: 10, exit: 12 },
    ]
    expect(pickInteraction(zones, 5, 0, null)).toBe('a')
    expect(pickInteraction(zones, 7, 0, null)).toBe('b')
    expect(pickInteraction(zones, 7, 0, 'a')).toBe('b')
  })

  it('shows the area name before any "Press E" prompt can appear', () => {
    for (const zone of LOCATION_ZONES) {
      for (const p of ZONE_INTERACTIONS[zone.id]) {
        const reach = Math.hypot(p.x - zone.centre[0], p.z - zone.centre[1]) + p.range
        expect(reach).toBeLessThan(zone.radius)
      }
    }
  })

  it('updates for teleports too: guide and return points land in the expected area', () => {
    expect(locate(QUAD_DAY_ARRIVAL.position[0], QUAD_DAY_ARRIVAL.position[2])).toBe('union')
    const [x, , z] = FOELLINGER_ENTRANCE.returnTo.position
    expect(locate(x, z)).toBe('foellinger')
  })
})

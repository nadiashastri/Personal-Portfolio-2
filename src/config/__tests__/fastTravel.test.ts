import { describe, expect, it } from 'vitest'
import { BOOTHS } from '../quadDay'
import { DESTINATIONS, getDestination, isWithinWalkableArea } from '../fastTravel'
import { LOCATION_POINTS } from '../locationZones'
import { ABOUT_ME_INSTALLATION, EYE_HEIGHT, FOELLINGER_ENTRANCE } from '../world'
import { pickInteraction } from '../../lib/interactions'
import { generateProps } from '../../scene/props/propLayout'
import { generateTrees } from '../../scene/vegetation/treeLayout'

const obstacles = [
  ...generateTrees().map((t) => ({ x: t.position[0], z: t.position[1], r: 1 })),
  ...generateProps().lamps.map((l) => ({ x: l.position[0], z: l.position[2], r: 0.6 })),
  ...generateProps().benches.map((b) => ({ x: b.position[0], z: b.position[2], r: 1.2 })),
  ...BOOTHS.map((b) => ({ x: b.position[0], z: b.position[1], r: 2.4 })),
  { x: ABOUT_ME_INSTALLATION.position[0], z: ABOUT_ME_INSTALLATION.position[2], r: 1.6 },
]

/** The interaction each destination should lead to, and its prompt range. */
const targets = {
  center: { x: ABOUT_ME_INSTALLATION.position[0], z: ABOUT_ME_INSTALLATION.position[2], range: ABOUT_ME_INSTALLATION.range.enter },
  foellinger: { x: FOELLINGER_ENTRANCE.zone[0], z: FOELLINGER_ENTRANCE.zone[1], range: FOELLINGER_ENTRANCE.range.enter },
  union: { x: BOOTHS[1].position[0], z: BOOTHS[1].position[1], range: 4.5 },
}

describe('fast-travel destinations', () => {
  it('offers exactly Center Quad, Foellinger and Illini Union', () => {
    expect(DESTINATIONS.map((d) => [d.title, d.subtitle])).toEqual([
      ['Center Quad', 'About Me'],
      ['Foellinger Auditorium', 'Projects'],
      ['Illini Union', 'Experience & Involvement'],
    ])
  })

  it('rejects unknown or invalid destinations', () => {
    expect(getDestination('contact')).toBeUndefined()
    expect(getDestination('')).toBeUndefined()
    expect(isWithinWalkableArea({ position: [0, EYE_HEIGHT, -500], lookAt: [0, 0, 0] })).toBe(false)
    expect(isWithinWalkableArea({ position: [Number.NaN, EYE_HEIGHT, 0], lookAt: [0, 0, 0] })).toBe(false)
    expect(isWithinWalkableArea({ position: [0, 0, 0], lookAt: [0, 0, 0] })).toBe(false)
  })

  for (const d of DESTINATIONS) {
    describe(d.title, () => {
      const [x, , z] = d.arrival.position

      it('arrives at eye height inside the walkable area, clear of trees, booths and props', () => {
        expect(isWithinWalkableArea(d.arrival)).toBe(true)
        for (const o of obstacles) expect(Math.hypot(x - o.x, z - o.z)).toBeGreaterThan(o.r)
      })

      it('arrives close to its interaction, but outside the prompt (the visitor still presses E)', () => {
        const t = targets[d.id]
        const distance = Math.hypot(x - t.x, z - t.z)
        expect(distance).toBeGreaterThan(t.range)
        expect(distance).toBeLessThan(25)
      })

      it('faces the destination', () => {
        const t = targets[d.id]
        const look = Math.atan2(d.arrival.lookAt[0] - x, d.arrival.lookAt[2] - z)
        const toTarget = Math.atan2(t.x - x, t.z - z)
        const diff = Math.abs(Math.atan2(Math.sin(look - toTarget), Math.cos(look - toTarget)))
        expect(diff).toBeLessThan(0.6)
      })

      it('lands in the matching location zone, so the label agrees', () => {
        expect(pickInteraction(LOCATION_POINTS, x, z, null)).toBe(d.location)
      })
    })
  }
})

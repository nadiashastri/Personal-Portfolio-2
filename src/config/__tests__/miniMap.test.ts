import { describe, expect, it } from 'vitest'
import { DESTINATIONS } from '../fastTravel'
import { FACADES } from '../quadLayout'
import { ABOUT_ME_INSTALLATION } from '../world'
import { MAP_BOUNDS, MAP_DESTINATIONS, arrowRotation, buildMapData, worldToMap } from '../miniMap'
import { getMoveDirection } from '../../lib/movement'

describe('worldToMap', () => {
  it('maps the landmarks to their places on a north-up map', () => {
    const union = worldToMap(0, FACADES.union)
    const center = worldToMap(ABOUT_ME_INSTALLATION.position[0], ABOUT_ME_INSTALLATION.position[2])
    const foellinger = worldToMap(0, FACADES.foellinger)
    // Union near the top, Foellinger near the bottom, About Me near the middle, all centred left–right.
    expect(union.v).toBeLessThan(0.15)
    expect(foellinger.v).toBeGreaterThan(0.85)
    expect(center.v).toBeGreaterThan(0.4)
    expect(center.v).toBeLessThan(0.5)
    for (const p of [union, center, foellinger]) expect(p.u).toBeCloseTo(0.5, 1)
  })

  it('moves the marker the right way for each walking direction', () => {
    const start = worldToMap(0, 0)
    const step = (dx: number, dz: number) => worldToMap(dx * 10, dz * 10)
    // Facing north (yaw 0): W walks north, S south, D east, A west — in world terms.
    const none = { forward: false, backward: false, left: false, right: false }
    const north = getMoveDirection({ ...none, forward: true }, 0)
    const south = getMoveDirection({ ...none, backward: true }, 0)
    const east = getMoveDirection({ ...none, right: true }, 0)
    const west = getMoveDirection({ ...none, left: true }, 0)
    expect(step(...north).y).toBeLessThan(start.y) // up the map, towards the Union
    expect(step(...south).y).toBeGreaterThan(start.y) // down, towards Foellinger
    expect(step(...east).x).toBeGreaterThan(start.x) // right
    expect(step(...west).x).toBeLessThan(start.x) // left
  })

  it('clamps positions outside the map to its edge', () => {
    const far = worldToMap(1000, -1000)
    expect(far.clamped).toBe(true)
    expect(far.x).toBeLessThanOrEqual(MAP_BOUNDS.maxX)
    expect(far.y).toBeGreaterThanOrEqual(MAP_BOUNDS.minZ)
    expect(far.u).toBeLessThanOrEqual(1)
    expect(far.v).toBeGreaterThanOrEqual(0)
    expect(worldToMap(10, 10).clamped).toBe(false)
    const bad = worldToMap(Number.NaN, Number.POSITIVE_INFINITY)
    expect(Number.isFinite(bad.x) && Number.isFinite(bad.y)).toBe(true)
  })
})

describe('arrowRotation', () => {
  it('points the arrow where the camera faces (clockwise degrees from north)', () => {
    expect(arrowRotation(0)).toBeCloseTo(0) // north
    expect(arrowRotation(-Math.PI / 2)).toBeCloseTo(90) // east
    expect(arrowRotation(Math.PI)).toBeCloseTo(180) // south
    expect(arrowRotation(Math.PI / 2)).toBeCloseTo(270) // west
  })
})

describe('map content comes from the scene layout', () => {
  const d = buildMapData()
  it('draws the Union north of the lawn and Foellinger south of it', () => {
    expect(d.union.main.y + d.union.main.h).toBeCloseTo(FACADES.union)
    expect(d.union.main.y).toBeLessThan(d.lawn.y)
    expect(d.foellinger.front.y).toBeCloseTo(FACADES.foellinger)
    expect(d.foellinger.drum.y).toBeGreaterThan(d.lawn.y + d.lawn.h)
  })

  it('includes the paths, trees, four booths and the About Me sign', () => {
    expect(d.paths.length).toBeGreaterThan(10)
    expect(d.trees.length).toBeGreaterThan(50)
    expect(d.booths).toHaveLength(4)
    expect(d.aboutMe.y).toBe(ABOUT_ME_INSTALLATION.position[2])
  })

  it('has a destination pin for each fast-travel stop, inside the map', () => {
    expect(MAP_DESTINATIONS.map((m) => m.id).sort()).toEqual(DESTINATIONS.map((d) => d.id).sort())
    for (const m of MAP_DESTINATIONS) expect(worldToMap(m.at[0], m.at[1]).clamped).toBe(false)
  })
})

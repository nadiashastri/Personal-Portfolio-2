import { describe, expect, it } from 'vitest'
import { CURVE_START_Z, FORECOURT, curvePoint, outline } from '../../config/foellingerForecourt'
import { FACADES, FOELLINGER_WALKS, PATHS } from '../../config/quadLayout'
import { balustradeLayout } from '../architecture/foellingerTerrace'

describe("Foellinger's semicircular forecourt", () => {
  it('projects 35–45% of its width into the Quad', () => {
    const [, apexZ] = curvePoint(0)
    const projection = apexZ - FORECOURT.back
    expect(projection).toBeCloseTo(FORECOURT.projection)
    expect(projection / FORECOURT.width).toBeGreaterThanOrEqual(0.35)
    expect(projection / FORECOURT.width).toBeLessThanOrEqual(0.45)
  })

  it('is D-shaped: full width at the shoulders, narrowing steadily to the apex', () => {
    const [xEnd, zEnd] = curvePoint(-Math.PI / 2)
    expect(Math.abs(xEnd)).toBeCloseTo(FORECOURT.width / 2)
    expect(zEnd).toBeCloseTo(CURVE_START_Z)
    const curve = outline(0, 'curve').filter((p) => p.x <= 0)
    for (let i = 1; i < curve.length; i++) expect(curve[i].z).toBeGreaterThanOrEqual(curve[i - 1].z - 1e-9)
  })

  it('spaces balusters evenly along the curve', () => {
    const { balusters } = balustradeLayout()
    const gaps = balusters.slice(1).map((b, i) => Math.hypot(b.position[0] - balusters[i].position[0], b.position[2] - balusters[i].position[2]))
    const typical = gaps.filter((g) => g < FORECOURT.rail.balusterSpacing * 1.5)
    expect(balusters.length).toBeGreaterThan(100)
    for (const g of typical) expect(g).toBeGreaterThan(typical[0] - 0.02)
    for (const g of typical) expect(g).toBeLessThan(typical[0] + 0.02)
  })

  it('reroutes the walks around it: no walk crosses the planted bed', () => {
    const bed = outline(FORECOURT.bed.outer, 'curve').map((p) => [-p.x, FACADES.foellinger - p.z])
    const apexZ = Math.min(...bed.map(([, z]) => z))
    expect(FOELLINGER_WALKS.crossesSouthWalk).toBe(true)
    // The Quad's diagonals now meet beyond the bed, at the curved walk's apex.
    expect(FOELLINGER_WALKS.apex[1]).toBeLessThan(apexZ)
    const straight = PATHS.filter((p) => !FOELLINGER_WALKS.segments.includes(p as never))
    for (const p of straight) {
      const midZ = (p.from[1] + p.to[1]) / 2
      const midX = (p.from[0] + p.to[0]) / 2
      const insideBed = midZ > apexZ && Math.abs(midX) < FORECOURT.width / 2 && midZ < FACADES.foellinger
      expect(insideBed).toBe(false)
    }
  })
})

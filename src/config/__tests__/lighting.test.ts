import { Color, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { DAYLIGHT, SUNSET } from '../lighting'
import { PALETTE, SUN_DIRECTION } from '../world'
import { blendColor, blendNumber, blendSunDirection, ease } from '../../lib/timeOfDay'

describe('lighting presets', () => {
  it('daylight reproduces the original scene exactly', () => {
    expect(DAYLIGHT.sunDirection).toEqual(SUN_DIRECTION)
    expect(DAYLIGHT.skyTop).toBe(PALETTE.skyTop)
    expect(DAYLIGHT.skyHorizon).toBe(PALETTE.fog)
    expect(DAYLIGHT.sunColor).toBe(PALETTE.sun)
    expect([DAYLIGHT.sunIntensity, DAYLIGHT.ambientIntensity, DAYLIGHT.environmentIntensity, DAYLIGHT.fogDensity]).toEqual([2.9, 0.55, 0.75, 0.0028])
    // The sunset-only sky effects are switched off.
    expect(DAYLIGHT.skyBandAmount).toBe(0)
    expect(DAYLIGHT.horizonGlowAmount).toBe(0)
    expect(DAYLIGHT.cloudCover).toBe(0)
    expect(DAYLIGHT.cloudLitNearSun).toEqual(DAYLIGHT.cloudLitAwayFromSun)
  })

  it('blending at 0 gives daylight values exactly, and at 1 gives sunset', () => {
    expect(blendNumber('sunIntensity', 0)).toBe(DAYLIGHT.sunIntensity)
    expect(blendNumber('sunIntensity', 1)).toBeCloseTo(SUNSET.sunIntensity)
    expect(blendColor('skyTop', 0, new Color()).getHex()).toBe(new Color(DAYLIGHT.skyTop).getHex())
    expect(blendColor('skyTop', 1, new Color()).getHex()).toBe(new Color(SUNSET.skyTop).getHex())
    const day = blendSunDirection(0)
    expect(day.toArray().map((v) => +v.toFixed(6))).toEqual(new Vector3(...SUN_DIRECTION).normalize().toArray().map((v) => +v.toFixed(6)))
  })

  it('sunset is a genuinely different, low, golden sun with a pink sky', () => {
    const elevation = (d: readonly number[]) => (Math.asin(new Vector3(d[0], d[1], d[2]).normalize().y) * 180) / Math.PI
    expect(elevation(SUNSET.sunDirection)).toBeLessThan(20)
    expect(elevation(SUNSET.sunDirection)).toBeGreaterThan(5)
    expect(elevation(DAYLIGHT.sunDirection)).toBeGreaterThan(30)
    const sun = new Color(SUNSET.sunColor)
    expect(sun.r).toBeGreaterThan(sun.b) // warm
    const band = new Color(SUNSET.skyBand)
    expect(band.r).toBeGreaterThan(band.g) // pink
    expect(SUNSET.skyBandAmount).toBeGreaterThan(0)
    expect(SUNSET.horizonGlowAmount).toBeGreaterThan(0)
  })

  it('eases smoothly from start to finish', () => {
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(0.5)).toBeCloseTo(0.5)
    expect(ease(0.1)).toBeLessThan(0.1)
  })
})

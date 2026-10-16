import { Color, Vector3 } from 'three'
import { LIGHTING_PRESETS, type ColorSpec, type LightingMode, type LightingPreset } from '../config/lighting'

/**
 * The scene's current blend between Daylight (0) and Sunset (1). Written by
 * the TimeOfDayDriver each frame during a transition; read by the sky,
 * lighting and fog. A plain object, so the blend never re-renders React.
 */
export const timeOfDay = { value: 0, target: 0, version: 0 }

export const modeTarget = (mode: LightingMode) => (mode === 'sunset' ? 1 : 0)

export function toColor(spec: ColorSpec, out = new Color()) {
  return typeof spec === 'string' ? out.set(spec) : out.setRGB(spec[0], spec[1], spec[2])
}

/** Smooth ease-in-out over the transition. */
export const ease = (t: number) => t * t * (3 - 2 * t)

const from = LIGHTING_PRESETS.daylight
const to = LIGHTING_PRESETS.sunset
const cache = new Map<string, [Color, Color]>()

/** A preset colour blended at `t` (0 = daylight, 1 = sunset). At exactly 0 it is daylight's value. */
export function blendColor(key: keyof LightingPreset, t: number, out: Color) {
  let pair = cache.get(key)
  if (!pair) {
    pair = [toColor(from[key] as ColorSpec), toColor(to[key] as ColorSpec)]
    cache.set(key, pair)
  }
  return out.lerpColors(pair[0], pair[1], t)
}

export function blendNumber(key: keyof LightingPreset, t: number) {
  const a = from[key] as number
  const b = to[key] as number
  return t === 0 ? a : a + (b - a) * t
}

/** Direction towards the sun at blend `t` (normalised). */
export function blendSunDirection(t: number, out = new Vector3()) {
  const [ax, ay, az] = from.sunDirection
  const [bx, by, bz] = to.sunDirection
  return out.set(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t).normalize()
}

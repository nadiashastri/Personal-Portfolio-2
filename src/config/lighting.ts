import { PALETTE, SUN_DIRECTION, type Vec3 } from './world'

/**
 * Lighting presets for the Quad. Daylight reproduces the original scene
 * exactly; Sunset is a late-summer golden hour. The scene blends between
 * them (see lib/timeOfDay.ts), so every value here is something you can tune.
 */

export type LightingMode = 'daylight' | 'sunset'

/** A hex colour (sRGB), or raw linear RGB values as used directly in the sky shader. */
export type ColorSpec = string | readonly [r: number, g: number, b: number]

export interface LightingPreset {
  /** Direction towards the sun (normalised in use). Its y component sets how high the sun is. */
  sunDirection: Vec3
  sunColor: string
  sunIntensity: number
  /** Sky: zenith colour, horizon colour (also the fog colour, so they blend seamlessly). */
  skyTop: string
  skyHorizon: string
  /** A soft band low in the sky (pink/lavender at sunset), and how strongly it shows (0 = off). */
  skyBand: string
  skyBandAmount: number
  /** Warm glow along the horizon on the sun's side, and its strength (0 = off). */
  horizonGlow: string
  horizonGlowAmount: number
  /** Sun disc and halo colour. */
  sunDiscColor: string
  /** Clouds: lit side near the sun, lit side away from it, and shadowed undersides. */
  cloudLitNearSun: ColorSpec
  cloudLitAwayFromSun: ColorSpec
  cloudShade: ColorSpec
  /** Extra cloud cover (0 = original amount; positive = more clouds). */
  cloudCover: number
  /** Ambient light from the sky above and bounced off the ground. */
  ambientSky: string
  ambientGround: string
  ambientIntensity: number
  /** Strength of sky reflections / fill light baked from the sky. */
  environmentIntensity: number
  fogDensity: number
  /** Multiplies the hazy tree line on the horizon. */
  treelineTint: string
}

/** The original daylight look. Keep these as they are to preserve it. */
export const DAYLIGHT: LightingPreset = {
  sunDirection: SUN_DIRECTION,
  sunColor: PALETTE.sun,
  sunIntensity: 2.9,
  skyTop: PALETTE.skyTop,
  skyHorizon: PALETTE.fog,
  skyBand: PALETTE.fog,
  skyBandAmount: 0,
  horizonGlow: PALETTE.sun,
  horizonGlowAmount: 0,
  sunDiscColor: PALETTE.sun,
  // The original shader's exact cloud values (linear RGB).
  cloudLitNearSun: [1, 0.99, 0.96],
  cloudLitAwayFromSun: [1, 0.99, 0.96],
  cloudShade: [0.72, 0.76, 0.84],
  cloudCover: 0,
  ambientSky: '#d4e6ff',
  ambientGround: '#8c8471',
  ambientIntensity: 0.55,
  environmentIntensity: 0.75,
  fogDensity: 0.0028,
  treelineTint: '#ffffff',
}

/**
 * Golden hour: the sun ~13° above the north-west horizon. From the spawn
 * point, looking north towards the Union, the amber glow sits ahead and to
 * the left; Foellinger's north-facing columns and the lawn catch warm,
 * raking light, and trees throw long shadows towards the south-east.
 */
export const SUNSET: LightingPreset = {
  // Bearing ~310° (NW), elevation ~13°. Raise y for a higher sun, lower it for a later sunset.
  sunDirection: [-0.75, 0.23, -0.62],
  // Golden warmth of the direct light (towards #ff9a4d is more orange; towards #ffe0b0 more neutral).
  sunColor: '#ffbf7a',
  sunIntensity: 3.4,
  // Upper sky: dusky blue-lavender.
  skyTop: '#5a6fb3',
  // Horizon + fog: soft peach.
  skyHorizon: '#f4b79a',
  // Pink band low in the sky: the main "pinkness" control (colour + amount).
  skyBand: '#e99ab7',
  skyBandAmount: 0.75,
  // Amber glow on the sun's side of the horizon.
  horizonGlow: '#ffa851',
  horizonGlowAmount: 0.85,
  sunDiscColor: '#ffd08a',
  // Clouds: golden-peach where they face the sun, pink elsewhere, lavender undersides.
  cloudLitNearSun: '#ffd2a1',
  cloudLitAwayFromSun: '#f5a6bf',
  cloudShade: '#9c86b4',
  cloudCover: 0.04,
  // Cool pink-lavender fill to complement the golden sun (keeps shadows cool, not orange).
  ambientSky: '#c3b2dd',
  ambientGround: '#8a7266',
  ambientIntensity: 0.72,
  environmentIntensity: 0.66,
  fogDensity: 0.0032,
  treelineTint: '#ecc4bd',
}

export const LIGHTING_PRESETS: Record<LightingMode, LightingPreset> = { daylight: DAYLIGHT, sunset: SUNSET }

/** Seconds for a full Daylight ↔ Sunset transition. */
export const LIGHTING_TRANSITION_SECONDS = 2

/**
 * World tuning constants.
 *
 * Coordinate convention: 1 unit = 1 metre, +Y is up, -Z points north.
 * The Quad's long axis runs north–south: Illini Union closes the north end,
 * Foellinger Auditorium the south end. The layout itself lives in quadLayout.ts.
 */

export type Vec3 = readonly [x: number, y: number, z: number]

/** Camera height above the ground, roughly human eye level. */
export const EYE_HEIGHT = 1.7

/**
 * Walkable rectangle on the XZ plane: the lawn, perimeter walks and the strip
 * of trees in front of the side buildings — but not into any facade.
 */
export const WORLD_BOUNDS = {
  minX: -55,
  maxX: 55,
  minZ: -131,
  maxZ: 121.6, // the south walk; Foellinger's planted terrace bed begins just beyond
} as const

/** Where the About Me installation will stand, on the lawn just north of the centre crossing. */
export const ABOUT_ME_POSITION: Vec3 = [0, 0, -14]

/**
 * Player spawn: on the south-west arm of the big diagonal X, a few steps from
 * the centre crossing, facing About Me with the Union beyond.
 * (The diagonal runs (46, -62) → (-46, 62), so x = -46 · z / 62.)
 */
export const SPAWN_POSITION: Vec3 = [(-46 * 9) / 62, EYE_HEIGHT, 9]

/** Point the camera faces on load. */
export const SPAWN_LOOK_AT: Vec3 = [ABOUT_ME_POSITION[0], 2.2, ABOUT_ME_POSITION[2]]

export const MOVEMENT = {
  walkSpeed: 4.2,
  sprintMultiplier: 2,
  /** How quickly velocity approaches its target (higher = snappier). */
  acceleration: 10,
  /** Radians per pixel of mouse movement. */
  lookSensitivity: 0.0022,
  /** Pitch limit so the camera can't flip over. */
  maxPitch: Math.PI / 2 - 0.05,
  headBob: { amplitude: 0.035, frequency: 9 },
  /** Radius of the player's body for collisions with trunks and posts. */
  bodyRadius: 0.35,
} as const

export const PALETTE = {
  skyTop: '#3f88d6',
  skyHorizon: '#dce9f2',
  fog: '#d9e4ea',
  sun: '#fff0d9',
  illinoisOrange: '#FF5F05',
  illinoisBlue: '#13294B',
} as const

/** Direction *towards* the sun: south-west afternoon light, front-lighting the Union. */
export const SUN_DIRECTION: Vec3 = [-0.55, 0.62, 0.56]

/** About Me installation: where it stands and how close the player must be to interact. */
export const ABOUT_ME_INSTALLATION = {
  position: ABOUT_ME_POSITION,
  /** Faces the spawn point, so the board greets the player on arrival. */
  rotationY: Math.atan2(SPAWN_POSITION[0] - ABOUT_ME_POSITION[0], SPAWN_POSITION[2] - ABOUT_ME_POSITION[2]),
  /** Enter range inside `enter` metres; leave beyond `exit` (hysteresis stops flicker at the edge). */
  range: { enter: 4.5, exit: 5.5 },
  colliderRadius: 1.1,
} as const

/**
 * Foellinger's Project Showcase entrance. The forecourt keeps players on the
 * walk curving round its planted bed, so the zone is centred on that walk at
 * the forecourt's apex; the prompt hangs over the entrance stairs.
 */
export const FOELLINGER_ENTRANCE = {
  /** World XZ of the interaction zone (on the walk in front of the forecourt). */
  zone: [0, 114] as const,
  range: { enter: 6, exit: 7.5 },
  /** Where the floating prompt is anchored (above the entrance stairs, below the columns). */
  promptAnchor: [0, 4.2, 129.5] as const,
  /** Where the player is placed on returning: back on the Quad, facing away from the doors. */
  returnTo: { position: [0, EYE_HEIGHT, 105] as Vec3, lookAt: [0, EYE_HEIGHT, 60] as Vec3 },
} as const

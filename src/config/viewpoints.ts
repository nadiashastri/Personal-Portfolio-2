import { QUAD_DAY_ARRIVAL } from './quadDay'
import { EYE_HEIGHT, SPAWN_LOOK_AT, SPAWN_POSITION, type Vec3 } from './world'

export interface Viewpoint {
  position: Vec3
  lookAt: Vec3
}

/**
 * Named camera views for reviewing the scene. Open the site with `?view=<name>`
 * to skip the intro and jump straight to one, e.g. `?view=union`.
 * Several mirror the reference photos in references/.
 */
export const VIEWPOINTS = {
  spawn: { position: SPAWN_POSITION, lookAt: SPAWN_LOOK_AT },
  /** Close to the Union, like the Street View reference. */
  union: { position: [6, EYE_HEIGHT, -100], lookAt: [0, 9, -140] },
  /** Foellinger from the lawn, as in reference 11. */
  foellingerLawn: { position: [-6, EYE_HEIGHT, 70], lookAt: [0, 14, 136] },
  /** Beside the flower bed, looking across Foellinger's terrace balustrade at the columns (reference 12). */
  foellingerTerrace: { position: [-27, 1.7, 112], lookAt: [-4, 2, 126] },
  /** Straight on from the south walk, like reference 13: curved balustrade and planting. */
  foellingerFront: { position: [3, 1.7, 104], lookAt: [0, 3.2, 136] },
  /** Approaching Foellinger's portico. */
  foellinger: { position: [-8, EYE_HEIGHT, 96], lookAt: [0, 8, 136] },
  /** From Foellinger's steps looking up the Quad (references 1, 2 and 9). */
  quadNorth: { position: [0, 9, 128], lookAt: [0, 4, -60] },
  /** West walk, looking south-east across to Foellinger (reference 8). */
  westWalk: { position: [-44, EYE_HEIGHT, 40], lookAt: [10, 6, 130] },
  /** East walk, looking down the side buildings. */
  eastWalk: { position: [44, EYE_HEIGHT, -20], lookAt: [58, 6, -80] },
  /** North-east corner, looking out along the lamp-lined exit walk (reference 10). */
  cornerExit: { position: [40, EYE_HEIGHT, -122], lookAt: [90, 3, -125] },
  /** Standing in range of the About Me installation (the E prompt should show). */
  aboutMe: { position: [-1.6, EYE_HEIGHT, -10.6], lookAt: [0, 1.6, -14] },
  /** Mini Quad Day in front of the Illini Union (the Guide's Experience arrival point). */
  quadDay: QUAD_DAY_ARRIVAL,
  /** On the walk in front of Foellinger, in range of the Project Showcase entrance. */
  foellingerEntrance: { position: [3, EYE_HEIGHT, 111], lookAt: [0, 5, 134] },
  /** Top-down plan of Foellinger's forecourt (check the D shape). */
  forecourtTop: { position: [0, 75, 120], lookAt: [0, 0, 120.5] },
  /** 45° view of the forecourt from the north-west. */
  forecourt45: { position: [-30, 30, 92], lookAt: [0, 1, 124] },
  /** High oblique overview from the south-west (reference 3). */
  aerial: { position: [-120, 120, 190], lookAt: [0, 0, -10] },
} satisfies Record<string, Viewpoint>

export type ViewpointName = keyof typeof VIEWPOINTS

/** Reads `?view=` from the URL; returns null when absent or unknown. */
export function getRequestedViewpoint(search = typeof window === 'undefined' ? '' : window.location.search): ViewpointName | null {
  const name = new URLSearchParams(search).get('view')
  // Own keys only: `in` would also accept inherited names like 'toString' or '__proto__'.
  return name && Object.hasOwn(VIEWPOINTS, name) ? (name as ViewpointName) : null
}

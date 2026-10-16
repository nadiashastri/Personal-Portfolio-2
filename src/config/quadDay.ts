import type { InteractionPoint } from '../lib/interactions'
import { ORGANIZATIONS, type Organization } from '../content/involvement'
import type { Viewpoint } from './viewpoints'
import { ABOUT_ME_INSTALLATION, EYE_HEIGHT } from './world'

/**
 * Mini Quad Day in front of the Illini Union: four org booths on the lawn
 * strip between the north walk (z = -124) and the Union's flower beds, facing
 * the Quad, plus a campus work-experience noticeboard at the west end. The
 * central approach to the Union's doors (|x| < 6.5) stays clear.
 */

export interface BoothPlacement {
  org: Organization
  /** World XZ of the table centre. */
  position: readonly [number, number]
  /** Rotation so the booth's front faces the walk. */
  rotationY: number
}

const BOOTH_Z = -128
const BOOTH_XS = [-18.5, -9.5, 9.5, 18.5]

export const BOOTHS: readonly BoothPlacement[] = ORGANIZATIONS.map((org, i) => ({
  org,
  position: [BOOTH_XS[i], BOOTH_Z] as const,
  // Outer booths angle slightly inward, like a real fair row.
  rotationY: [0.12, 0.04, -0.04, -0.12][i],
}))

export const WORK_BOARD = { position: [-27.5, -127.6] as const, rotationY: 0.35 }

/** Same feel as About Me: enter within 4.5 m, leave beyond 5.5 m. */
const RANGE = { enter: ABOUT_ME_INSTALLATION.range.enter, exit: ABOUT_ME_INSTALLATION.range.exit }

export const WORK_BOARD_ID = 'work'

export const QUAD_DAY_POINTS: readonly InteractionPoint[] = [
  ...BOOTHS.map((b) => ({ id: b.org.id, x: b.position[0], z: b.position[1], ...RANGE })),
  { id: WORK_BOARD_ID, x: WORK_BOARD.position[0], z: WORK_BOARD.position[1], ...RANGE },
]

/** Where each prompt hangs (above the tent / board). */
export const PROMPT_HEIGHT = { booth: 3.9, board: 3.1 }

/** Guide destination: on the lawn south of the north walk, looking at the booths and the Union. */
export const QUAD_DAY_ARRIVAL: Viewpoint = { position: [-3, EYE_HEIGHT, -107], lookAt: [-2, 2.2, -128] }

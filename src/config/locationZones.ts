import type { InteractionPoint } from '../lib/interactions'
import { BOOTHS, WORK_BOARD } from './quadDay'
import { ABOUT_ME_INSTALLATION, FOELLINGER_ENTRANCE } from './world'

/**
 * Named areas for the top-left location label. Each zone is a circle on the
 * ground (world XZ): the label switches when the player comes within
 * `radius` metres of its centre and only switches back once they're more
 * than `radius + buffer` away, so it never flickers at the edge. Where zones
 * overlap, the nearest centre wins.
 *
 * Radii are set so the name appears a little before the "Press E" prompts
 * (a test checks this).
 */

export type LocationId = 'union' | 'foellinger' | 'about'

export interface LocationZone {
  id: LocationId
  label: string
  centre: readonly [number, number]
  radius: number
}

/** Extra distance needed to leave a zone once inside it. */
export const LOCATION_BUFFER = 3

export const LOCATION_ZONES: readonly LocationZone[] = [
  // Centred on the Quad Day row in front of the Union; reaches past the work board.
  { id: 'union', label: 'Illini Union', centre: [0, -127], radius: 34 },
  // Centred on the forecourt walk in front of Foellinger's entrance.
  { id: 'foellinger', label: 'Foellinger Auditorium', centre: [FOELLINGER_ENTRANCE.zone[0], FOELLINGER_ENTRANCE.zone[1]], radius: 16 },
  { id: 'about', label: 'Center Quad · About Me', centre: [ABOUT_ME_INSTALLATION.position[0], ABOUT_ME_INSTALLATION.position[2]], radius: 10 },
]

/** Shown when the player isn't in any zone. */
export const DEFAULT_LOCATION_LABEL = 'Exploring the Quad'

export const labelFor = (id: LocationId | null) => LOCATION_ZONES.find((z) => z.id === id)?.label ?? DEFAULT_LOCATION_LABEL

/** Zones as interaction points, so the shared nearest-with-hysteresis picker can choose between them. */
export const LOCATION_POINTS: readonly InteractionPoint[] = LOCATION_ZONES.map((z) => ({
  id: z.id,
  x: z.centre[0],
  z: z.centre[1],
  enter: z.radius,
  exit: z.radius + LOCATION_BUFFER,
}))

/** Interaction points inside each zone (used by tests to check the label leads the prompt). */
export const ZONE_INTERACTIONS: Record<LocationId, readonly { x: number; z: number; range: number }[]> = {
  union: [...BOOTHS.map((b) => ({ x: b.position[0], z: b.position[1], range: 4.5 })), { x: WORK_BOARD.position[0], z: WORK_BOARD.position[1], range: 4.5 }],
  foellinger: [{ x: FOELLINGER_ENTRANCE.zone[0], z: FOELLINGER_ENTRANCE.zone[1], range: FOELLINGER_ENTRANCE.range.enter }],
  about: [{ x: ABOUT_ME_INSTALLATION.position[0], z: ABOUT_ME_INSTALLATION.position[2], range: ABOUT_ME_INSTALLATION.range.enter }],
}

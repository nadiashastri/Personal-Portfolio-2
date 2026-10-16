import type { LocationId } from './locationZones'
import { FOELLINGER_WALKS, QUAD } from './quadLayout'
import { QUAD_DAY_ARRIVAL } from './quadDay'
import type { Viewpoint } from './viewpoints'
import { ABOUT_ME_INSTALLATION, EYE_HEIGHT, FOELLINGER_ENTRANCE, WORLD_BOUNDS } from './world'

/**
 * Guide "Quick Travel" destinations. Each arrival is a safe spot a few steps
 * short of the destination's interaction (so its prompt appears as soon as
 * the visitor walks forward), facing the object or entrance.
 */

export type DestinationId = 'center' | 'foellinger' | 'union'

export interface Destination {
  id: DestinationId
  title: string
  subtitle: string
  /** Area the top-left location label should show on arrival. */
  location: LocationId
  arrival: Viewpoint
}

/** Foellinger: on the diagonal walk, ~6.6 m back from where it meets the walk round the forecourt. */
function foellingerArrival(): Viewpoint {
  const [ax, az] = FOELLINGER_WALKS.apex
  // The south-east diagonal runs from the apex up to (halfWidth, southern cross walk).
  const dx = QUAD.halfWidth - ax
  const dz = QUAD.crossWalks[2] - az
  const len = Math.hypot(dx, dz)
  const back = 6.6
  return {
    position: [ax + (dx / len) * back, EYE_HEIGHT, az + (dz / len) * back],
    lookAt: FOELLINGER_ENTRANCE.promptAnchor,
  }
}

const [aboutX, , aboutZ] = ABOUT_ME_INSTALLATION.position

export const DESTINATIONS: readonly Destination[] = [
  {
    id: 'center',
    title: 'Center Quad',
    subtitle: 'About Me',
    location: 'about',
    // On the lawn south of the sign, just outside its 4.5 m prompt range, facing it.
    arrival: { position: [aboutX - 2.5, EYE_HEIGHT, aboutZ + 7], lookAt: [aboutX, 1.4, aboutZ] },
  },
  { id: 'foellinger', title: 'Foellinger Auditorium', subtitle: 'Projects', location: 'foellinger', arrival: foellingerArrival() },
  // Reuses the Quad Day arrival point: on the lawn, framing all four booths and the Union.
  { id: 'union', title: 'Illini Union', subtitle: 'Experience & Involvement', location: 'union', arrival: QUAD_DAY_ARRIVAL },
]

/** Looks up a destination; unknown ids (e.g. a removed "contact") return undefined. */
export function getDestination(id: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.id === id)
}

/** Basic sanity: an arrival must be at eye height inside the walkable area. */
export function isWithinWalkableArea({ position: [x, y, z] }: Viewpoint) {
  return (
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    y === EYE_HEIGHT &&
    x >= WORLD_BOUNDS.minX &&
    x <= WORLD_BOUNDS.maxX &&
    z >= WORLD_BOUNDS.minZ &&
    z <= WORLD_BOUNDS.maxZ
  )
}

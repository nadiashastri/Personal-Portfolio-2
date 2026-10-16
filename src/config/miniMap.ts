import { headingFromYaw } from '../lib/compass'
import { generateTrees } from '../scene/vegetation/treeLayout'
import { TREE_TYPES } from '../scene/vegetation/treeTypes'
import { MAIN as UNION_MAIN, UNION_TERRACE, WING as UNION_WING } from '../scene/architecture/IlliniUnion'
import { DRUM as FOELLINGER_DRUM, FRONT as FOELLINGER_FRONT } from '../scene/architecture/Foellinger'
import type { DestinationId } from './fastTravel'
import { FORECOURT, outline } from './foellingerForecourt'
import { BOOTHS, WORK_BOARD } from './quadDay'
import { ALTGELD_TOWER, FACADES, PATHS, PLAZAS, QUAD, SIDE_BUILDINGS } from './quadLayout'
import { ABOUT_ME_INSTALLATION, FOELLINGER_ENTRANCE } from './world'

/*
 * The mini-map is drawn in WORLD METRES: the SVG viewBox is the world's XZ
 * rectangle below, so every shape uses the scene's own coordinates.
 *
 * Orientation (verified against the scene): the camera at yaw 0 looks along
 * −Z, which is north (towards the Illini Union), and "strafe right" is +X,
 * which is east. A north-up map therefore needs no flips:
 *   map x = world x (east → right)     map y = world z (south → down)
 */

export const MAP_BOUNDS = { minX: -88, maxX: 88, minZ: -182, maxZ: 182 } as const
export const MAP_WIDTH = MAP_BOUNDS.maxX - MAP_BOUNDS.minX
export const MAP_HEIGHT = MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ
export const MAP_VIEWBOX = `${MAP_BOUNDS.minX} ${MAP_BOUNDS.minZ} ${MAP_WIDTH} ${MAP_HEIGHT}`

/** Keeps markers this far inside the map edge, so they're never cut off. */
const EDGE = 4

export interface MapPoint {
  /** SVG user units (= world metres). */
  x: number
  y: number
  /** Position as a fraction of the map's width / height (0…1), for HTML overlays. */
  u: number
  v: number
  /** True if the world point lay outside the map and was clamped to its edge. */
  clamped: boolean
}

/** Converts a world X/Z position to map coordinates, clamped to the visible map. */
export function worldToMap(x: number, z: number): MapPoint {
  const safeX = Number.isFinite(x) ? x : 0
  const safeZ = Number.isFinite(z) ? z : 0
  const cx = Math.min(MAP_BOUNDS.maxX - EDGE, Math.max(MAP_BOUNDS.minX + EDGE, safeX))
  const cz = Math.min(MAP_BOUNDS.maxZ - EDGE, Math.max(MAP_BOUNDS.minZ + EDGE, safeZ))
  return {
    x: cx,
    y: cz,
    u: (cx - MAP_BOUNDS.minX) / MAP_WIDTH,
    v: (cz - MAP_BOUNDS.minZ) / MAP_HEIGHT,
    clamped: cx !== safeX || cz !== safeZ,
  }
}

/** Arrow rotation in degrees, clockwise from map-up (north), for a camera yaw. */
export const arrowRotation = (yaw: number) => headingFromYaw(yaw).bearing

type Rect = { x: number; y: number; w: number; h: number }
const rect = (minX: number, minZ: number, maxX: number, maxZ: number): Rect => ({ x: minX, y: minZ, w: maxX - minX, h: maxZ - minZ })

/** Building footprints, taken from the architecture modules (world coordinates). */
function buildings() {
  const u = FACADES.union // facade line; the Union extends north (−Z) from it
  const union = {
    main: rect(-UNION_MAIN.w / 2, u - UNION_MAIN.d, UNION_MAIN.w / 2, u),
    wings: [-1, 1].map((side) => {
      const cx = side * (UNION_MAIN.w / 2 + UNION_WING.w / 2)
      return rect(cx - UNION_WING.w / 2, u - UNION_WING.setBack - UNION_WING.d, cx + UNION_WING.w / 2, u - UNION_WING.setBack)
    }),
    terrace: rect(-UNION_TERRACE.w / 2, u, UNION_TERRACE.w / 2, u + UNION_TERRACE.d),
    cupola: { x: 0, y: u - UNION_MAIN.d / 2 },
  }

  // Foellinger is rotated 180°: local +z points north, so world z = facade − local z.
  const f = FACADES.foellinger
  const foellinger = {
    front: rect(-FOELLINGER_FRONT.w / 2, f, FOELLINGER_FRONT.w / 2, f + FOELLINGER_FRONT.d),
    drum: { x: 0, y: f - FOELLINGER_DRUM.z, r: FOELLINGER_DRUM.r },
    forecourt: outline(0).map((p) => [-p.x, f - p.z] as const),
    bed: outline(FORECOURT.bed.outer, 'curve', 60).map((p) => [-p.x, f - p.z] as const),
    podium: rect(-FOELLINGER_FRONT.w / 2 - 0.4, f - FORECOURT.back, FOELLINGER_FRONT.w / 2 + 0.4, f),
  }

  // Side halls: `position` is the centre of the facade facing the Quad; depth runs away from it.
  const halls = SIDE_BUILDINGS.map((b) => {
    const [x, z] = b.position
    const away = Math.sign(x) // west halls extend to −X, east halls to +X
    return { id: b.id, ...rect(Math.min(x, x + away * b.depth), z - b.width / 2, Math.max(x, x + away * b.depth), z + b.width / 2) }
  })

  return { union, foellinger, halls, altgeld: { x: ALTGELD_TOWER[0], y: ALTGELD_TOWER[1] } }
}

/** Everything the map draws, derived once from the scene configuration. */
export function buildMapData() {
  const inside = (x: number, z: number, margin = 0) =>
    x > MAP_BOUNDS.minX - margin && x < MAP_BOUNDS.maxX + margin && z > MAP_BOUNDS.minZ - margin && z < MAP_BOUNDS.maxZ + margin
  return {
    lawn: rect(-QUAD.halfWidth, QUAD.north, QUAD.halfWidth, QUAD.south),
    paths: PATHS.map((p) => ({ from: p.from, to: p.to, width: p.width })),
    plazas: PLAZAS.map(([x0, z0, x1, z1]) => rect(x0, z0, x1, z1)),
    trees: generateTrees()
      .filter((t) => inside(t.position[0], t.position[1], 6))
      .map((t) => ({ x: t.position[0], y: t.position[1], r: TREE_TYPES[t.kind].spread * t.scale * 0.85, tint: t.tint })),
    booths: BOOTHS.map((b) => ({ id: b.org.id, x: b.position[0], y: b.position[1], rotation: (-b.rotationY * 180) / Math.PI, color: b.org.colors.primary })),
    workBoard: { x: WORK_BOARD.position[0], y: WORK_BOARD.position[1] },
    aboutMe: { x: ABOUT_ME_INSTALLATION.position[0], y: ABOUT_ME_INSTALLATION.position[2] },
    ...buildings(),
  }
}

export interface MapDestination {
  id: DestinationId
  label: string
  /** Where the marker pin sits (world X/Z). */
  at: readonly [number, number]
  tooltip: string
  icon: 'person' | 'code' | 'briefcase'
}

/** Destination pins: placed on open ground beside each landmark, clear of the drawings. */
export const MAP_DESTINATIONS: readonly MapDestination[] = [
  {
    id: 'union',
    label: 'Experience',
    at: [0, -112],
    tooltip: 'Illini Union · Quad Day booths for my student organizations, plus a board of my work experience.',
    icon: 'briefcase',
  },
  {
    id: 'center',
    label: 'About Me',
    at: [ABOUT_ME_INSTALLATION.position[0], ABOUT_ME_INSTALLATION.position[2] - 9],
    tooltip: 'Center Quad · Who I am, my education, skills and how to reach me.',
    icon: 'person',
  },
  {
    id: 'foellinger',
    label: 'Projects',
    at: [FOELLINGER_ENTRANCE.zone[0], FOELLINGER_ENTRANCE.zone[1] - 12],
    tooltip: 'Foellinger Auditorium · Step inside to browse my projects on the big screen.',
    icon: 'code',
  },
]

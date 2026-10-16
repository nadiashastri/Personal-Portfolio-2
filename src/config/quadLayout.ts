/**
 * The map of the Main Quad: every path, plaza, building footprint, tree and
 * prop position. Proportions follow the real Quad (reference photos in
 * references/), compressed to roughly 70% so walking it stays pleasant.
 *
 *   north (-Z)        Illini Union
 *                 ┌───────────────────┐
 *                 │ \               / │   north wedge: diagonals converge on the Union
 *   west (-X)     ├───────────────────┤   east (+X)
 *                 │    \         /    │
 *                 │       \   /       │   big X through the centre crossing
 *                 ├─────────X─────────┤   ← spawn (centre cross walk)
 *                 │       /   \       │
 *                 │    /         \    │
 *                 ├───────────────────┤
 *                 │ /               \ │   south wedge: diagonals converge on Foellinger
 *                 └───────────────────┘
 *   south (+Z)      Foellinger Auditorium
 */

import { forecourtWalks } from './foellingerForecourt'

export type Vec2 = readonly [x: number, z: number]

/** Lawn edges; perimeter walks run along these lines. */
export const QUAD = {
  halfWidth: 46,
  north: -124,
  // Leaves room in front of Foellinger for its curved terrace and planted bed.
  south: 120,
  /** E–W cross walks dividing the lawn into four sections. */
  crossWalks: [-62, 0, 62],
} as const

/** Facade planes of the buildings that frame the Quad. */
export const FACADES = {
  west: -61,
  east: 61,
  union: -140,
  foellinger: 136,
} as const

/** Walks shaped by Foellinger's forecourt (config/foellingerForecourt.ts). */
export const FOELLINGER_WALKS = forecourtWalks(FACADES.foellinger, QUAD.south, 62, 3.5)

export interface PathSegment {
  from: Vec2
  to: Vec2
  width: number
}

const W = QUAD.halfWidth
const [crossN, crossC, crossS] = QUAD.crossWalks

/** Sidewalk widths in metres — real campus walks are ~2–3.5 m. */
const MAIN = 3
const MINOR = 2.2

export const PATHS: PathSegment[] = [
  // Perimeter walks
  { from: [-W, QUAD.north], to: [-W, QUAD.south], width: MAIN },
  { from: [W, QUAD.north], to: [W, QUAD.south], width: MAIN },
  { from: [-62, QUAD.north], to: [62, QUAD.north], width: MAIN + 0.5 },
  // The south walk is split by Foellinger's forecourt; see FOELLINGER_WALKS below.
  // Cross walks
  ...QUAD.crossWalks.map((z): PathSegment => ({ from: [-W, z], to: [W, z], width: MINOR })),
  // The big X through the centre
  { from: [-W, crossN], to: [W, crossS], width: MINOR },
  { from: [W, crossN], to: [-W, crossS], width: MINOR },
  // Wedges converging on the two landmarks
  { from: [-W, crossN], to: [0, QUAD.north], width: MINOR },
  { from: [W, crossN], to: [0, QUAD.north], width: MINOR },
  // …converging on the apex of the walk around Foellinger's forecourt.
  { from: [-W, crossS], to: FOELLINGER_WALKS.apex, width: MINOR },
  { from: [W, crossS], to: FOELLINGER_WALKS.apex, width: MINOR },
  // Spurs from the perimeter walks to side-building entrances
  ...[-92, -31, 31, 92].flatMap((z): PathSegment[] => [
    { from: [-W, z], to: [FACADES.west, z], width: MINOR },
    { from: [W, z], to: [FACADES.east, z], width: MINOR },
  ]),
  // Approach walks into the plazas
  { from: [0, QUAD.north], to: [0, FACADES.union + 6], width: 4 },
  // Curved walk around Foellinger's forecourt, plus the two halves of the south walk.
  ...FOELLINGER_WALKS.segments,
  // Streets' sidewalks beyond the corners
  { from: [-62, QUAD.north], to: [-90, QUAD.north], width: MAIN },
  { from: [62, QUAD.north], to: [90, QUAD.north], width: MAIN },
  { from: [-62, QUAD.south], to: [-90, QUAD.south], width: MAIN },
  { from: [62, QUAD.south], to: [90, QUAD.south], width: MAIN },
]

/** Paved plazas in front of the landmarks: [minX, minZ, maxX, maxZ]. */
export const PLAZAS: readonly (readonly [number, number, number, number])[] = [
  [-24, FACADES.union - 0.5, 24, FACADES.union + 9],
]

export const CENTER_CROSSING: Vec2 = [0, crossC]

export interface BuildingSite {
  id: string
  /** Centre of the facade line facing the Quad. */
  position: Vec2
  /** Rotation so the building's local +Z faces the Quad. */
  rotation: number
  width: number
  depth: number
  floors: number
  roof: 'hip' | 'flat'
  brick: 'red' | 'warm' | 'dark'
  entrance: 'door' | 'portico'
  /** Stand-in for which real building this approximates. */
  note: string
}

const FACE_EAST = Math.PI / 2
const FACE_WEST = -Math.PI / 2

/**
 * Academic buildings lining the long sides. Simplified, but sized and
 * styled after the red-brick Georgian/Beaux-Arts halls along the real Quad.
 */
export const SIDE_BUILDINGS: BuildingSite[] = [
  { id: 'w1', position: [FACADES.west, -92], rotation: FACE_EAST, width: 40, depth: 20, floors: 3, roof: 'hip', brick: 'red', entrance: 'door', note: 'Henry Administration Building' },
  { id: 'w2', position: [FACADES.west, -31], rotation: FACE_EAST, width: 54, depth: 22, floors: 3, roof: 'flat', brick: 'warm', entrance: 'portico', note: 'Lincoln Hall' },
  { id: 'w3', position: [FACADES.west, 31], rotation: FACE_EAST, width: 46, depth: 20, floors: 3, roof: 'hip', brick: 'dark', entrance: 'door', note: 'Gregory Hall' },
  { id: 'w4', position: [FACADES.west, 92], rotation: FACE_EAST, width: 40, depth: 22, floors: 3, roof: 'hip', brick: 'red', entrance: 'door', note: 'Smith Memorial Hall' },
  { id: 'e1', position: [FACADES.east, -92], rotation: FACE_WEST, width: 42, depth: 20, floors: 3, roof: 'hip', brick: 'warm', entrance: 'door', note: 'English Building' },
  { id: 'e2', position: [FACADES.east, -31], rotation: FACE_WEST, width: 52, depth: 22, floors: 4, roof: 'flat', brick: 'red', entrance: 'door', note: 'Noyes Laboratory' },
  { id: 'e3', position: [FACADES.east, 31], rotation: FACE_WEST, width: 48, depth: 20, floors: 3, roof: 'hip', brick: 'dark', entrance: 'portico', note: 'Davenport Hall' },
  { id: 'e4', position: [FACADES.east, 92], rotation: FACE_WEST, width: 40, depth: 20, floors: 3, roof: 'hip', brick: 'warm', entrance: 'door', note: 'Natural History Building' },
]

/** Altgeld Hall's bell tower peeks over the trees north-west of the Quad. */
export const ALTGELD_TOWER: Vec2 = [-82, -168]

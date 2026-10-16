import { FACADES, type Vec2 } from '../config/quadLayout'
import { FORECOURT, lengthOf, outline, pointAt } from '../config/foellingerForecourt'
import { BOOTHS, WORK_BOARD } from '../config/quadDay'
import { ABOUT_ME_INSTALLATION, WORLD_BOUNDS } from '../config/world'
import { bedPolygon } from './architecture/foellingerTerrace'
import type { CircleCollider } from '../lib/movement'
import { createDetailMap, createPavingMap, type ShadeSpot } from './ground/groundMaps'
import { generateProps } from './props/propLayout'
import { generateShrubs, generateTrees } from './vegetation/treeLayout'
import { TREE_TYPES } from './vegetation/treeTypes'

/**
 * Everything derived from the Quad layout at start-up: plant placements,
 * the painted ground maps and the player's collision circles. Built once and
 * shared, so the ground shade, grass and collisions always agree.
 */
export function createWorldData() {
  const trees = generateTrees()
  const shrubs = generateShrubs()
  const props = generateProps()

  const shadeSpots: ShadeSpot[] = trees.map((t) => ({
    position: t.position,
    radius: TREE_TYPES[t.kind].spread * t.scale * 1.05,
    strength: 0.55,
  }))

  const margin = 2
  const colliders: CircleCollider[] = trees
    .filter(
      (t) =>
        t.position[0] > WORLD_BOUNDS.minX - margin &&
        t.position[0] < WORLD_BOUNDS.maxX + margin &&
        t.position[1] > WORLD_BOUNDS.minZ - margin &&
        t.position[1] < WORLD_BOUNDS.maxZ + margin,
    )
    .map((t) => ({ x: t.position[0], z: t.position[1], radius: TREE_TYPES[t.kind].trunk.radius * t.scale + 0.1 }))
  // A ring of circles just inside the bed's outer edge keeps the player off the forecourt.
  for (let i = 0, ring = outline(FORECOURT.bed.outer - 0.5), n = Math.ceil(lengthOf(ring)); i <= n; i++) {
    const p = pointAt(ring, (i / n) * lengthOf(ring))
    colliders.push({ x: -p.x, z: FACADES.foellinger - p.z, radius: 0.7 })
  }
  const [ax, , az] = ABOUT_ME_INSTALLATION.position
  // Quad Day: each booth's table (two circles) and tent legs; the work board's posts.
  for (const { position: [bx, bz], rotationY: r } of BOOTHS) {
    const c = Math.cos(r)
    const s = Math.sin(r)
    const at = (lx: number, lz: number) => ({ x: bx + lx * c + lz * s, z: bz - lx * s + lz * c })
    for (const lx of [-0.55, 0.55]) colliders.push({ ...at(lx, -0.2), radius: 0.62 })
    for (const lx of [-1.45, 1.45]) for (const lz of [-1.45, 1.45]) colliders.push({ ...at(lx, lz), radius: 0.12 })
    colliders.push({ ...at(1.8, 1.25), radius: 0.1 })
  }
  {
    const [wx, wz] = WORK_BOARD.position
    const r = WORK_BOARD.rotationY
    for (const lx of [-1.05, 0, 1.05]) colliders.push({ x: wx + lx * Math.cos(r), z: wz - lx * Math.sin(r), radius: 0.32 })
  }
  colliders.push({ x: ax, z: az, radius: ABOUT_ME_INSTALLATION.colliderRadius })
  for (const l of props.lamps) colliders.push({ x: l.position[0], z: l.position[2], radius: 0.2 })
  // Benches are ~1.8 m long: two circles along their length.
  for (const b of props.benches) {
    const r = b.rotationY ?? 0
    for (const s of [-0.5, 0.5]) colliders.push({ x: b.position[0] + Math.cos(r) * s, z: b.position[2] - Math.sin(r) * s, radius: 0.45 })
  }

  return {
    plants: [...trees, ...shrubs],
    props,
    colliders,
    // Foellinger's bed, from building-local space (rotated 180°) to world space.
    paving: createPavingMap([bedPolygon().map(([x, z]): Vec2 => [-x, FACADES.foellinger - z])]),
    detail: createDetailMap(shadeSpots),
  }
}

export type WorldData = ReturnType<typeof createWorldData>

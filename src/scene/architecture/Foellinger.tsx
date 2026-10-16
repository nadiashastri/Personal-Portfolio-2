import { useMemo } from 'react'
import {
  BufferAttribute,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { FACADES } from '../../config/quadLayout'
import { getMaterials } from '../materials/materials'
import { box, cylinder, merge, moulding, place, row } from './geometry'
import { PartList, Parts } from './kit'
import { FORECOURT } from '../../config/foellingerForecourt'
import { FoellingerTerrace } from './FoellingerTerraceView'
import { Instanced, type Transform } from './parts/Instanced'
import { Cresting, IonicColumns, ModelInstances, ORNAMENT_URLS } from './parts/ornaments'
import { WindowSet } from './parts/WindowSet'
import type { WindowSpec } from './parts/windows'

/*
 * Foellinger Auditorium (references 5, 7, 8, 11, 12). A Beaux-Arts front
 * block — six Ionic columns painted Illinois orange and blue, a flat stone
 * entablature, a brick attic with carved plaques and a green copper cornice —
 * with the ribbed blue-grey dome rising behind on a copper-crested drum.
 * There is no pediment. Local space: the facade faces +Z at z = 0; the group
 * is turned to face north up the Quad.
 */

const PODIUM = 1.8 // terrace / column platform height
const FRONT = { w: 42, d: 22 }
const COLUMN_H = 10.5
const ENT_Y = PODIUM + COLUMN_H // underside of the entablature (12.3)
const ENT_H = 3
const ATTIC_TOP = ENT_Y + ENT_H + 4.2 // brick attic above the entablature (19.5)
const CORNICE_TOP = ATTIC_TOP + 1.1
const COLONNADE = { halfW: 13.8, depth: 3.2 }
const COL_Z = 1.9
const COLUMN_R = 0.62
/** Front edge of the column platform; the forecourt (config/foellingerForecourt.ts) starts here. */
const PLATFORM_FRONT = FORECOURT.back
/** Entrance flight from the terrace up to the columns. */
const STEPS = 5
const STEP_RUN = 0.42
const STAIR_HALF_W = 10.4
const DOOR_X = [-8.8, 0, 8.8]
const DRUM = { r: 17, z: -20 }
const DRUM_TOP = CORNICE_TOP + 1.2
const SKIRT_H = 1.5
const DOME = { r: 16.8, h: 10.8, ribs: 24 }
/** The Blender dome's origin is the top of the drum. */
const DOME_TRANSFORM: Transform[] = [{ position: [0, DRUM_TOP, DRUM.z] }]

/**
 * Columns as in the photos: single blue columns at each end, and a coupled
 * pair either side of the centre door — orange outside, blue inside.
 */
const COLUMNS: { x: number; paint: 'orange' | 'blue' }[] = [
  { x: -12.4, paint: 'blue' },
  { x: -5.7, paint: 'orange' },
  { x: -3.5, paint: 'blue' },
  { x: 3.5, paint: 'blue' },
  { x: 5.7, paint: 'orange' },
  { x: 12.4, paint: 'blue' },
]

const DOOR: WindowSpec = { width: 3.2, height: 5.6, arched: true, cols: 4, rows: 2, head: 'keystone' }
const WING_LOWER: WindowSpec = { width: 1.8, height: 2.6, cols: 3, rows: 4, head: 'flat' }
const WING_UPPER: WindowSpec = { width: 1.9, height: 3, cols: 3, rows: 4, head: 'keystone' }
const DRUM_WINDOW: WindowSpec = { width: 1.8, height: 3.6, arched: true, cols: 3, rows: 4, head: 'keystone' }

/** Dome profile: a slightly flattened half-ellipse, UVs in metres. */
function domeGeometry() {
  const pts: Vector2[] = []
  for (let i = 0; i <= 28; i++) {
    const t = (i / 28) * (Math.PI / 2)
    pts.push(new Vector2(Math.max(DOME.r * Math.cos(t), 0.01), DOME.h * Math.pow(Math.sin(t), 0.92)))
  }
  const g = new LatheGeometry(pts, 120)
  const uv = g.attributes.uv as BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * DOME.r, uv.getY(i) * 26)
  return g
}

/** Pale standing-seam ribs following the dome's curve up to the lantern. */
function ribGeometry() {
  const ribs = []
  for (let i = 0; i < DOME.ribs; i++) {
    const a = (i / DOME.ribs) * Math.PI * 2
    const pts: Vector3[] = []
    for (let k = 0; k <= 18; k++) {
      const t = (k / 18) * (Math.PI / 2) * 0.86
      const r = (DOME.r + 0.05) * Math.cos(t)
      pts.push(new Vector3(Math.cos(a) * r, (DOME.h + 0.05) * Math.pow(Math.sin(t), 0.92), Math.sin(a) * r))
    }
    ribs.push(new TubeGeometry(new CatmullRomCurve3(pts), 28, 0.16, 5, false))
  }
  return merge(ribs)
}

/** Block "I" logo (as painted on the orange columns), centred, facing +Z. */
function blockI(scale: number) {
  const s = new Shape()
  const [w, h, bar, stem] = [0.5, 0.62, 0.15, 0.2].map((v) => v * scale)
  s.moveTo(-w / 2, -h / 2)
  s.lineTo(w / 2, -h / 2)
  s.lineTo(w / 2, -h / 2 + bar)
  s.lineTo(stem / 2, -h / 2 + bar)
  s.lineTo(stem / 2, h / 2 - bar)
  s.lineTo(w / 2, h / 2 - bar)
  s.lineTo(w / 2, h / 2)
  s.lineTo(-w / 2, h / 2)
  s.lineTo(-w / 2, h / 2 - bar)
  s.lineTo(-stem / 2, h / 2 - bar)
  s.lineTo(-stem / 2, -h / 2 + bar)
  s.lineTo(-w / 2, -h / 2 + bar)
  s.lineTo(-w / 2, -h / 2)
  return new ShapeGeometry(s)
}

/** Copper cresting ornament (a stylised anthemion). */
const crestGeometry = () => place(new ConeGeometry(0.26, 0.5, 4), [0, 0.25, 0], [0, Math.PI / 4, 0], [1, 1, 0.35])

function buildFoellinger() {
  const m = getMaterials()
  const parts = new PartList()
  const crests: Transform[] = []
  const fz = -FRONT.d / 2

  // --- Column platform (podium) under the building and portico, at PODIUM height.
  // In front of it sits the lower curved terrace (FoellingerTerraceView), reached by
  // a broad flight of steps through the middle.
  parts.add(m.limestone, place(box(FRONT.w + 0.8, PODIUM, FRONT.d + PLATFORM_FRONT), [0, PODIUM / 2, (PLATFORM_FRONT - FRONT.d) / 2]))
  parts.add(m.terraceCoping, place(box(FRONT.w + 1, 0.14, 0.5), [0, PODIUM - 0.07, PLATFORM_FRONT - 0.2]))
  const rise = (PODIUM - FORECOURT.height) / STEPS
  for (let i = 1; i < STEPS; i++) {
    const top = PODIUM - i * rise
    parts.add(m.stoneTrim, place(box(STAIR_HALF_W * 2, top - FORECOURT.height + 0.05, STEP_RUN), [0, (top + FORECOURT.height - 0.05) / 2, PLATFORM_FRONT + (i - 0.5) * STEP_RUN]))
  }
  const stairFoot = PLATFORM_FRONT + (STEPS - 1) * STEP_RUN
  // Stone cheek pedestals flanking the flight (Blender model, rendered below).
  const pedestals: Transform[] = [-1, 1].map((side) => ({
    position: [side * (STAIR_HALF_W + 0.6), FORECOURT.height, (PLATFORM_FRONT + stairFoot) / 2],
    scale: [1, (PODIUM - FORECOURT.height + 1.1) / 2.95, (stairFoot - PLATFORM_FRONT + 0.4) / 1.2],
  }))
  // Black handrails down the steps.
  const stepRun = stairFoot - PLATFORM_FRONT
  const drop = PODIUM - FORECOURT.height
  const railAngle = Math.atan2(drop, stepRun)
  for (const x of [-7, -2.4, 2.4, 7]) {
    parts.add(m.ironBlack, place(box(0.06, 0.06, Math.hypot(stepRun, drop) + 0.5), [x, FORECOURT.height + drop / 2 + 0.9, PLATFORM_FRONT + stepRun / 2], [railAngle, 0, 0]))
    for (const t of [0.12, 0.88]) parts.add(m.ironBlack, place(box(0.05, 0.9, 0.05), [x, PODIUM - drop * t + 0.45, PLATFORM_FRONT + stepRun * t]))
  }
  // Twin-globe lampposts standing on the terrace (Blender model, rendered below).
  const lamps: Transform[] = [-1, 1].map((side) => ({ position: [side * 15.5, PODIUM, PLATFORM_FRONT - 0.8] }))

  // --- Front block: brick walls, stone plinth course, entablature band, brick attic, copper cornice.
  parts.add(m.brick.red, place(box(FRONT.w, ATTIC_TOP - PODIUM, FRONT.d), [0, (PODIUM + ATTIC_TOP) / 2, fz]))
  parts.add(m.limestone, place(moulding(FRONT.w, FRONT.d, [[0.1, 0.6]]), [0, PODIUM, fz]))
  parts.add(m.limestone, place(moulding(FRONT.w, FRONT.d, [[0.08, 1.1], [0.16, 1.2], [0.4, 0.35], [0.55, 0.35]]), [0, ENT_Y, fz]))
  parts.add(m.copper, place(moulding(FRONT.w, FRONT.d, [[0.15, 0.3], [0.45, 0.35], [0.8, 0.45]]), [0, ATTIC_TOP, fz]))
  parts.add(m.lead, place(box(FRONT.w - 1, 0.3, FRONT.d - 1), [0, CORNICE_TOP + 0.1, fz]))
  for (let x = -FRONT.w / 2; x <= FRONT.w / 2 + 0.01; x += 1.75) crests.push({ position: [x, CORNICE_TOP, 0.75] })
  for (const side of [-1, 1]) for (let z = -FRONT.d; z <= 0; z += 1.75) crests.push({ position: [side * (FRONT.w / 2 + 0.75), CORNICE_TOP, z], rotationY: Math.PI / 2 })

  // Carved plaques in the attic: stone panels with a recessed inscription band.
  for (const x of row(7, 5.6)) {
    parts.add(m.limestone, place(box(3.2, 1.3, 0.16), [x, ENT_Y + ENT_H + 2.1, 0.08]))
    parts.add(m.lead, place(box(2.5, 0.22, 0.05), [x, ENT_Y + ENT_H + 2.1, 0.17]))
  }
  for (const side of [-1, 1]) {
    for (const z of row(3, 6.5)) {
      parts.add(m.limestone, place(box(0.16, 1.3, 3.2), [side * (FRONT.w / 2 + 0.08), ENT_Y + ENT_H + 2.1, fz + z]))
    }
  }

  // --- Colonnade: projecting entablature carried by the six painted columns.
  const cz = COLONNADE.depth / 2
  parts.add(m.limestone, place(box(COLONNADE.halfW * 2 + 0.6, 1.1, COLONNADE.depth), [0, ENT_Y + 0.55, cz]))
  parts.add(m.limestone, place(box(COLONNADE.halfW * 2 + 0.6, 1.2, COLONNADE.depth - 0.1), [0, ENT_Y + 1.7, cz]))
  parts.add(m.stoneTrim, place(box(COLONNADE.halfW * 2 + 1.4, 0.7, COLONNADE.depth + 0.6), [0, ENT_Y + 2.65, cz + 0.2]))
  // Pilasters on the wall answer each column.
  for (const { x } of COLUMNS) parts.add(m.limestone, place(box(1.1, COLUMN_H, 0.25), [x, PODIUM + COLUMN_H / 2, 0.12]))

  // Three arched entrances with bronze doors, stone medallions above.
  const doors: Transform[] = []
  for (const x of DOOR_X) {
    doors.push({ position: [x, PODIUM, 0.26] })
    parts.add(m.bronze, place(box(DOOR.width - 0.1, 3.6, 0.06), [x, PODIUM + 1.8, 0.3]))
    parts.add(m.limestone, place(box(DOOR.width + 1.2, 0.35, 0.3), [x, PODIUM + 0.17, 0.2]))
    const my = PODIUM + DOOR.height + 2.4
    parts.add(m.limestone, place(box(2.6, 2.6, 0.2), [x, my, 0.12]))
    parts.add(m.stoneTrim, place(new TorusGeometry(0.85, 0.09, 8, 32), [x, my, 0.24]))
  }

  // Wings either side of the colonnade: two storeys of stone-framed windows.
  const wingLower: Transform[] = []
  const wingUpper: Transform[] = []
  for (const side of [-1, 1]) {
    const x = side * ((COLONNADE.halfW + FRONT.w / 2) / 2 + 0.3)
    wingLower.push({ position: [x, PODIUM + 1.3, 0] })
    wingUpper.push({ position: [x, PODIUM + 6.6, 0] })
    for (const dz of row(3, 6.5)) {
      const r = side * (Math.PI / 2)
      wingLower.push({ position: [side * (FRONT.w / 2), PODIUM + 1.3, fz + dz], rotationY: r })
      wingUpper.push({ position: [side * (FRONT.w / 2), PODIUM + 6.6, fz + dz], rotationY: r })
    }
  }
  parts.addWindows(DOOR, doors).addWindows(WING_LOWER, wingLower).addWindows(WING_UPPER, wingUpper)

  // --- Drum, copper cornice with cresting, window skirt, ribbed dome, lantern.
  parts.add(m.brick.red, place(cylinder(DRUM.r, DRUM.r, DRUM_TOP, 96, true), [0, DRUM_TOP / 2, DRUM.z]))
  parts.add(m.limestone, place(cylinder(DRUM.r + 0.3, DRUM.r + 0.3, ENT_H, 96, true), [0, ENT_Y + ENT_H / 2, DRUM.z]))
  parts.add(m.copper, place(cylinder(DRUM.r + 0.9, DRUM.r + 0.2, 0.9, 96), [0, DRUM_TOP - 0.45, DRUM.z]))
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2
    crests.push({ position: [Math.sin(a) * (DRUM.r + 0.75), DRUM_TOP, DRUM.z + Math.cos(a) * (DRUM.r + 0.75)], rotationY: a })
  }
  // Skirt, dome and lantern: modelled in Blender (foellinger_dome.glb); this simpler
  // version shows while it loads.
  const domeFallback = new PartList()
  domeFallback.add(m.domeMetal, place(cylinder(DOME.r, DOME.r + 0.15, SKIRT_H, 96, true), [0, DRUM_TOP + SKIRT_H / 2, DRUM.z]))
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2
    const r = DOME.r + 0.12
    domeFallback.add(m.lead, place(box(0.7, 0.75, 0.06), [Math.sin(a) * r, DRUM_TOP + SKIRT_H / 2, DRUM.z + Math.cos(a) * r], [0, a, 0]))
  }
  const domeBase = DRUM_TOP + SKIRT_H
  domeFallback.add(m.domeRib, place(cylinder(DOME.r + 0.3, DOME.r + 0.3, 0.3, 96), [0, domeBase, DRUM.z]))
  domeFallback.add(m.domeMetal, place(domeGeometry(), [0, domeBase, DRUM.z]))
  domeFallback.add(m.domeRib, place(ribGeometry(), [0, domeBase, DRUM.z]))
  // Lantern: ring, low drum with a tiny railing, cap and finial.
  const crown = domeBase + DOME.h * 0.97
  domeFallback.add(m.domeRib, place(new CylinderGeometry(3.3, 3.5, 0.5, 40), [0, crown, DRUM.z]))
  domeFallback.add(m.lead, place(new CylinderGeometry(2.4, 2.6, 1.3, 32), [0, crown + 0.9, DRUM.z]))
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    domeFallback.add(m.domeRib, place(box(0.06, 0.6, 0.06), [Math.sin(a) * 3.1, crown + 0.55, DRUM.z + Math.cos(a) * 3.1]))
  }
  domeFallback.add(m.domeRib, place(new CylinderGeometry(3.2, 3.2, 0.08, 40, 1, true), [0, crown + 0.85, DRUM.z]))
  domeFallback.add(m.domeMetal, place(new SphereGeometry(2.6, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), [0, crown + 1.55, DRUM.z], [0, 0, 0], [1, 0.45, 1]))
  domeFallback.add(m.ironBlack, place(new CylinderGeometry(0.05, 0.12, 1.6, 8), [0, crown + 3.1, DRUM.z]))

  const drumWindows: Transform[] = []
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + Math.PI / 20
    // Skip the front half, which sits inside the front block.
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 1.75) continue
    drumWindows.push({ position: [Math.sin(a) * (DRUM.r + 0.04), PODIUM + 3, DRUM.z + Math.cos(a) * (DRUM.r + 0.04)], rotationY: a })
  }
  parts.addWindows(DRUM_WINDOW, drumWindows)

  return { parts: parts.build(), domeFallback: domeFallback.build(), windows: parts.windows, crests, pedestals, lamps }
}

export function Foellinger() {
  const building = useMemo(buildFoellinger, [])
  const m = getMaterials()
  const crest = useMemo(crestGeometry, [])
  const fallbacks = useMemo(
    () => ({
      pedestal: box(1.2, PODIUM + 1.15, 1.2).translate(0, (PODIUM + 1.15) / 2, 0),
      lampIron: merge([
        place(new CylinderGeometry(0.06, 0.09, 3.8, 10), [0, 1.9, 0]),
        place(box(1.3, 0.07, 0.07), [0, 3.75, 0]),
      ]),
      lampGlobes: merge([-0.6, 0.6].map((dx) => place(new SphereGeometry(0.25, 16, 12), [dx, 4.12, 0]))),
    }),
    [],
  )
  const logos = useMemo(() => ({ back: blockI(1.25), front: blockI(1) }), [])

  const byPaint = (paint: 'orange' | 'blue') =>
    COLUMNS.filter((c) => c.paint === paint).map((c): Transform => ({ position: [c.x, PODIUM, COL_Z] }))
  const orange = byPaint('orange')
  // The block I sits about a third of the way up each orange column, on its front face.
  const logoAt = (dz: number) => orange.map((t): Transform => ({ position: [t.position[0], PODIUM + 4.3, COL_Z + COLUMN_R * 0.93 + dz] }))

  return (
    <group position={[0, 0, FACADES.foellinger]} rotation={[0, Math.PI, 0]}>
      <Parts parts={building.parts} />
      {building.windows.map((w, i) => (
        <WindowSet key={i} spec={w.spec} placements={w.placements} />
      ))}
      <IonicColumns
        height={COLUMN_H}
        radius={COLUMN_R}
        fluted={false}
        shafts={[
          { material: m.paintOrange, transforms: orange },
          { material: m.paintBlue, transforms: byPaint('blue') },
        ]}
        trimMaterial={m.whitePaint}
      />
      <Instanced geometry={logos.back} material={m.whitePaint} transforms={logoAt(0.02)} />
      <Instanced geometry={logos.front} material={m.navy} transforms={logoAt(0.035)} />
      <Cresting transforms={building.crests} fallbackGeometry={crest} />
      <ModelInstances url={ORNAMENT_URLS.foellingerDome} transforms={DOME_TRANSFORM} fallback={<Parts parts={building.domeFallback} />} />
      <ModelInstances
        url={ORNAMENT_URLS.stairPedestal}
        transforms={building.pedestals}
        fallback={<Instanced geometry={fallbacks.pedestal} material={m.limestone} transforms={building.pedestals} castShadow />}
      />
      <ModelInstances
        url={ORNAMENT_URLS.lampTwinGlobe}
        transforms={building.lamps}
        fallback={
          <>
            <Instanced geometry={fallbacks.lampIron} material={m.ironBlack} transforms={building.lamps} castShadow />
            <Instanced geometry={fallbacks.lampGlobes} material={m.lampGlass} transforms={building.lamps} />
          </>
        }
      />
      <FoellingerTerrace />
    </group>
  )
}

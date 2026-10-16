import { Suspense, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { Matrix4, type BufferGeometry, type Material, type Mesh } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getMaterials } from '../../materials/materials'
import { createIonicColumnParts } from './classical'
import { Instanced, type Transform } from './Instanced'

/**
 * Ornaments modelled in Blender (see blender/build_assets.py, `npm run assets`).
 * They carry ambient occlusion baked into vertex colours.
 */
export const ORNAMENT_URLS = {
  ionicCapital: '/models/ionic_capital.glb',
  anthemion: '/models/anthemion.glb',
  baluster: '/models/baluster.glb',
  balustradeBay: '/models/balustrade_bay.glb',
  balustradePost: '/models/balustrade_post.glb',
  stairPedestal: '/models/stair_pedestal.glb',
  lampTwinGlobe: '/models/lamp_twin_globe.glb',
  lampLantern: '/models/lamp_lantern.glb',
  foellingerDome: '/models/foellinger_dome.glb',
  unionCupola: '/models/union_cupola.glb',
} as const

type MaterialKey = keyof ReturnType<typeof getMaterials>

for (const url of Object.values(ORNAMENT_URLS)) useGLTF.preload(url)

/**
 * Loads a GLB and returns one instanceable geometry per part. Parts are named
 * in Blender after the material they should use ("stoneTrim", "ironBlack"…).
 */
function useModelParts(url: string): { key: string; geometry: BufferGeometry }[] {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    scene.updateMatrixWorld(true)
    const byKey = new Map<string, BufferGeometry[]>()
    scene.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      // glTF may suffix duplicate names ("stoneTrim_1"); the prefix is the material key.
      const key = mesh.name.replace(/[_.]\d+$/, '')
      const list = byKey.get(key) ?? []
      list.push(mesh.geometry.clone().applyMatrix4(new Matrix4().copy(mesh.matrixWorld)))
      byKey.set(key, list)
    })
    return [...byKey].map(([key, list]) => ({ key, geometry: mergeGeometries(list) ?? list[0] }))
  }, [scene])
}

/** Same material with baked-AO vertex colours switched on. */
const aoVariants = new WeakMap<Material, Material>()
function withBakedAO(material: Material) {
  let variant = aoVariants.get(material)
  if (!variant) {
    variant = material.clone()
    ;(variant as Material & { vertexColors: boolean }).vertexColors = true
    aoVariants.set(material, variant)
  }
  return variant
}

interface ModelInstancesProps {
  url: string
  /** Overrides the per-part material (e.g. capitals in white paint vs limestone). */
  material?: Material
  transforms: readonly Transform[]
  castShadow?: boolean
  /** Shown instantly while the model streams in (and if it fails). */
  fallback: ReactNode
}

function LoadedModelInstances({ url, material, transforms, castShadow = true }: Omit<ModelInstancesProps, 'fallback'>) {
  const parts = useModelParts(url)
  const materials = getMaterials()
  return (
    <>
      {parts.map(({ key, geometry }) => {
        const base = material ?? (materials[key as MaterialKey] as Material | undefined) ?? materials.stoneTrim
        return <Instanced key={key} geometry={geometry} material={withBakedAO(base)} transforms={transforms} castShadow={castShadow} />
      })}
    </>
  )
}

export function ModelInstances({ fallback, ...props }: ModelInstancesProps) {
  return (
    <Suspense fallback={fallback}>
      <LoadedModelInstances {...props} />
    </Suspense>
  )
}

interface IonicColumnsProps {
  height: number
  radius: number
  fluted?: boolean
  /** Shaft groups, each with its own material (stone, or Foellinger's painted colours). */
  shafts: readonly { material: Material; transforms: readonly Transform[] }[]
  trimMaterial: Material
}

/**
 * A run of Ionic columns: instanced shafts and bases, topped with the
 * Blender-modelled capital (spiral volutes, egg-and-dart) once it has loaded.
 */
export function IonicColumns({ height, radius, fluted = true, shafts, trimMaterial }: IonicColumnsProps) {
  const column = useMemo(() => createIonicColumnParts(height, radius, fluted), [height, radius, fluted])
  const all = useMemo(() => shafts.flatMap((s) => s.transforms), [shafts])
  const capitals = useMemo(
    () =>
      all.map((t): Transform => ({
        position: [t.position[0], t.position[1] + column.capitalY, t.position[2]],
        rotationY: t.rotationY,
        scale: [column.capitalScale, column.capitalScale, column.capitalScale],
      })),
    [all, column],
  )

  return (
    <>
      {shafts.map((s, i) => (
        <Instanced key={i} geometry={column.shaft} material={s.material} transforms={s.transforms} castShadow />
      ))}
      <ModelInstances
        url={ORNAMENT_URLS.ionicCapital}
        material={trimMaterial}
        transforms={capitals}
        fallback={<Instanced geometry={column.trim} material={trimMaterial} transforms={all} castShadow />}
      />
      <Suspense fallback={null}>
        {/* Bases render alongside the modelled capitals (the fallback trim already includes them). */}
        <BasesWhenLoaded geometry={column.base} material={trimMaterial} transforms={all} />
      </Suspense>
    </>
  )
}

function BasesWhenLoaded(props: { geometry: BufferGeometry; material: Material; transforms: readonly Transform[] }) {
  useGLTF(ORNAMENT_URLS.ionicCapital)
  return <Instanced {...props} castShadow />
}

/** Copper cresting: Blender palmettes, with simple cones as the fallback. */
export function Cresting({ transforms, fallbackGeometry }: { transforms: readonly Transform[]; fallbackGeometry: BufferGeometry }) {
  const copper = getMaterials().copper
  return (
    <ModelInstances
      url={ORNAMENT_URLS.anthemion}
      material={copper}
      transforms={transforms}
      fallback={<Instanced geometry={fallbackGeometry} material={copper} transforms={transforms} />}
    />
  )
}

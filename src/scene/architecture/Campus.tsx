import { SIDE_BUILDINGS, type BuildingSite } from '../../config/quadLayout'
import { AcademicBuilding } from './AcademicBuilding'
import { AltgeldTower } from './AltgeldTower'
import { Foellinger } from './Foellinger'
import { IlliniUnion } from './IlliniUnion'

/** Plainer buildings behind the Quad's edges, mostly glimpsed between trees. */
const BACKDROP: BuildingSite[] = [
  { id: 'bn1', position: [70, -170], rotation: 0, width: 50, depth: 24, floors: 4, roof: 'flat', brick: 'dark', entrance: 'door', note: 'north-east backdrop' },
  { id: 'bs1', position: [-62, 182], rotation: Math.PI, width: 44, depth: 20, floors: 3, roof: 'hip', brick: 'red', entrance: 'door', note: 'south-west backdrop' },
  { id: 'bs2', position: [64, 180], rotation: Math.PI, width: 46, depth: 20, floors: 4, roof: 'flat', brick: 'warm', entrance: 'door', note: 'south-east backdrop' },
]

/** Every building around the Quad. */
export function Campus() {
  return (
    <>
      <IlliniUnion />
      <Foellinger />
      <AltgeldTower />
      {[...SIDE_BUILDINGS, ...BACKDROP].map((site) => (
        <AcademicBuilding key={site.id} site={site} />
      ))}
    </>
  )
}

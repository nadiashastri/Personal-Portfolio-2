import { useMemo, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { NeutralToneMapping } from 'three'
import type { Viewpoint } from '../config/viewpoints'
import { FirstPersonController } from '../player/FirstPersonController'
import { Campus } from './architecture/Campus'
import { Atmosphere } from './environment/Atmosphere'
import { Lighting } from './environment/Lighting'
import { Ground } from './ground/Ground'
import { PerfProbe, statsEnabled } from './PerfProbe'
import { Props } from './props/Props'
import { GrassField } from './vegetation/GrassField'
import { Vegetation } from './vegetation/Vegetation'
import { FOELLINGER_ENTRANCE } from '../config/world'
import { AboutMeInstallation } from './installations/AboutMeInstallation'
import { InteractionZone } from './installations/InteractionZone'
import { QuadDay } from './union/QuadDay'
import { HeadingTracker } from './installations/HeadingTracker'
import { LocationTracker } from './installations/LocationTracker'
import type { LocationId } from '../config/locationZones'
import { createWorldData } from './worldData'

interface ExperienceProps {
  controlsEnabled: boolean
  start: Viewpoint
  /** Play the opening camera settle (title screen only). */
  settle?: boolean
  /** The player walked into / out of the About Me installation's range. */
  onAboutRangeChange?: (inRange: boolean) => void
  /** Screen-space prompt that the installation keeps positioned above itself. */
  aboutPromptRef?: RefObject<HTMLDivElement | null>
  /** The player walked into / out of range of Foellinger's entrance. */
  onFoellingerRangeChange?: (inRange: boolean) => void
  foellingerPromptRef?: RefObject<HTMLDivElement | null>
  /** The nearest Quad Day booth/board in range (id) or null. */
  onQuadDayTargetChange?: (id: string | null) => void
  quadDayPromptRef?: RefObject<HTMLDivElement | null>
  /** The named area the player is in changed (top-left location label). */
  onLocationChange?: (id: LocationId | null) => void
  /** Compass needle and facing-direction text, driven from the camera. */
  compassNeedleRef?: RefObject<SVGGElement | null>
  compassHeadingRef?: RefObject<HTMLElement | null>
  /** Instantly moves the player (e.g. back outside Foellinger). */
  teleport?: Viewpoint & { key: number }
  /** False while another scene (the auditorium) is showing: the Quad stops rendering. */
  active?: boolean
}

/** Fewer grass blades on phones and tablets. */
const GRASS_BLADES =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 20000 : 60000

/** Full-screen 3D canvas: environment, the Quad and the player. */
export function Experience({ controlsEnabled, start, settle = false, onAboutRangeChange, aboutPromptRef, onFoellingerRangeChange, foellingerPromptRef, onQuadDayTargetChange, quadDayPromptRef, onLocationChange, compassNeedleRef, compassHeadingRef, teleport, active = true }: ExperienceProps) {
  const world = useMemo(createWorldData, [])

  return (
    <div className="fixed inset-0" aria-hidden>
      <Canvas
        shadows="percentage"
        frameloop={active ? 'always' : 'never'}
        dpr={[1, 2]}
        camera={{ fov: 68, near: 0.1, far: 1500 }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping }}
      >
        <AdaptiveDpr pixelated={false} />
        <Atmosphere />
        <Lighting />
        <Ground paving={world.paving} detail={world.detail} />
        <GrassField paving={world.paving} count={GRASS_BLADES} />
        <Campus />
        <Vegetation plants={world.plants} />
        <Props layout={world.props} />
        <AboutMeInstallation onRangeChange={onAboutRangeChange ?? (() => {})} promptRef={aboutPromptRef} />
        <LocationTracker onChange={onLocationChange ?? (() => {})} />
        <HeadingTracker needleRef={compassNeedleRef} headingRef={compassHeadingRef} />
        <QuadDay promptRef={quadDayPromptRef} onTargetChange={onQuadDayTargetChange ?? (() => {})} />
        <InteractionZone
          centre={FOELLINGER_ENTRANCE.zone}
          range={FOELLINGER_ENTRANCE.range}
          promptAnchor={FOELLINGER_ENTRANCE.promptAnchor}
          promptRef={foellingerPromptRef}
          onRangeChange={onFoellingerRangeChange ?? (() => {})}
        />
        {statsEnabled && <PerfProbe />}
        <FirstPersonController enabled={controlsEnabled} start={start} colliders={world.colliders} settle={settle} teleport={teleport} />
      </Canvas>
    </div>
  )
}

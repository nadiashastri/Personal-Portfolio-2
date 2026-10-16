import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { VIEWPOINTS, getRequestedViewpoint, type Viewpoint } from './config/viewpoints'
import { getDestination, isWithinWalkableArea } from './config/fastTravel'
import { labelFor, type LocationId } from './config/locationZones'
import { WORK_BOARD_ID } from './config/quadDay'
import { FOELLINGER_ENTRANCE } from './config/world'
import { ORGANIZATIONS } from './content/involvement'
import { isPointerLockSupported, usePointerLock } from './hooks/usePointerLock'
import { AuditoriumScene } from './scene/auditorium/AuditoriumScene'
import { Experience } from './scene/Experience'
import { ControlsHint, Crosshair } from './ui/HUD'
import { IntroOverlay } from './ui/IntroOverlay'
import { AboutMeCard, type CloseReason } from './ui/AboutMeCard'
import { InteractionPrompt } from './ui/InteractionPrompt'
import { LocationCompass } from './ui/LocationCompass'
import { NavigationGuide } from './ui/NavigationGuide'
import { OrganizationCard } from './ui/OrganizationCard'
import { WorkExperienceBoard } from './ui/WorkExperienceBoard'
import { ProjectShowcase, type ExitReason } from './ui/ProjectShowcase'
import { ResumePrompt } from './ui/ResumePrompt'

type Phase = 'intro' | 'exploring'
/** Which 3D scene is showing: the Quad, or Foellinger's auditorium. */
type Place = 'quad' | 'auditorium'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
/** Each half of the navy fade between the Quad and the auditorium. */
const SCENE_FADE_MS = prefersReducedMotion() ? 120 : 550
/** Each half of a Quick Travel fade (~0.6 s round trip; near-instant with reduced motion). */
const TRAVEL_FADE_MS = prefersReducedMotion() ? 60 : 300

/** `?view=<name>` skips the intro and opens a review viewpoint (see config/viewpoints.ts). */
const reviewView = getRequestedViewpoint()
/** `?scene=auditorium` opens straight into Foellinger's showcase, for reviewing it. */
const reviewAuditorium = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('scene') === 'auditorium'
const startView = VIEWPOINTS[reviewView ?? 'spawn']

export default function App() {
  const [phase, setPhase] = useState<Phase>(reviewView || reviewAuditorium ? 'exploring' : 'intro')
  // In review mode the pause card stays hidden until the visitor first takes control.
  const [hasLocked, setHasLocked] = useState(!reviewView && !reviewAuditorium)
  const [guideOpen, setGuideOpen] = useState(false)
  const { isLocked, requestLock, exitLock } = usePointerLock()
  const [canLock] = useState(isPointerLockSupported)
  // About Me interaction
  const [aboutInRange, setAboutInRange] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  /** Once read, reopening shows the card without replaying the typing. */
  const [aboutRead, setAboutRead] = useState(false)
  /** After closing with Esc the browser needs a click to recapture the mouse. */
  const [softResume, setSoftResume] = useState(false)
  const aboutPromptRef = useRef<HTMLDivElement>(null)
  // Foellinger project showcase
  const [foellingerInRange, setFoellingerInRange] = useState(false)
  const [place, setPlace] = useState<Place>(reviewAuditorium ? 'auditorium' : 'quad')
  const [fading, setFading] = useState(false)
  const [fadeMs, setFadeMs] = useState(SCENE_FADE_MS)
  /** Set synchronously so rapid clicks can't start overlapping trips. */
  const travellingRef = useRef(false)
  const [travelling, setTravelling] = useState(false)
  const teleportKey = useRef(0)
  const compassNeedleRef = useRef<SVGGElement>(null)
  const compassHeadingRef = useRef<HTMLSpanElement>(null)
  const [teleport, setTeleport] = useState<(Viewpoint & { key: number }) | undefined>()
  const foellingerPromptRef = useRef<HTMLDivElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const fadeTimer = useRef<number | undefined>(undefined)
  // Quad Day (Illini Union): nearest booth/board in range, and the open panel.
  const [quadDayTarget, setQuadDayTarget] = useState<string | null>(null)
  const [panel, setPanel] = useState<string | null>(null)
  const quadDayPromptRef = useRef<HTMLDivElement>(null)
  /** Named area the player is in, for the top-left location label. */
  const [locationId, setLocationId] = useState<LocationId | null>(null)
  /** Any in-world popup open: only one at a time. */
  const dialogOpen = aboutOpen || panel !== null
  useEffect(() => () => window.clearTimeout(fadeTimer.current), [])

  useEffect(() => {
    if (isLocked) {
      setHasLocked(true)
      setSoftResume(false)
    }
  }, [isLocked])

  const exploring = phase === 'exploring'
  const onQuad = place === 'quad' && !fading
  const controlsEnabled = exploring && (isLocked || !canLock) && !dialogOpen && !guideOpen && onQuad

  const start = () => {
    setPhase('exploring')
    setGuideOpen(false)
    // Must run synchronously inside the click handler to count as a user gesture.
    requestLock()
  }

  const setGuide = useCallback(
    (open: boolean) => {
      if (open) {
        exitLock()
        setSoftResume(false)
      } else if (canLock && !travellingRef.current) {
        // Closing the guide can't recapture the mouse by itself: offer a click to resume.
        setSoftResume(true)
      }
      setGuideOpen(open)
    },
    [exitLock, canLock],
  )

  // "G" toggles the guide from anywhere, releasing the mouse so it can be used.
  // "E" opens About Me — only within range, and never twice.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || dialogOpen) return
      if (e.code === 'KeyG') setGuide(!guideOpen)
      if (e.code !== 'KeyE' || !exploring || guideOpen || !onQuad) return
      if (aboutInRange) {
        exitLock()
        setSoftResume(false)
        setAboutOpen(true)
      } else if (quadDayTarget) {
        exitLock()
        setSoftResume(false)
        setPanel(quadDayTarget)
      } else if (foellingerInRange) {
        enterFoellinger()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /** Fade to navy, swap scenes at the darkest point, then fade back in. */
  const crossFade = useCallback((swap: () => void, ms: number = SCENE_FADE_MS) => {
    setFadeMs(ms)
    setFading(true)
    window.clearTimeout(fadeTimer.current)
    fadeTimer.current = window.setTimeout(() => {
      swap()
      setFading(false)
    }, ms)
  }, [])

  /**
   * Quick Travel from the guide: close it, fade to navy, move the player to the
   * destination's safe arrival point (facing its interaction) while the
   * screen is covered, then fade back in. Never opens the destination's popup.
   */
  const fastTravel = (id: string) => {
    const destination = getDestination(id)
    if (!destination || !isWithinWalkableArea(destination.arrival) || travellingRef.current || dialogOpen) return
    travellingRef.current = true
    setTravelling(true)
    setGuideOpen(false)
    setSoftResume(false)
    setPhase('exploring')
    // The guide click is a user gesture, so the mouse can be recaptured now.
    if (canLock) requestLock()
    crossFade(() => {
      setPlace('quad')
      teleportKey.current += 1
      setTeleport({ ...destination.arrival, key: teleportKey.current })
      setLocationId(destination.location)
      // Allow the next trip once this one has faded back in.
      window.setTimeout(() => {
        travellingRef.current = false
        setTravelling(false)
      }, TRAVEL_FADE_MS)
    }, TRAVEL_FADE_MS)
  }

  const enterFoellinger = () => {
    exitLock()
    setSoftResume(false)
    crossFade(() => setPlace('auditorium'))
  }

  const exitFoellinger = useCallback(
    (reason: ExitReason) => {
      // A click can recapture the mouse straight away; Escape needs a click to resume.
      if (reason === 'button' && canLock) requestLock()
      crossFade(() => {
        setPlace('quad')
        teleportKey.current += 1
        setTeleport({ ...FOELLINGER_ENTRANCE.returnTo, key: teleportKey.current })
        if (reason === 'escape' && canLock) setSoftResume(true)
      })
    },
    [canLock, requestLock, crossFade],
  )

  /** After any popup closes: recapture the mouse on a click, or offer click-to-resume after Escape. */
  const resumeAfterDialog = useCallback(
    (reason: CloseReason) => {
      // A click on the close button is a user gesture, so the mouse can be recaptured at once.
      // Escape can't recapture it (browsers forbid that), so offer a gentle click-to-resume.
      if (reason === 'button' && canLock) requestLock()
      else if (canLock) setSoftResume(true)
    },
    [canLock, requestLock],
  )
  const closeAbout = useCallback(
    (reason: CloseReason) => {
      setAboutOpen(false)
      resumeAfterDialog(reason)
    },
    [resumeAfterDialog],
  )
  const closePanel = useCallback(
    (reason: CloseReason) => {
      setPanel(null)
      resumeAfterDialog(reason)
    },
    [resumeAfterDialog],
  )
  const openOrg = ORGANIZATIONS.find((o) => o.id === panel)
  const promptOrg = ORGANIZATIONS.find((o) => o.id === quadDayTarget)
  const markAboutRead = useCallback(() => setAboutRead(true), [])
  const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative h-full w-full select-none">
        <Experience
          controlsEnabled={controlsEnabled}
          start={startView}
          settle={!reviewView && !reviewAuditorium}
          onAboutRangeChange={setAboutInRange}
          aboutPromptRef={aboutPromptRef}
          onFoellingerRangeChange={setFoellingerInRange}
          foellingerPromptRef={foellingerPromptRef}
          onQuadDayTargetChange={setQuadDayTarget}
          onLocationChange={setLocationId}
          compassNeedleRef={compassNeedleRef}
          compassHeadingRef={compassHeadingRef}
          quadDayPromptRef={quadDayPromptRef}
          teleport={teleport}
          active={place === 'quad'}
        />
        <InteractionPrompt
          anchorRef={quadDayPromptRef}
          visible={exploring && onQuad && quadDayTarget !== null && !dialogOpen}
          title={promptOrg ? promptOrg.name.toUpperCase() : 'WORK EXPERIENCE'}
          action={promptOrg ? 'Learn more' : 'View experience'}
        />
        <InteractionPrompt
          anchorRef={foellingerPromptRef}
          visible={exploring && onQuad && foellingerInRange}
          title="PROJECT SHOWCASE"
          action="Enter Foellinger"
        />
        {place === 'auditorium' && <AuditoriumScene screenRef={screenRef} />}
        <AnimatePresence>
          {place === 'auditorium' && !fading && <ProjectShowcase screenRef={screenRef} onExit={exitFoellinger} />}
        </AnimatePresence>
        <InteractionPrompt
          anchorRef={aboutPromptRef}
          visible={exploring && onQuad && aboutInRange && !dialogOpen}
          title="ABOUT ME"
          action="Press E to get to know me"
        />
        <p className="sr-only" aria-live="polite">
          {exploring && aboutInRange && !aboutOpen ? 'About Me is nearby. Press E to open it.' : ''}
        </p>

        <AnimatePresence>{phase === 'intro' && <IntroOverlay onStart={start} />}</AnimatePresence>

        <AnimatePresence>
          {exploring && onQuad && canLock && !isLocked && !guideOpen && hasLocked && !dialogOpen && !softResume && (
            <ResumePrompt onResume={requestLock} />
          )}
        </AnimatePresence>
        {exploring && onQuad && softResume && !isLocked && !dialogOpen && (
          <button
            type="button"
            onClick={requestLock}
            className="fixed inset-0 z-10 flex cursor-pointer items-end justify-center pb-24"
          >
            <span className="rounded-full bg-illini-blue/90 px-4 py-2 font-sans text-sm font-semibold text-cream shadow-chip">
              Click to resume exploring
            </span>
          </button>
        )}

        <AnimatePresence>
          {aboutOpen && <AboutMeCard onClose={closeAbout} animate={!aboutRead && !reducedMotion} onRead={markAboutRead} />}
        </AnimatePresence>
        <AnimatePresence>
          {openOrg && <OrganizationCard key={openOrg.id} org={openOrg} onClose={closePanel} />}
          {panel === WORK_BOARD_ID && <WorkExperienceBoard key="work" onClose={closePanel} />}
        </AnimatePresence>
        {exploring && !hasLocked && (
          <button
            type="button"
            aria-label="Start exploring"
            onClick={requestLock}
            className="fixed inset-0 z-10 cursor-pointer"
          />
        )}

        {exploring && isLocked && !dialogOpen && onQuad && <Crosshair />}
        {exploring && hasLocked && (
          <ControlsHint
            message={
              canLock
                ? 'WASD to walk · Mouse to look · Shift to jog · Esc to pause'
                : 'For the full experience, visit on a computer with a keyboard and mouse.'
            }
          />
        )}

        {/* Inside the auditorium the corner holds "Return to Quad", so the compass steps aside;
            the location stays "Foellinger Auditorium" (the Quad is paused at its entrance). */}
        <AnimatePresence>
          {place === 'quad' && (
            <motion.div key="compass" exit={{ opacity: 0, transition: { duration: 0.3 } }}>
              <LocationCompass location={labelFor(locationId)} needleRef={compassNeedleRef} headingRef={compassHeadingRef} />
            </motion.div>
          )}
        </AnimatePresence>
        <NavigationGuide open={guideOpen} onOpenChange={setGuide} onTravel={fastTravel} travelling={travelling} />

        {/* Navy fade between the Quad and the auditorium */}
        <motion.div
          aria-hidden
          className={`fixed inset-0 z-[45] bg-[#0b1424] ${fading ? 'pointer-events-auto' : 'pointer-events-none'}`}
          initial={false}
          animate={{ opacity: fading ? 1 : 0 }}
          transition={{ duration: fadeMs / 1000, ease: 'easeInOut' }}
        />
      </main>
    </MotionConfig>
  )
}

import type { Ref } from 'react'
import { AnimatePresence, motion, type Transition } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1] as const
const at = (delay: number, duration = 0.9): Transition => ({ delay, duration, ease: EASE })
const APPEAR = 0.3

interface LocationCompassProps {
  /** Current area name (see config/locationZones.ts). */
  location: string
  /** Initial facing direction shown before the location (then driven by the scene). */
  heading?: string
  /** Needle group the scene rotates to keep it pointing north (scene/installations/HeadingTracker). */
  needleRef?: Ref<SVGGElement>
  /** Facing-direction text the scene updates as the player turns. */
  headingRef?: Ref<HTMLSpanElement>
}

/**
 * Map key in the top-left corner: the compass, the place, and where the
 * player is. The needle swings in on first appearance, then the scene keeps
 * it pointing north and updates the facing direction (N, NE, …) as the
 * player turns. Only the location line changes as the player explores.
 */
export function LocationCompass({ location, heading = 'N', needleRef, headingRef }: LocationCompassProps) {
  return (
    <motion.div
      className="pointer-events-none fixed top-5 left-5 z-20 flex items-center gap-3 text-illini-blue sm:top-7 sm:left-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={at(APPEAR, 1.2)}
    >
      <svg aria-hidden viewBox="0 0 64 64" className="size-11 sm:size-14" fill="none">
        <circle cx="32" cy="32" r="29" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
        <circle cx="32" cy="32" r="24.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.75" />
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            x1="32"
            y1={i % 3 === 0 ? 3 : 5}
            x2="32"
            y2="8"
            stroke="currentColor"
            strokeOpacity={i % 3 === 0 ? 0.8 : 0.4}
            strokeWidth="1"
            transform={`rotate(${i * 30} 32 32)`}
          />
        ))}
        <g ref={needleRef}>
        <motion.g
          style={{ transformOrigin: '32px 32px' }}
          initial={{ rotate: -38 }}
          animate={{ rotate: 0 }}
          transition={{ delay: APPEAR + 0.2, duration: 2.6, ease: EASE }}
        >
          <path d="M32 11 L36 32 L32 30 L28 32 Z" fill="var(--color-illini-orange)" />
          <path d="M32 53 L36 32 L32 34 L28 32 Z" fill="currentColor" fillOpacity="0.85" />
          <circle cx="32" cy="32" r="1.8" fill="var(--color-cream)" stroke="currentColor" strokeWidth="0.75" />
        </motion.g>
        </g>
      </svg>
      <div className="font-sans text-[0.625rem] leading-[1.7] font-semibold tracking-[0.22em] uppercase">
        The Main Quad <span className="text-illini-orange-deep">·</span> Urbana, Illinois
        <br />
        <span className="flex font-medium text-illini-blue/60">
          <span ref={headingRef} aria-hidden className="text-illini-orange-deep">
            {heading}
          </span>
          <span aria-hidden>&nbsp;—&nbsp;</span>
          {/* Old name fades out; the new one fades in with a small rise. */}
          <span className="relative inline-grid" role="status" aria-live="polite" aria-label="Current location">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={location}
                className="whitespace-nowrap [grid-area:1/1]"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE, delay: 0.06 } }}
                exit={{ opacity: 0, y: -3, transition: { duration: 0.16 } }}
              >
                {location}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
      </div>
    </motion.div>
  )
}

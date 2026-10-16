import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DESTINATIONS, type DestinationId } from '../config/fastTravel'
import { MiniMap } from './MiniMap'

const CONTROLS: [keys: string, label: string][] = [
  ['W A S D', 'Walk'],
  ['Mouse', 'Look around'],
  ['Shift', 'Jog'],
  ['E', 'Interact'],
]

interface NavigationGuideProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fast-travel to a destination (the guide closes as the trip begins). */
  onTravel?: (id: DestinationId) => void
  /** A trip is in progress: destinations are briefly disabled. */
  travelling?: boolean
  /** Extra controls shown beside the Guide button (e.g. the lighting toggle). */
  extra?: ReactNode
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 8.5 13.4 13.4 8.5 15.5l2.1-4.9z" fill="currentColor" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" aria-hidden>
      <path
        d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
    </svg>
  )
}

/**
 * Top-right guide button opening the map panel: an illustrated mini-map with
 * the player's live position and clickable destination pins, beside the
 * "Quick Travel" list. Both use the same fast travel (config/fastTravel.ts).
 */
export function NavigationGuide({ open, onOpenChange, onTravel = () => {}, travelling = false, extra }: NavigationGuideProps) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false)
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, onOpenChange])

  return (
    <div ref={root} className="fixed top-4 right-4 z-40 sm:top-6 sm:right-6">
      <div className="flex items-center justify-end gap-2">
      {extra && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0, transition: { delay: 1.75, duration: 0.5 } }}>
          {extra}
        </motion.div>
      )}
      <motion.button
        type="button"
        aria-expanded={open}
        aria-controls="quad-guide"
        onClick={() => onOpenChange(!open)}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 1.6, duration: 0.5 } }}
        className="ml-auto flex items-center gap-2.5 rounded-full border border-illini-blue/10 bg-cream py-1.5 pr-4 pl-1.5 font-display text-sm font-bold text-illini-blue shadow-chip transition hover:-translate-y-px hover:shadow-card"
      >
        <span className="grid size-8 place-items-center rounded-full bg-illini-orange text-white">
          <CompassIcon />
        </span>
        Guide
        <kbd className="hidden rounded-md border border-illini-blue/15 bg-white/70 px-1.5 font-sans text-[0.68rem] font-semibold text-illini-blue/60 sm:inline">
          G
        </kbd>
      </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="quad-guide"
            role="dialog"
            aria-label="Quad guide"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            style={{ transformOrigin: 'top right' }}
            className="absolute top-full right-0 mt-3 flex max-h-[calc(100dvh-6rem)] w-[min(46rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-illini-blue/10 bg-cream shadow-card"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 bg-illini-blue px-5 pt-4 pb-4 text-cream">
              <div>
                <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-illini-orange uppercase">
                  Quad guide
                </p>
                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">Explore the Quad</h2>
                <p className="mt-0.5 text-sm text-cream/70">Find your way around campus.</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close guide"
                className="-mr-1 grid size-8 place-items-center rounded-full text-cream/70 transition hover:bg-white/10 hover:text-cream"
              >
                ✕
              </button>
            </header>

            <div className="grid min-h-0 overflow-y-auto sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            {/* The illustrated map — click a pin to travel there */}
            <div className="p-3 max-sm:pb-0">
              <div className="mx-auto max-w-[18rem] rounded-[1.15rem] border-2 border-dashed border-illini-blue/15 p-1.5 max-sm:max-w-[12.5rem]">
                <MiniMap onTravel={onTravel} travelling={travelling} />
              </div>
            </div>

            <div className="flex min-w-0 flex-col">
            <p className="px-5 pt-3.5 text-[0.65rem] font-semibold tracking-[0.2em] text-illini-orange-deep uppercase">Quick travel</p>
            <ol className="space-y-0.5 px-2.5 pt-1 pb-2">
              {DESTINATIONS.map((destination, i) => (
                <li key={destination.id}>
                  <button
                    type="button"
                    onClick={() => onTravel(destination.id)}
                    disabled={travelling}
                    className="group flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-illini-blue/[0.05] focus-visible:bg-illini-blue/[0.05] disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-illini-orange/12 font-display text-sm font-extrabold text-illini-orange-deep transition-colors group-hover:bg-illini-orange group-hover:text-white">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[0.98rem] leading-tight font-bold text-illini-blue">{destination.title}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-sm text-ink/60">
                        <PinIcon />
                        {destination.subtitle}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="font-display text-lg text-illini-blue/35 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-illini-orange"
                    >
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <dl className="mx-5 mt-auto grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-illini-blue/10 pt-3 text-xs text-ink/65">
              {CONTROLS.map(([keys, label]) => (
                <div key={label} className="contents">
                  <dt className="font-semibold text-illini-blue">{keys}</dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
            <p className="px-5 pt-2 pb-4 text-xs text-ink/55">
              Pick a stop on the map or in the list to travel there. Press <kbd className="font-semibold text-illini-blue">G</kbd>{' '}
              anytime to open this guide, <kbd className="font-semibold text-illini-blue">Esc</kbd> to close it.
            </p>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

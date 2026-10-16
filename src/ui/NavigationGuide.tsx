import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DESTINATIONS, type DestinationId } from '../config/fastTravel'

interface NavigationGuideProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fast-travel to a destination (the guide closes as the trip begins). */
  onTravel?: (id: DestinationId) => void
  /** A trip is in progress: destinations are briefly disabled. */
  travelling?: boolean
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
 * Top-right guide button with a drop-down "Quick Travel" menu: each stop
 * fast-travels the player there (see config/fastTravel.ts).
 */
export function NavigationGuide({ open, onOpenChange, onTravel = () => {}, travelling = false }: NavigationGuideProps) {
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
            className="absolute top-full right-0 mt-3 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-illini-blue/10 bg-cream shadow-card"
          >
            <header className="flex items-start justify-between gap-4 bg-illini-blue px-5 pt-4 pb-5 text-cream">
              <div>
                <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-illini-orange uppercase">
                  Quad guide
                </p>
                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
                  Where to next?
                </h2>
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

            <p className="px-5 pt-3.5 text-[0.65rem] font-semibold tracking-[0.2em] text-illini-orange-deep uppercase">Quick travel</p>
            <ol className="space-y-1 px-2.5 pt-1.5 pb-2.5">
              {DESTINATIONS.map((destination, i) => (
                <li key={destination.id}>
                  <button
                    type="button"
                    onClick={() => onTravel(destination.id)}
                    disabled={travelling}
                    className="group flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-illini-blue/[0.05] focus-visible:bg-illini-blue/[0.05] disabled:cursor-wait disabled:opacity-60"
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

            <p className="border-t border-illini-blue/10 px-5 py-3 text-xs text-ink/55">
              Pick a stop to travel there. Press <kbd className="font-semibold text-illini-blue">G</kbd> anytime to open
              this guide, <kbd className="font-semibold text-illini-blue">Esc</kbd> to close it.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useEffect } from 'react'
import { motion, type Transition } from 'motion/react'
import { TitleLettering } from './TitleLettering'

interface IntroOverlayProps {
  onStart: () => void
}

/** A long, soft ease-out: quick to start, unhurried to land. No overshoot. */
const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Timeline (seconds). The camera settle (FirstPersonController) runs 0 → 2.6;
 * the 3D letters set down from ~0.35 s (timing in TitleLettering).
 */
const T = { copy: 1.75, enter: 2.25 }

const at = (delay: number, duration = 0.9): Transition => ({ delay, duration, ease: EASE })

/**
 * Game title screen laid over the live 3D scene: the 3D-lettered name in the
 * lower-left, a short line of copy, and a keycap-style "Enter the Quad"
 * (which the Enter key also triggers, as on a console title screen).
 */
export function IntroOverlay({ onStart }: IntroOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat && !(e.target instanceof HTMLButtonElement)) onStart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart])

  return (
    <motion.section
      aria-labelledby="intro-title"
      className="pointer-events-none fixed inset-0 z-20"
      exit={{ opacity: 0, transition: { duration: 0.6, ease: EASE } }}
    >
      {/* A soft warm wash behind the title only, so the letters read against the grass. */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(60%_80%_at_0%_100%,rgb(251_246_238/0.82)_0%,rgb(251_246_238/0.5)_45%,rgb(251_246_238/0)_75%)] max-sm:bg-[linear-gradient(to_top,rgb(251_246_238/0.9)_0%,rgb(251_246_238/0.6)_42%,rgb(251_246_238/0)_66%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={at(0, 1.6)}
      />

      <div className="absolute inset-x-5 bottom-[max(2rem,6vh)] sm:inset-x-auto sm:left-[5vw] sm:w-[min(32rem,40vw)]">
        <h1 id="intro-title" className="sr-only">
          Nadia Shastri
        </h1>
        {/* Extra headroom above the letters gives them room to drop in from. */}
        <TitleLettering className="-mb-[3%] aspect-[1.75] w-full max-sm:max-w-[26rem]" />

        <motion.div className="sm:pl-[3%]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={at(T.copy, 1.1)}>
          <p className="font-sans text-[1.05rem] leading-snug font-semibold text-ink/85 sm:text-[1.15rem]">
            A little about me, one stop at a time.
          </p>
          <p className="mt-1 font-sans text-[0.8125rem] leading-relaxed text-pretty text-ink/60">
            Wander the Quad, or open the guide in the corner to find your way.
          </p>
        </motion.div>

        <motion.div
          className="mt-6 flex items-center gap-3 sm:pl-[3%]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={at(T.enter, 0.8)}
        >
          {/* Keycap: chunky like the lettering, with a pressable depth edge. */}
          <button
            type="button"
            onClick={onStart}
            className="group pointer-events-auto relative inline-flex items-center gap-2.5 rounded-[0.55rem] border border-illini-blue/80 bg-illini-blue px-4 pt-2 pb-2.5 font-title text-[1.05rem] tracking-[0.06em] text-cream uppercase shadow-[0_5px_0_#0a1628,0_12px_18px_-8px_rgb(12_26_48/0.55)] transition-[translate,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_7px_0_#0a1628,0_16px_22px_-8px_rgb(12_26_48/0.55)] active:translate-y-[4px] active:shadow-[0_1px_0_#0a1628,0_4px_8px_-6px_rgb(12_26_48/0.5)]"
          >
            Enter the Quad
            <span
              aria-hidden
              className="inline-block text-illini-orange transition-transform duration-300 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1"
            >
              →
            </span>
          </button>
          <span aria-hidden className="hidden font-sans text-[0.6875rem] font-semibold tracking-[0.18em] text-ink/45 uppercase sm:inline">
            or press{' '}
            <kbd className="rounded-[0.3rem] border border-ink/20 border-b-[3px] bg-white/70 px-1.5 py-px font-sans text-[0.65rem] text-ink/70">
              Enter
            </kbd>
          </span>
        </motion.div>
      </div>
    </motion.section>
  )
}

import { useEffect, useRef } from 'react'
import { motion, type Variants } from 'motion/react'
import { ABOUT_ME } from '../content/aboutMe'
import { useTypewriter } from '../hooks/useTypewriter'
import { ContactLinks } from './ContactLinks'

export type CloseReason = 'button' | 'escape'

interface AboutMeCardProps {
  onClose: (reason: CloseReason) => void
  /** Play the full entrance and typewriter (first visit, motion allowed). */
  animate: boolean
  /** Called once the description has fully appeared. */
  onRead?: () => void
}

const EASE = [0.16, 1, 0.3, 1] as const

const reveal: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
}

/** Keys that shouldn't count as "skip the typing". */
const NON_SKIP_KEYS = new Set(['Escape', 'Tab', 'Shift', 'Alt', 'Control', 'Meta'])

/**
 * The About Me "player profile": a cream card that springs up over the
 * blurred Quad, types out the introduction, then deals out interests and
 * toolkit badges. Click or press any key to finish the typing instantly.
 */
export function AboutMeCard({ onClose, animate, onRead }: AboutMeCardProps) {
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [intro, ...moreParagraphs] = ABOUT_ME.description
  const typing = useTypewriter(intro, { speed: 90, delay: 550, animate })
  const { done, finish } = typing

  useEffect(() => {
    if (typing.done) onRead?.()
  }, [typing.done, onRead])

  // Focus moves into the dialog, and back to wherever it was on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeButton.current?.focus({ preventScroll: true })
    return () => {
      if (previous && previous !== document.body && document.contains(previous)) previous.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose('escape')
        return
      }
      if (e.key === 'Tab') {
        // Keep focus inside the dialog.
        const focusable = dialog.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
        return
      }
      if (!done && !NON_SKIP_KEYS.has(e.key)) {
        e.preventDefault()
        finish()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, done, finish])

  const showDetails = typing.done

  return (
    <motion.div
      className="fixed inset-0 z-30 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.05 } }}
      transition={{ duration: 0.35 }}
    >
      {/* The Quad stays visible: softly blurred and dimmed behind the card. */}
      <div aria-hidden className="fixed inset-0 bg-[rgb(12_26_48/0.32)] backdrop-blur-[6px]" />

      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-8">
        <motion.div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-heading"
          aria-describedby="about-description"
          onClick={() => !typing.done && typing.finish()}
          initial={{ opacity: 0, scale: 0.88, y: 28, rotateX: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
          transition={{ type: 'spring', stiffness: 300, damping: 21, mass: 0.9 }}
          style={{ transformPerspective: 900 }}
          className="relative w-full max-w-[35rem]"
        >
          {/* A slow idle float, so the card feels held in the air rather than pasted on. */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            className="relative rounded-[1.5rem] bg-cream px-6 pt-7 pb-6 text-illini-blue shadow-[0_9px_0_#e1d5c1,0_30px_60px_-22px_rgb(12_26_48/0.65)] sm:px-9 sm:pt-9 sm:pb-8"
          >
            {/* Stitched inner border, like a badge or a game inventory panel. */}
            <div aria-hidden className="pointer-events-none absolute inset-2 rounded-[1.1rem] border-2 border-dashed border-illini-blue/12" />

            {/* Profile tab */}
            <div className="absolute -top-3.5 left-6 rounded-[0.45rem] bg-illini-orange px-3 pt-1 pb-1.5 font-title text-[0.8rem] leading-none tracking-[0.12em] text-cream uppercase shadow-[0_3px_0_#c43f00] sm:left-9">
              {ABOUT_ME.label}
            </div>

            <button
              ref={closeButton}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose('button')
              }}
              aria-label="Close About Me"
              className="absolute top-4 right-4 grid size-9 place-items-center rounded-[0.55rem] border border-illini-blue/15 border-b-[3px] bg-white font-title text-[1rem] text-illini-blue transition hover:-translate-y-px hover:border-illini-blue/30 active:translate-y-px active:border-b"
            >
              ✕
            </button>

            {/* Heading row: monogram badge + greeting */}
            <motion.div
              className="flex items-center gap-4 pr-10"
              initial={animate ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5, ease: EASE }}
            >
              <div
                aria-hidden
                className="grid size-14 shrink-0 place-items-center rounded-[0.9rem] bg-illini-blue font-title text-[1.45rem] text-cream shadow-[0_4px_0_var(--color-illini-orange)]"
              >
                NS
              </div>
              <h2 id="about-heading" className="font-title text-[clamp(1.8rem,6vw,2.4rem)] leading-[1.02] tracking-[0.01em]">
                Hey, I&apos;m Nadia<span className="text-illini-orange">!</span>
              </h2>
            </motion.div>

            {/* Description: typed for sighted users; the full text is always available to screen readers. */}
            <div id="about-description" className="sr-only">
              {ABOUT_ME.description.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <p
              aria-hidden
              data-testid="about-typed"
              className="mt-5 min-h-[7.5rem] font-sans text-[0.98rem] leading-relaxed text-ink/85 sm:text-[1.02rem]"
            >
              {typing.visible}
              {!typing.done && (
                <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] animate-[blink_1s_steps(1)_infinite] bg-illini-orange" />
              )}
            </p>

            {showDetails && (
              <motion.div variants={reveal} initial={animate ? 'hidden' : false} animate="show" className="mt-6 space-y-6">
                {moreParagraphs.length > 0 && (
                  <div aria-hidden className="-mt-2 space-y-3 font-sans text-[0.98rem] leading-relaxed text-ink/85 sm:text-[1.02rem]">
                    {moreParagraphs.map((p) => (
                      <motion.p key={p} variants={item}>
                        {p}
                      </motion.p>
                    ))}
                  </div>
                )}
                <section>
                  <motion.h3 variants={item} className="font-title text-[0.95rem] tracking-[0.08em] text-illini-blue uppercase">
                    {ABOUT_ME.toolkitTitle}
                  </motion.h3>
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Skills">
                    {ABOUT_ME.toolkit.map((tool) => (
                      <motion.li
                        key={tool}
                        variants={item}
                        className="rounded-[0.5rem] border border-illini-blue/15 border-b-[3px] bg-white px-2.5 pt-1 pb-1.5 font-sans text-[0.82rem] font-semibold text-illini-blue"
                      >
                        {tool}
                      </motion.li>
                    ))}
                  </ul>
                </section>

                <ContactLinks variants={item} />
              </motion.div>
            )}

            <p aria-hidden className="mt-6 text-right font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-ink/40 uppercase">
              {typing.done ? 'Esc to close' : 'Click or press any key to skip'}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}

import { useEffect, useRef } from 'react'
import { motion, type Variants } from 'motion/react'
import { ABOUT_ME } from '../content/aboutMe'
import { useTypewriter } from '../hooks/useTypewriter'
import { ContactLinks } from './ContactLinks'

export type CloseReason = 'button' | 'escape'

interface AboutMeCardProps {
  onClose: (reason: CloseReason) => void
  /** Play the typed heading and staggered reveal (first visit, motion allowed). */
  animate: boolean
  /** Called once the heading has finished typing. */
  onRead?: () => void
}

const EASE = [0.16, 1, 0.3, 1] as const

/** Description fades up as one block; the right-hand sections follow with a slight stagger. */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}
const column: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
}
const tags: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.025 } } }
const tag: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
}

const SECTION_TITLE = 'font-title text-[0.85rem] tracking-[0.1em] text-illini-blue uppercase'
const TAG = 'rounded-[0.45rem] border border-b-[3px] border-illini-blue/15 bg-white px-2 pt-0.5 pb-1 font-sans text-[0.76rem] font-semibold text-illini-blue'

/** Keys that shouldn't count as "skip the typing". */
const NON_SKIP_KEYS = new Set(['Escape', 'Tab', 'Shift', 'Alt', 'Control', 'Meta'])

/**
 * The About Me "player profile": a wide cream card that springs up over the
 * blurred Quad. The greeting types itself out (~1 s), then the introduction
 * fades in on the left while education, interests, skills and contact links
 * follow on the right. Click or press any key to skip the typing.
 */
export function AboutMeCard({ onClose, animate, onRead }: AboutMeCardProps) {
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  // ~17 characters at 20/s plus short pauses after punctuation ≈ 1.1 s.
  const typing = useTypewriter(ABOUT_ME.heading, { speed: 20, delay: 300, animate })
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

      <div className="relative flex min-h-full items-center justify-center p-4 sm:px-8 sm:py-6">
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
          className="relative w-[min(960px,92vw)] max-sm:w-full"
        >
          {/* A slow idle float, so the card feels held in the air rather than pasted on. */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            className="relative rounded-[1.5rem] bg-cream px-6 pt-8 pb-4 text-illini-blue shadow-[0_9px_0_#e1d5c1,0_30px_60px_-22px_rgb(12_26_48/0.65)] sm:px-10 sm:pt-8 sm:pb-5"
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

            {/* Desktop: intro and contact on the left, details on the right. Mobile: one column, contact last. */}
            <div className="grid gap-x-9 gap-y-6 [grid-template-areas:'intro'_'details'_'contact'] md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:[grid-template-areas:'intro_details'_'contact_details']">
              {/* Left: greeting and introduction */}
              <div className="min-w-0 [grid-area:intro]">
                <div className="flex items-center gap-4 pr-10 md:pr-0">
                  <div
                    aria-hidden
                    className="grid size-14 shrink-0 place-items-center rounded-[0.9rem] bg-illini-blue font-title text-[1.45rem] text-cream shadow-[0_4px_0_var(--color-illini-orange)]"
                  >
                    NS
                  </div>
                  <h2
                    id="about-heading"
                    aria-label={ABOUT_ME.heading}
                    className="relative font-title text-[clamp(1.8rem,4.2vw,2.5rem)] leading-[1.05] tracking-[0.01em]"
                  >
                    {/* Invisible full heading reserves the space, so nothing shifts while it types. */}
                    <span aria-hidden className="invisible">
                      {ABOUT_ME.heading}
                    </span>
                    <span aria-hidden data-testid="about-typed" className="absolute inset-0">
                      {typing.done ? (
                        <>
                          {ABOUT_ME.heading.slice(0, -1)}
                          <span className="text-illini-orange">{ABOUT_ME.heading.slice(-1)}</span>
                        </>
                      ) : (
                        typing.visible
                      )}
                      {!typing.done && (
                        <span className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] animate-[blink_1s_steps(1)_infinite] bg-illini-orange" />
                      )}
                    </span>
                  </h2>
                </div>

                <motion.div
                  id="about-description"
                  variants={fadeUp}
                  initial={animate ? 'hidden' : false}
                  animate={showDetails ? 'show' : 'hidden'}
                  className="mt-4 space-y-3 font-sans text-[0.95rem] leading-[1.6] text-ink/85"
                >
                  {ABOUT_ME.description.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </motion.div>
              </div>

              {/* Right: education, interests, skills, contact — separated by a dashed rule */}
              <motion.div
                variants={column}
                initial={animate ? 'hidden' : false}
                animate={showDetails ? 'show' : 'hidden'}
                className="min-w-0 space-y-4 border-illini-blue/15 [grid-area:details] max-md:border-t-2 max-md:border-dashed max-md:pt-6 md:border-l-2 md:border-dashed md:pt-1 md:pl-8"
              >
                <motion.section variants={fadeUp} aria-labelledby="about-education">
                  <h3 id="about-education" className={SECTION_TITLE}>
                    {ABOUT_ME.educationTitle}
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {ABOUT_ME.education.map((e) => (
                      <li key={e.school} className="rounded-[0.7rem] border border-illini-blue/12 bg-white/70 px-3 py-2">
                        <p className="font-sans text-[0.88rem] leading-snug font-bold text-illini-blue">{e.school}</p>
                        <p className="font-sans text-[0.8rem] leading-snug text-ink/75">{e.program}</p>
                        <p className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0 font-sans text-[0.66rem] font-semibold tracking-[0.1em] text-illini-orange-deep uppercase">
                          {e.facts.map((f) => (
                            <span key={f}>{f}</span>
                          ))}
                        </p>
                        <p className="mt-0.5 font-sans text-[0.72rem] leading-snug text-ink/60">
                          <span className="font-semibold text-ink/75">Coursework: </span>
                          {e.coursework}
                        </p>
                      </li>
                    ))}
                  </ul>
                </motion.section>

                <motion.section variants={fadeUp} aria-labelledby="about-interests">
                  <h3 id="about-interests" className={SECTION_TITLE}>
                    {ABOUT_ME.interestsTitle}
                  </h3>
                  <motion.ul variants={tags} className="mt-2 flex flex-wrap gap-1.5" aria-label={ABOUT_ME.interestsTitle}>
                    {ABOUT_ME.interests.map((interest) => (
                      <motion.li
                        key={interest}
                        variants={tag}
                        className="flex items-center gap-1.5 rounded-[0.45rem] bg-illini-blue px-2 pt-0.5 pb-1 font-sans text-[0.76rem] font-semibold text-cream"
                      >
                        <span aria-hidden className="size-1.5 rotate-45 bg-illini-orange" />
                        {interest}
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.section>

                <motion.section variants={fadeUp} aria-labelledby="about-skills">
                  <h3 id="about-skills" className={SECTION_TITLE}>
                    {ABOUT_ME.toolkitTitle}
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    {ABOUT_ME.skills.map((group) => (
                      <div key={group.label} className="flex flex-wrap items-center gap-1.5">
                        <p className="mr-0.5 font-sans text-[0.64rem] font-semibold tracking-[0.12em] text-ink/50 uppercase">{group.label}</p>
                        <motion.ul variants={tags} className="contents" aria-label={group.label}>
                          {group.items.map((item) => (
                            <motion.li key={item} variants={tag} className={TAG}>
                              {item}
                            </motion.li>
                          ))}
                        </motion.ul>
                      </div>
                    ))}
                  </div>
                </motion.section>

              </motion.div>

              <motion.div
                variants={fadeUp}
                initial={animate ? 'hidden' : false}
                animate={showDetails ? 'show' : 'hidden'}
                transition={{ delay: 0.35 }}
                className="min-w-0 self-end [grid-area:contact]"
              >
                <ContactLinks />
              </motion.div>
            </div>

            <p aria-hidden className="mt-3 text-right font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-ink/40 uppercase">
              {typing.done ? 'Esc to close' : 'Click or press any key to skip'}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}

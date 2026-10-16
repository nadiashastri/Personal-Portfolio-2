import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { PROJECTS, isValidUrl, type Project } from '../content/projects'

export type ExitReason = 'button' | 'escape'

interface ProjectShowcaseProps {
  /** Positioned over the 3D projection screen by the auditorium scene. */
  screenRef: RefObject<HTMLDivElement | null>
  onExit: (reason: ExitReason) => void
  projects?: readonly Project[]
}

const EASE = [0.16, 1, 0.3, 1] as const
const pad = (n: number) => String(n).padStart(2, '0')

/** Slides travel in the direction of navigation; the title leads, details follow. */
const slide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: `${dir * 4}%` }),
  show: { opacity: 1, x: 0, transition: { duration: 0.32, ease: EASE, staggerChildren: 0.06 } },
  exit: (dir: number) => ({ opacity: 0, x: `${dir * -4}%`, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }),
}
const part: Variants = {
  enter: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
}
const tags: Variants = { enter: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } } }
const tag: Variants = {
  enter: { opacity: 0, y: 6, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: EASE } },
}

function Slide({ project, index, total }: { project: Project; index: number; total: number }) {
  /** Long slides get slightly smaller type so they fit the screen. */
  const dense = project.description.join(' ').length + (project.features?.items.join(' ').length ?? 0) > 420
  // The fade at the bottom of the text only appears when it really overflows.
  const scroller = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const check = () => setOverflowing(el.scrollHeight - el.clientHeight > 2)
    const observer = new ResizeObserver(check)
    observer.observe(el)
    check()
    return () => observer.disconnect()
  }, [])
  const links = [
    { label: 'View on GitHub', url: project.links?.github },
    { label: 'Live demo', url: project.links?.demo },
  ].filter((l): l is { label: string; url: string } => isValidUrl(l.url))

  return (
    <div className="flex h-full flex-col p-[3.8cqw]">
      {/* Screen header: venue label and counter */}
      <motion.div variants={part} className="flex items-baseline justify-between gap-4">
        <p className="flex items-center gap-[0.8cqw] font-sans text-[max(0.6rem,1.05cqw)] font-semibold tracking-[0.22em] text-illini-blue/60 uppercase">
          <span aria-hidden className="inline-block size-[0.9cqw] min-h-1.5 min-w-1.5 bg-illini-orange" />
          Foellinger Auditorium · Project showcase
        </p>
        <p className="font-serif text-[max(0.9rem,2cqw)] whitespace-nowrap text-illini-blue tabular-nums">
          <span className="text-illini-orange italic">{pad(index + 1)}</span>
          <span className="text-illini-blue/40"> / {pad(total)}</span>
        </p>
      </motion.div>

      <div className="mt-[2.4cqw] flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          <motion.p
            variants={part}
            className="inline-flex w-fit items-center gap-[0.6cqw] border border-illini-blue/20 px-[0.9cqw] py-[0.35cqw] font-sans text-[max(0.6rem,1cqw)] font-semibold tracking-[0.16em] text-illini-blue uppercase"
          >
            <span
              aria-hidden
              className={`inline-block size-[0.7cqw] min-h-1.5 min-w-1.5 rounded-full ${project.status === 'In progress' ? 'bg-illini-orange' : 'bg-illini-blue'}`}
            />
            {project.status}
          </motion.p>
          <motion.h2
            variants={part}
            className={`mt-[1.4cqw] max-w-[78cqw] font-serif ${dense ? 'text-[max(1.35rem,3.7cqw)]' : 'text-[max(1.5rem,4.6cqw)]'} leading-[1.02] font-semibold tracking-[-0.015em] text-illini-blue`}
          >
            {project.title}
          </motion.h2>
          {project.affiliationLabel && project.affiliation && (
            <motion.p variants={part} className="mt-[1.4cqw] font-sans text-[max(0.75rem,1.35cqw)] text-ink/70">
              <span className="font-semibold tracking-[0.16em] text-illini-orange-deep uppercase">{project.affiliationLabel}</span>
              <span className="mx-2 text-ink/30">—</span>
              {project.affiliation}
            </motion.p>
          )}
          {/* Only this middle part scrolls if a long slide still doesn't fit; the tags stay pinned below. */}
          <div className="relative mt-[1.8cqw] min-h-0 flex-1">
          <div
            ref={scroller}
            className={`h-full overflow-y-auto pr-[1cqw] [scrollbar-width:thin] ${overflowing ? '[mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]' : ''}`}
          >
          <motion.div variants={part} className={`${dense ? 'max-w-[74cqw]' : 'max-w-[66cqw]'} space-y-[1cqw] font-sans leading-[1.6] text-ink/85 ${dense ? 'text-[max(0.8rem,1.4cqw)]' : 'text-[max(0.85rem,1.65cqw)]'}`}>
            {project.description.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </motion.div>
          {project.features && (
            <motion.div variants={part} className="mt-[1.8cqw]">
              <p className="font-sans text-[max(0.6rem,1cqw)] font-semibold tracking-[0.22em] text-illini-blue/55 uppercase">{project.features.title}</p>
              <ul className="mt-[0.8cqw] grid gap-x-[3cqw] gap-y-[0.5cqw] @[36rem]:grid-cols-2">
                {project.features.items.map((f) => (
                  <li key={f} className="flex items-start gap-[0.8cqw] font-sans text-[max(0.8rem,1.4cqw)] leading-snug text-ink/80">
                    <span aria-hidden className="mt-[0.5em] size-[0.7cqw] min-h-1.5 min-w-1.5 shrink-0 rotate-45 bg-illini-orange" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
          {overflowing && <div aria-hidden className="h-6" />}
          </div>
          </div>

          <motion.div variants={part} className="shrink-0 pt-[1.6cqw]">
            <p className="font-sans text-[max(0.6rem,1cqw)] font-semibold tracking-[0.22em] text-illini-blue/55 uppercase">Built with</p>
            <motion.ul variants={tags} className="mt-[0.9cqw] flex flex-wrap gap-[0.7cqw]" aria-label="Technology stack">
              {project.stack.map((t) => (
                <motion.li
                  key={t}
                  variants={tag}
                  className="border-b-2 border-illini-orange bg-illini-blue px-[1cqw] py-[0.45cqw] font-sans text-[max(0.7rem,1.15cqw)] font-semibold text-cream"
                >
                  {t}
                </motion.li>
              ))}
            </motion.ul>
            {links.length > 0 && (
              <div className="mt-[1.6cqw] flex flex-wrap gap-[1cqw]">
                {links.map((l) => (
                  <a
                    key={l.label}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-illini-blue px-[1.2cqw] py-[0.5cqw] font-sans text-[max(0.7rem,1.1cqw)] font-semibold tracking-[0.12em] text-illini-blue uppercase transition hover:bg-illini-blue hover:text-cream"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

/**
 * The presentation on Foellinger's screen: one project per slide, browsable
 * with the buttons below the screen or the ←/→ keys (wrapping round), plus a
 * "Return to Quad" exit. The text is real HTML laid exactly over the 3D
 * screen, so it stays crisp at any resolution.
 */
export function ProjectShowcase({ screenRef, onExit, projects = PROJECTS }: ProjectShowcaseProps) {
  const [[index, direction], setPage] = useState<[number, number]>([0, 1])
  const total = projects.length
  const project = projects[index]
  const exitButton = useRef<HTMLButtonElement>(null)

  const go = useCallback(
    (dir: 1 | -1) => setPage(([i]) => [(i + dir + total) % total, dir]),
    [total],
  )

  useEffect(() => {
    exitButton.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') onExit('escape')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onExit])

  return (
    <motion.section
      aria-label="Project showcase"
      className="fixed inset-0 z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.35, duration: 0.5 } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <button
        ref={exitButton}
        type="button"
        onClick={() => onExit('button')}
        className="fixed top-4 left-4 z-30 border border-[#c9a25a]/70 bg-illini-blue px-4 py-2 font-sans text-[0.8rem] font-semibold tracking-[0.14em] text-cream uppercase shadow-[0_8px_20px_-8px_rgb(0_0_0/0.6)] transition hover:bg-[#1c3766] sm:top-6 sm:left-6"
      >
        ← Return to Quad
      </button>

      {/* Sized and placed every frame to match the 3D screen. */}
      <div ref={screenRef} className="absolute" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <div className="@container absolute inset-0 overflow-hidden bg-[#f4ede0] text-illini-blue">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={project.id}
              custom={direction}
              variants={slide}
              initial="enter"
              animate="show"
              exit="exit"
              className="h-full"
              aria-live="polite"
            >
              <Slide project={project} index={index} total={total} />
            </motion.div>
          </AnimatePresence>
          {/* Illinois stripe along the bottom edge of the screen */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 flex h-[0.7cqw] min-h-1">
            <span className="flex-1 bg-illini-blue" />
            <span className="w-1/4 bg-illini-orange" />
          </div>
        </div>

        {/* Controls on the stage apron, under the screen */}
        <nav aria-label="Projects" className="absolute top-full left-1/2 mt-4 flex -translate-x-1/2 items-center gap-3 sm:mt-6">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous project"
            className="border border-[#c9a25a]/70 bg-illini-blue px-3.5 py-2 font-sans text-[0.78rem] font-semibold tracking-[0.12em] whitespace-nowrap text-cream uppercase transition hover:bg-[#1c3766] active:translate-y-px"
          >
            ← <span className="max-sm:hidden">Previous</span>
          </button>
          <div className="flex items-center gap-2 px-2" aria-hidden>
            {projects.map((p, i) => (
              <span key={p.id} className={`h-1.5 transition-all duration-300 ${i === index ? 'w-6 bg-illini-orange' : 'w-1.5 bg-cream/40'}`} />
            ))}
          </div>
          <p className="font-serif text-[0.95rem] whitespace-nowrap text-cream tabular-nums" aria-live="polite">
            <span className="sr-only">Project </span>
            {pad(index + 1)}
            <span className="text-cream/50"> / {pad(total)}</span>
          </p>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next project"
            className="border border-[#c9a25a]/70 bg-illini-blue px-3.5 py-2 font-sans text-[0.78rem] font-semibold tracking-[0.12em] whitespace-nowrap text-cream uppercase transition hover:bg-[#1c3766] active:translate-y-px"
          >
            <span className="max-sm:hidden">Next</span> →
          </button>
        </nav>
      </div>

      <p aria-hidden className="fixed bottom-4 left-1/2 -translate-x-1/2 font-sans text-[0.68rem] font-semibold tracking-[0.2em] whitespace-nowrap text-cream/45 uppercase max-sm:hidden">
        ← → to browse · Esc to return to the Quad
      </p>
    </motion.section>
  )
}

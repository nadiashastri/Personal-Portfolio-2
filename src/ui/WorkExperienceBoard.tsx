import { motion, type Variants } from 'motion/react'
import { WORK_EXPERIENCE } from '../content/involvement'
import { GameDialog, type DialogCloseReason } from './GameDialog'

const EASE = [0.16, 1, 0.3, 1] as const
const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }
const note: Variants = {
  hidden: { opacity: 0, y: 14, rotate: 0 },
  show: (tilt: number) => ({ opacity: 1, y: 0, rotate: tilt, transition: { duration: 0.45, ease: EASE } }),
}
const PINS = ['#ff5f05', '#13294b', '#e2a72e']
const TILTS = [-0.6, 0.5, -0.3]

/**
 * The campus career board: a cork board with each job pinned up as an
 * index card — title, employer, dates and a one-line summary.
 */
export function WorkExperienceBoard({ onClose }: { onClose: (reason: DialogCloseReason) => void }) {
  return (
    <GameDialog
      labelledBy="work-heading"
      onClose={onClose}
      closeLabel="Close work experience"
      surface={{ background: '#c99c6a', edge: '#8a6440' }}
      maxWidth="40rem"
    >
      <div className="overflow-hidden rounded-[1.4rem] bg-[radial-gradient(rgb(255_235_200/0.18)_1px,transparent_1.5px)] bg-[length:9px_9px] p-3 sm:p-4">
        <header className="rounded-[0.9rem] bg-illini-blue px-5 pt-4 pb-4 text-cream shadow-[0_4px_0_var(--color-illini-orange)] sm:px-6">
          <p className="font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-cream/65 uppercase">Illini Union · Campus career board</p>
          <h2 id="work-heading" className="mt-1 pr-10 font-title text-[1.9rem] leading-none tracking-[0.02em]">
            Work Experience
          </h2>
        </header>

        <motion.ol variants={list} initial="hidden" animate="show" className="mt-5 space-y-4 px-1 pb-2 sm:px-2">
          {WORK_EXPERIENCE.map((job, i) => (
            <motion.li
              key={job.title}
              custom={TILTS[i % TILTS.length]}
              variants={note}
              className="relative rounded-[0.35rem] bg-cream px-5 pt-5 pb-4 shadow-[0_8px_16px_-10px_rgb(40_25_10/0.7)]"
            >
              <span
                aria-hidden
                className="absolute -top-1.5 left-1/2 size-4 -translate-x-1/2 rounded-full shadow-[0_2px_0_rgb(0_0_0/0.25)]"
                style={{ background: PINS[i % PINS.length] }}
              />
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="font-title text-[1.2rem] leading-tight">{job.title}</h3>
                <p className="font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-illini-orange-deep uppercase">{job.dates}</p>
              </div>
              <p className="mt-0.5 font-sans text-[0.88rem] font-semibold text-ink/65">{job.employer}</p>
              <p className="mt-2 font-sans text-[0.9rem] leading-relaxed text-ink/85">{job.description}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </GameDialog>
  )
}

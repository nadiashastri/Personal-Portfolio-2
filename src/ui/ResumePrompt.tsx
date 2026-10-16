import { motion } from 'motion/react'

interface ResumePromptProps {
  onResume: () => void
}

const CONTROLS: [keys: string[], label: string][] = [
  [['W', 'A', 'S', 'D'], 'Walk'],
  [['Mouse'], 'Look around'],
  [['Shift'], 'Jog'],
  [['G'], 'Open guide'],
  [['Esc'], 'Pause'],
]

/** Shown whenever exploration is paused (pointer lock released). Click anywhere to resume. */
export function ResumePrompt({ onResume }: ResumePromptProps) {
  return (
    <motion.button
      type="button"
      onClick={onResume}
      aria-label="Resume exploring"
      initial={{ opacity: 0 }}
      // Short delay avoids a flash while the browser is still granting pointer lock.
      animate={{ opacity: 1, transition: { delay: 0.25, duration: 0.3 } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="fixed inset-0 z-10 grid cursor-pointer place-items-center bg-illini-blue/25 px-6"
    >
      <motion.div
        initial={{ y: 14, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="w-full max-w-sm rounded-3xl bg-cream p-6 text-left shadow-card"
      >
        <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-illini-orange-deep uppercase">
          Paused
        </p>
        <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-illini-blue">
          Click to keep exploring
        </p>
        <ul className="mt-5 space-y-2.5">
          {CONTROLS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between text-sm text-ink/70">
              <span>{label}</span>
              <span className="flex gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-7 rounded-md border border-illini-blue/15 border-b-[3px] bg-white px-1.5 py-0.5 text-center text-xs font-semibold text-illini-blue"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.button>
  )
}

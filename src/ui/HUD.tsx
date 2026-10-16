import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/** Small centre dot so players know where they're looking. */
export function Crosshair() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-1/2 left-1/2 z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgb(19_41_75/0.35)]"
    />
  )
}

const HINT_DURATION_MS = 6000

/** Brief controls reminder that slides in after the player starts, then gets out of the way. */
export function ControlsHint({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(false), HINT_DURATION_MS)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.p
          role="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.5 } }}
          exit={{ opacity: 0, y: 10 }}
          className="pointer-events-none fixed bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-illini-blue px-5 py-2.5 text-center text-sm font-medium whitespace-nowrap text-cream shadow-chip max-sm:max-w-[calc(100vw-2rem)] max-sm:whitespace-normal"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

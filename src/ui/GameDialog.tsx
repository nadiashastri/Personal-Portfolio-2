import { useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'

export type DialogCloseReason = 'button' | 'escape'

interface GameDialogProps {
  /** id of the element that names the dialog. */
  labelledBy: string
  onClose: (reason: DialogCloseReason) => void
  closeLabel: string
  /** Paper colour and the "depth edge" under the card. */
  surface?: { background: string; edge: string }
  maxWidth?: string
  children: ReactNode
}

/**
 * Shared shell for in-world popups (Quad Day booths, the work board): blurred,
 * dimmed backdrop over the Quad, a card that springs into place, a keycap
 * close button, Escape to close, focus moved in, trapped, and restored.
 */
export function GameDialog({
  labelledBy,
  onClose,
  closeLabel,
  surface = { background: '#fbf6ee', edge: '#e1d5c1' },
  maxWidth = '36rem',
  children,
}: GameDialogProps) {
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

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
      } else if (e.key === 'Tab') {
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
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-30 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.05 } }}
      transition={{ duration: 0.3 }}
    >
      <div aria-hidden className="fixed inset-0 bg-[rgb(12_26_48/0.32)] backdrop-blur-[6px]" />
      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-8">
        <motion.div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
          transition={{ type: 'spring', stiffness: 320, damping: 23 }}
          className="relative w-full"
          style={{ maxWidth }}
        >
          <div
            className="relative rounded-[1.4rem] text-illini-blue"
            style={{ background: surface.background, boxShadow: `0 9px 0 ${surface.edge}, 0 30px 60px -22px rgb(12 26 48 / 0.65)` }}
          >
            <button
              ref={closeButton}
              type="button"
              onClick={() => onClose('button')}
              aria-label={closeLabel}
              className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-[0.55rem] border border-b-[3px] border-illini-blue/15 bg-white font-title text-[1rem] text-illini-blue transition hover:-translate-y-px hover:border-illini-blue/30 active:translate-y-px active:border-b"
            >
              ✕
            </button>
            {children}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

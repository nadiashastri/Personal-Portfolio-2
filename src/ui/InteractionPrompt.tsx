import type { Ref } from 'react'

interface InteractionPromptProps {
  /** Positioned every frame by the 3D scene (projected from the object's anchor point). */
  anchorRef: Ref<HTMLDivElement>
  visible: boolean
  title: string
  action: string
  keyLabel?: string
}

/**
 * Floating "press a key" prompt shown above an in-world object. It lives in
 * the page DOM (not the canvas) so it stays crisp and accessible; the scene
 * moves it to follow the object on screen.
 */
export function InteractionPrompt({ anchorRef, visible, title, action, keyLabel = 'E' }: InteractionPromptProps) {
  return (
    <div ref={anchorRef} aria-hidden className="pointer-events-none fixed top-0 left-0 z-[5] will-change-transform">
      <div
        className={`flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1.5 transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? 'opacity-100' : 'translate-y-[calc(-100%+0.5rem)] opacity-0'
        }`}
      >
        <span className="rounded-[0.4rem] bg-illini-blue px-2.5 pt-1 pb-1.5 font-title text-[1.05rem] leading-none tracking-[0.08em] whitespace-nowrap text-cream shadow-[0_3px_0_#0a1628,0_8px_16px_-6px_rgb(12_26_48/0.5)]">
          {title}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-cream/95 py-1 pr-2.5 pl-1 font-sans text-[0.75rem] font-semibold whitespace-nowrap text-illini-blue shadow-[0_6px_14px_-6px_rgb(12_26_48/0.45)]">
          <kbd className="grid size-5 place-items-center rounded-[0.3rem] border border-b-[3px] border-illini-blue/25 bg-white font-title text-[0.75rem] leading-none text-illini-blue">
            {keyLabel}
          </kbd>
          {action}
        </span>
      </div>
    </div>
  )
}

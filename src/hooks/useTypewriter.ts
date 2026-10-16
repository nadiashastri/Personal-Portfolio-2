import { useCallback, useEffect, useRef, useState } from 'react'

interface TypewriterOptions {
  /** Characters per second. */
  speed?: number
  /** Wait before typing begins (ms). */
  delay?: number
  /** When false, the full text shows immediately (reduced motion, repeat visits). */
  animate?: boolean
}

/**
 * Types `text` out over time. Returns the visible portion, whether it's done,
 * and `finish()` to skip straight to the end. Speed eases slightly after
 * punctuation so it reads like someone typing, not a ticker.
 */
export function useTypewriter(text: string, { speed = 80, delay = 0, animate = true }: TypewriterOptions = {}) {
  const [count, setCount] = useState(animate ? 0 : text.length)
  const done = count >= text.length
  const finishedRef = useRef(!animate)

  useEffect(() => {
    if (!animate || finishedRef.current) return
    let raf = 0
    let last = 0
    let budget = 0
    let i = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      if (finishedRef.current) return
      if (now >= start) {
        budget += (last ? now - last : 0) / 1000
        last = now
        const pause = /[.,;!?]/.test(text[i - 1] ?? '') ? 6 : 1
        while (budget >= pause / speed && i < text.length) {
          budget -= pause / speed
          i++
        }
        setCount(i)
        if (i >= text.length) {
          finishedRef.current = true
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, speed, delay, animate])

  const finish = useCallback(() => {
    finishedRef.current = true
    setCount(text.length)
  }, [text])

  return { visible: text.slice(0, count), done, finish }
}

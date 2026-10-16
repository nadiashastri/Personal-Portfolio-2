import { useCallback, useEffect, useState } from 'react'

export const isPointerLockSupported = () =>
  typeof document !== 'undefined' && 'requestPointerLock' in document.body

/**
 * Tracks pointer-lock state for the page. `requestLock` must be called from a
 * user gesture (e.g. a click handler) or the browser will refuse it.
 */
export function usePointerLock() {
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const onChange = () => setIsLocked(document.pointerLockElement !== null)
    document.addEventListener('pointerlockchange', onChange)
    document.addEventListener('pointerlockerror', onChange)
    return () => {
      document.removeEventListener('pointerlockchange', onChange)
      document.removeEventListener('pointerlockerror', onChange)
    }
  }, [])

  const requestLock = useCallback(() => {
    if (!isPointerLockSupported() || document.pointerLockElement) return
    try {
      // Chrome returns a promise and rejects if the user re-locks too quickly
      // after pressing Escape; the resume prompt stays visible so they can retry.
      const result = document.body.requestPointerLock() as unknown
      if (result instanceof Promise) result.catch(() => {})
    } catch {
      /* unsupported or blocked — stay unlocked */
    }
  }, [])

  const exitLock = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [])

  return { isLocked, requestLock, exitLock }
}

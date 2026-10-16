import { useEffect, useRef } from 'react'
import type { MoveInput } from '../lib/movement'

export interface MovementKeys extends MoveInput {
  sprint: boolean
}

const KEY_MAP: Record<string, keyof MovementKeys> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
}

const released = (): MovementKeys => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
})

/**
 * Live movement-key state stored in a ref, so reading it every frame never
 * triggers React re-renders. Keys reset on blur to avoid "stuck" movement.
 */
export function useMovementKeys() {
  const keys = useRef<MovementKeys>(released())

  useEffect(() => {
    const set = (pressed: boolean) => (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code]
      if (action) keys.current[action] = pressed
    }
    const onDown = set(true)
    const onUp = set(false)
    const reset = () => (keys.current = released())

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', reset)
    document.addEventListener('pointerlockchange', reset)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', reset)
      document.removeEventListener('pointerlockchange', reset)
    }
  }, [])

  return keys
}

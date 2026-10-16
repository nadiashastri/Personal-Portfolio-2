import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Shown instead of the 3D scene if it can't start or crashes. */
  fallback?: ReactNode
}

/** True when the browser can create a WebGL context at all. */
export function hasWebGL() {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function SceneUnavailable() {
  return (
    <div role="alert" className="fixed inset-0 grid place-items-center bg-[#dfe8ef] px-6 text-center">
      <div className="max-w-md">
        <p className="font-title text-2xl text-illini-blue">The Quad couldn&apos;t load here</p>
        <p className="mt-3 font-sans text-[0.95rem] leading-relaxed text-ink/75">
          This site needs WebGL to draw the 3D campus, and it isn&apos;t available in this browser (or hardware
          acceleration is turned off). Try an up-to-date Chrome, Edge, Firefox or Safari with hardware acceleration on.
        </p>
      </div>
    </div>
  )
}

/**
 * Contains failures in the 3D scene (no WebGL, lost GPU context, a bad model)
 * so the rest of the page keeps working and the visitor sees a clear message
 * instead of a blank screen.
 */
export class SceneErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D scene failed:', error, info.componentStack)
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? <SceneUnavailable />
    return this.props.children
  }
}

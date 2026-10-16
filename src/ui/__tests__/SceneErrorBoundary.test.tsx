import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SceneErrorBoundary } from '../SceneErrorBoundary'

const actual = await vi.importActual<typeof import('../SceneErrorBoundary')>('../SceneErrorBoundary')

function Boom(): never {
  throw new Error('WebGL context lost')
}

describe('SceneErrorBoundary', () => {
  it('replaces a crashed 3D scene with a clear message instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <>
        <SceneErrorBoundary>
          <Boom />
        </SceneErrorBoundary>
        <button>Guide</button>
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn.t load/i)
    // The rest of the page is unaffected.
    expect(screen.getByRole('button', { name: 'Guide' })).toBeInTheDocument()
  })

  it('reports no WebGL when the browser cannot create a context (as in jsdom)', () => {
    expect(actual.hasWebGL()).toBe(false)
  })
})

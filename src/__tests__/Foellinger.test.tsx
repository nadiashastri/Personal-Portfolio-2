import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { FOELLINGER_ENTRANCE } from '../config/world'
import { PROJECTS } from '../content/projects'

type ExperienceStubProps = {
  controlsEnabled: boolean
  active?: boolean
  onFoellingerRangeChange?: (v: boolean) => void
  teleport?: { position: readonly number[]; key: number }
}

// WebGL stand-in: exposes state and lets a test walk up to Foellinger's entrance.
vi.mock('../scene/Experience', () => ({
  Experience: ({ controlsEnabled, active = true, onFoellingerRangeChange, teleport }: ExperienceStubProps) => (
    <div
      data-testid="experience"
      data-controls={String(controlsEnabled)}
      data-active={String(active)}
      data-teleport={teleport ? teleport.position.join(',') : ''}
    >
      <button onClick={() => onFoellingerRangeChange?.(true)}>walk to Foellinger</button>
      <button onClick={() => onFoellingerRangeChange?.(false)}>walk away from Foellinger</button>
    </div>
  ),
}))

function setLocked(locked: boolean) {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (locked ? document.body : null) })
  act(() => {
    document.dispatchEvent(new Event('pointerlockchange'))
  })
}

let requestPointerLock: ReturnType<typeof vi.fn>
beforeEach(() => {
  requestPointerLock = vi.fn(() => setLocked(true))
  document.body.requestPointerLock = requestPointerLock as never
  document.exitPointerLock = vi.fn(() => setLocked(false))
})
afterEach(() => setLocked(false))

async function startExploring() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /enter the quad/i }))
  return user
}

async function enterFoellinger(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'walk to Foellinger' }))
  await user.keyboard('e')
  return screen.findByRole('region', { name: 'Project showcase' }, { timeout: 3000 })
}

describe('Foellinger project showcase', () => {
  it('does not open when the player is out of range', async () => {
    const user = await startExploring()
    await user.keyboard('e')
    await new Promise((r) => setTimeout(r, 700))
    expect(screen.queryByTestId('auditorium')).not.toBeInTheDocument()
    expect(screen.getByTestId('experience')).toHaveAttribute('data-active', 'true')
  })

  it('enters the auditorium in range: releases the mouse, pauses the Quad and shows the first project', async () => {
    const user = await startExploring()
    await enterFoellinger(user)
    expect(document.exitPointerLock).toHaveBeenCalled()
    expect(screen.getByTestId('auditorium')).toBeInTheDocument()
    expect(screen.getByTestId('experience')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('experience')).toHaveAttribute('data-controls', 'false')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(PROJECTS[0].title)
  })

  it('browses projects inside the auditorium', async () => {
    const user = await startExploring()
    await enterFoellinger(user)
    await user.click(screen.getByRole('button', { name: 'Next project' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(PROJECTS[1].title))
  })

  it('returns to the Quad outside the entrance, out of range so it does not reopen, with the mouse recaptured', async () => {
    const user = await startExploring()
    await enterFoellinger(user)
    requestPointerLock.mockClear()
    await user.click(screen.getByRole('button', { name: /return to quad/i }))
    expect(requestPointerLock).toHaveBeenCalledOnce()

    await waitFor(() => expect(screen.queryByTestId('auditorium')).not.toBeInTheDocument(), { timeout: 3000 })
    const experience = screen.getByTestId('experience')
    expect(experience).toHaveAttribute('data-active', 'true')
    expect(experience).toHaveAttribute('data-controls', 'true')

    const [x, , z] = experience.getAttribute('data-teleport')!.split(',').map(Number)
    const [zx, zz] = FOELLINGER_ENTRANCE.zone
    expect(Math.hypot(x - zx, z - zz)).toBeGreaterThan(FOELLINGER_ENTRANCE.range.exit)
  })

  it('Escape returns to the Quad and offers a click to resume', async () => {
    const user = await startExploring()
    await enterFoellinger(user)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByTestId('auditorium')).not.toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByRole('button', { name: /click to resume exploring/i })).toBeInTheDocument()
  })
})

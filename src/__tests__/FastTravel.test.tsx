import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { DESTINATIONS } from '../config/fastTravel'
import { labelFor } from '../config/locationZones'

/** Every teleport the scene receives, in order. */
const teleports: { key: number; position: readonly number[] }[] = []

vi.mock('../scene/Experience', async () => {
  const { useEffect } = await import('react')
  return {
    Experience: ({ controlsEnabled, teleport, lighting }: { controlsEnabled: boolean; teleport?: { key: number; position: readonly number[] }; lighting?: string }) => {
      useEffect(() => {
        if (teleport) teleports.push({ key: teleport.key, position: teleport.position })
      }, [teleport])
      return (
        <div
          data-testid="experience"
          data-controls={String(controlsEnabled)}
          data-teleport={teleport?.position.join(',') ?? ''}
          data-lighting={lighting}
        />
      )
    },
  }
})

function setLocked(locked: boolean) {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (locked ? document.body : null) })
  act(() => {
    document.dispatchEvent(new Event('pointerlockchange'))
  })
}

let requestPointerLock: ReturnType<typeof vi.fn>
beforeEach(() => {
  teleports.length = 0
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

const location = () => screen.getByRole('status', { name: 'Current location' })

describe('Guide quick travel', () => {
  it('opens and closes the guide, pausing exploration while it is open', async () => {
    const user = await startExploring()
    expect(screen.getByTestId('experience')).toHaveAttribute('data-controls', 'true')
    await user.keyboard('g')
    expect(screen.getByRole('dialog', { name: /quad guide/i })).toBeInTheDocument()
    expect(document.exitPointerLock).toHaveBeenCalled()
    expect(screen.getByTestId('experience')).toHaveAttribute('data-controls', 'false')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Closing can't recapture the mouse by itself: a small click-to-resume appears.
    expect(screen.getByRole('button', { name: /click to resume exploring/i })).toBeInTheDocument()
  })

  for (const destination of DESTINATIONS) {
    it(`travels to ${destination.title}: teleports, updates the label, and resumes exploring`, async () => {
      const user = await startExploring()
      await user.keyboard('g')
      await user.click(screen.getByRole('button', { name: new RegExp(destination.title) }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      await waitFor(() => expect(screen.getByTestId('experience')).toHaveAttribute('data-teleport', destination.arrival.position.join(',')))
      await waitFor(() => expect(location()).toHaveTextContent(new RegExp(`^${labelFor(destination.location)}$`)))
      expect(requestPointerLock).toHaveBeenCalled()
      await waitFor(() => expect(screen.getByTestId('experience')).toHaveAttribute('data-controls', 'true'))
      // Arriving never opens the destination's popup.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  }

  it('travels correctly after visiting another destination first', async () => {
    const user = await startExploring()
    for (const d of [DESTINATIONS[2], DESTINATIONS[0]]) {
      await user.keyboard('g')
      const button = screen.getByRole('button', { name: new RegExp(d.title) })
      // Wait out the previous trip's fade-in (stops are disabled during a trip).
      await waitFor(() => expect(button).toBeEnabled())
      await user.click(button)
      await waitFor(() => expect(screen.getByTestId('experience')).toHaveAttribute('data-teleport', d.arrival.position.join(',')))
      await waitFor(() => expect(screen.getByTestId('experience')).toHaveAttribute('data-controls', 'true'))
    }
    expect(teleports.map((t) => t.position.join(','))).toEqual([DESTINATIONS[2], DESTINATIONS[0]].map((d) => d.arrival.position.join(',')))
  })

  it('ignores a second trip requested while one is in progress', async () => {
    const user = await startExploring()
    await user.keyboard('g')
    await user.click(screen.getByRole('button', { name: /Foellinger/ }))
    // Reopen the guide mid-fade and try another stop: its buttons are disabled and the trip is ignored.
    await user.keyboard('g')
    const union = screen.getByRole('button', { name: /Illini Union/ })
    expect(union).toBeDisabled()
    await user.click(union)
    await waitFor(() => expect(teleports).toHaveLength(1))
    await new Promise((r) => setTimeout(r, 900))
    expect(teleports).toHaveLength(1)
    expect(teleports[0].position.join(',')).toBe(DESTINATIONS[1].arrival.position.join(','))
  })

  it('does not let E activate anything while the guide is open', async () => {
    const user = await startExploring()
    await user.keyboard('g')
    await user.keyboard('e')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: /quad guide/i })).toBeInTheDocument()
  })
})

describe('Guide map', () => {
  it('fast-travels from a map pin with the same system as the list', async () => {
    const user = await startExploring()
    await user.keyboard('g')
    expect(screen.getByRole('img', { name: /illustrated map of the main quad/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Travel to Projects' }))
    const foellinger = DESTINATIONS.find((d) => d.id === 'foellinger')!
    await waitFor(() => expect(screen.getByTestId('experience')).toHaveAttribute('data-teleport', foellinger.arrival.position.join(',')))
    await waitFor(() => expect(location()).toHaveTextContent(/^Foellinger Auditorium$/))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Lighting mode', () => {
  it('defaults to Daylight, switches to Sunset, and stays Sunset through fast travel', async () => {
    const user = await startExploring()
    const scene = screen.getByTestId('experience')
    expect(scene).toHaveAttribute('data-lighting', 'daylight')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('radio', { name: 'Sunset' }))
    expect(scene).toHaveAttribute('data-lighting', 'sunset')

    await user.keyboard('g')
    await user.click(screen.getByRole('button', { name: /Illini Union/ }))
    const union = DESTINATIONS.find((d) => d.id === 'union')!
    await waitFor(() => expect(scene).toHaveAttribute('data-teleport', union.arrival.position.join(',')))
    expect(scene).toHaveAttribute('data-lighting', 'sunset')
    expect(screen.getByRole('radio', { name: 'Sunset' })).toBeChecked()
  })
})

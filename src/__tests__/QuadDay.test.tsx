import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { ORGANIZATIONS, WORK_EXPERIENCE } from '../content/involvement'

// WebGL stand-in: lets a test "walk" to each booth (setting the nearest Quad Day target).
vi.mock('../scene/Experience', () => ({
  Experience: ({ controlsEnabled, onQuadDayTargetChange, onAboutRangeChange, onLocationChange }: {
    controlsEnabled: boolean
    onQuadDayTargetChange?: (id: string | null) => void
    onAboutRangeChange?: (v: boolean) => void
    onLocationChange?: (id: 'union' | 'foellinger' | 'about' | null) => void
  }) => (
    <div data-testid="experience" data-controls={String(controlsEnabled)}>
      {['nobe', 'swe', 'ambassadors', 'wcs', 'work'].map((id) => (
        <button key={id} onClick={() => onQuadDayTargetChange?.(id)}>
          walk to {id}
        </button>
      ))}
      <button onClick={() => onQuadDayTargetChange?.(null)}>walk away</button>
      <button onClick={() => onAboutRangeChange?.(true)}>walk to about</button>
      <button onClick={() => onLocationChange?.('union')}>arrive at the Union</button>
      <button onClick={() => onLocationChange?.(null)}>wander off</button>
    </div>
  ),
}))

function setLocked(locked: boolean) {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (locked ? document.body : null) })
  act(() => {
    document.dispatchEvent(new Event('pointerlockchange'))
  })
}

beforeEach(() => {
  document.body.requestPointerLock = vi.fn(() => setLocked(true)) as never
  document.exitPointerLock = vi.fn(() => setLocked(false))
})
afterEach(() => setLocked(false))

async function startExploring() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /enter the quad/i }))
  return user
}

const walkTo = (user: ReturnType<typeof userEvent.setup>, id: string) => user.click(screen.getByRole('button', { name: `walk to ${id}` }))

describe('Quad Day booths and work board', () => {
  it('ignores E when no booth is in range', async () => {
    const user = await startExploring()
    await user.keyboard('e')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the booth prompt and opens the right organisation in range', async () => {
    const user = await startExploring()
    await walkTo(user, 'swe')
    expect(screen.getByText('SOCIETY OF WOMEN ENGINEERS')).toBeInTheDocument()
    expect(screen.getByText('Learn more')).toBeInTheDocument()

    await user.keyboard('e')
    const dialog = await screen.findByRole('dialog', { name: 'Society of Women Engineers' })
    expect(dialog).toHaveTextContent('Tech Committee Events Chair')
    expect(dialog).toHaveTextContent('Fall 2026–present')
    expect(dialog).toHaveTextContent('Technical communication')
    expect(document.exitPointerLock).toHaveBeenCalled()
    expect(screen.getByTestId('experience')).toHaveAttribute('data-controls', 'false')
  })

  it('shows every organisation with its own role and dates', async () => {
    const user = await startExploring()
    for (const org of ORGANIZATIONS) {
      await walkTo(user, org.id)
      await user.keyboard('e')
      const dialog = await screen.findByRole('dialog', { name: org.name })
      expect(dialog).toHaveTextContent(org.role)
      expect(dialog).toHaveTextContent(org.dates)
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }
  })

  it('switches booths without stale content', async () => {
    const user = await startExploring()
    await walkTo(user, 'nobe')
    await user.keyboard('e')
    await screen.findByRole('dialog', { name: ORGANIZATIONS[0].name })
    await user.click(screen.getByRole('button', { name: 'Close NOBE' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await walkTo(user, 'wcs')
    await user.keyboard('e')
    const dialog = await screen.findByRole('dialog', { name: 'Women in Computer Science' })
    expect(dialog).toHaveTextContent('Explorations Committee Member')
    expect(dialog).not.toHaveTextContent('Supabase')
    expect(screen.queryByText(ORGANIZATIONS[0].role)).not.toBeInTheDocument()
  })

  it('opens and closes the work experience board', async () => {
    const user = await startExploring()
    await walkTo(user, 'work')
    expect(screen.getByText('View experience')).toBeInTheDocument()
    await user.keyboard('e')
    const dialog = await screen.findByRole('dialog', { name: 'Work Experience' })
    for (const job of WORK_EXPERIENCE) {
      expect(dialog).toHaveTextContent(job.title)
      expect(dialog).toHaveTextContent(job.employer)
      expect(dialog).toHaveTextContent(job.dates)
    }
    await user.click(screen.getByRole('button', { name: 'Close work experience' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByTestId('experience')).toHaveAttribute('data-controls', 'true')
  })

  it('only ever opens one popup at a time', async () => {
    const user = await startExploring()
    await walkTo(user, 'ambassadors')
    await user.keyboard('e')
    await screen.findByRole('dialog')
    // Repeated E, moving to another booth's range, and About Me in range: still one dialog.
    await user.keyboard('e')
    await walkTo(user, 'work')
    await user.keyboard('e')
    await user.click(screen.getByRole('button', { name: 'walk to about' }))
    await user.keyboard('e')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Illinois Engineering Ambassadors')
  })
})

describe('location label', () => {
  it('shows the area the player is in, and the general label elsewhere', async () => {
    const user = await startExploring()
    expect(screen.getByRole('status', { name: 'Current location' })).toHaveTextContent('Exploring the Quad')
    await user.click(screen.getByRole('button', { name: 'arrive at the Union' }))
    await waitFor(() => expect(screen.getByRole('status', { name: 'Current location' })).toHaveTextContent(/^Illini Union$/))
    await user.click(screen.getByRole('button', { name: 'wander off' }))
    await waitFor(() => expect(screen.getByRole('status', { name: 'Current location' })).toHaveTextContent(/^Exploring the Quad$/))
  })
})

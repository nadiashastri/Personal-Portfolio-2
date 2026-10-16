import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { ABOUT_ME } from '../content/aboutMe'

// WebGL isn't available in jsdom. The stand-in exposes the controls state and
// lets a test "walk" the player into and out of the installation's range.
vi.mock('../scene/Experience', () => ({
  Experience: ({ controlsEnabled, onAboutRangeChange }: { controlsEnabled: boolean; onAboutRangeChange?: (v: boolean) => void }) => (
    <div data-testid="experience" data-controls={String(controlsEnabled)}>
      <button onClick={() => onAboutRangeChange?.(true)}>walk into range</button>
      <button onClick={() => onAboutRangeChange?.(false)}>walk away</button>
    </div>
  ),
}))

/** Simulates the browser granting / releasing pointer lock. */
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
  expect(screen.getByTestId('experience')).toHaveAttribute('data-controls', 'true')
  return user
}

const openCard = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'walk into range' }))
  await user.keyboard('e')
  return screen.findByRole('dialog', { name: ABOUT_ME.heading })
}

describe('About Me interaction', () => {
  it('ignores E when the player is out of range', async () => {
    const user = await startExploring()
    await user.keyboard('e')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the in-world prompt only while in range', async () => {
    const user = await startExploring()
    const prompt = screen.getByText('Press E to get to know me').closest('div')!
    expect(prompt).toHaveClass('opacity-0')
    await user.click(screen.getByRole('button', { name: 'walk into range' }))
    expect(prompt).toHaveClass('opacity-100')
    await user.click(screen.getByRole('button', { name: 'walk away' }))
    expect(prompt).toHaveClass('opacity-0')
  })

  it('ignores E after the player walks back out of range', async () => {
    const user = await startExploring()
    await user.click(screen.getByRole('button', { name: 'walk into range' }))
    await user.click(screen.getByRole('button', { name: 'walk away' }))
    await user.keyboard('e')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens in range: releases the mouse, pauses movement, moves focus in, and never duplicates', async () => {
    const user = await startExploring()
    await openCard(user)

    expect(document.exitPointerLock).toHaveBeenCalled()
    expect(screen.getByTestId('experience')).toHaveAttribute('data-controls', 'false')
    expect(screen.getByRole('button', { name: 'Close About Me' })).toHaveFocus()
    for (const p of ABOUT_ME.description) expect(screen.getByText(p)).toBeInTheDocument()

    await user.keyboard('e')
    await user.keyboard('e')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('types only the heading, and a key press finishes it instantly', async () => {
    const user = await startExploring()
    await openCard(user)
    expect(ABOUT_ME.heading).toBe("Hello, I'm Nadia.")
    // The description is never typed letter by letter: it's present in full from the start.
    for (const p of ABOUT_ME.description) expect(screen.getByText(p)).toBeInTheDocument()
    await user.keyboard('x')
    expect(screen.getByTestId('about-typed')).toHaveTextContent(ABOUT_ME.heading)
  })

  it('shows education, interests, skills and contact links', async () => {
    const user = await startExploring()
    await openCard(user)
    await user.keyboard('x')
    for (const title of ['Education', 'Areas of Interest', 'Technical Skills', "Let's Connect"]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    expect(screen.getByText('GPA 3.85 / 4.0')).toBeInTheDocument()
    expect(screen.getByText('Carl Sandburg High School')).toBeInTheDocument()
    expect(screen.getByText('Quantum computing')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Tools' })).toHaveTextContent('Supabase')
    expect(screen.getByRole('list', { name: 'Languages' })).toHaveTextContent('Spanish')
    expect(screen.queryByText("Things I'm curious about")).not.toBeInTheDocument()
  })

  it('closes with Escape and offers a click to resume exploring', async () => {
    const user = await startExploring()
    await openCard(user)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /click to resume exploring/i })).toBeInTheDocument()
  })

  it('closes with the close button and recaptures the mouse straight away', async () => {
    const user = await startExploring()
    await openCard(user)
    requestPointerLock.mockClear()
    await user.click(screen.getByRole('button', { name: 'Close About Me' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(requestPointerLock).toHaveBeenCalledOnce()
    expect(screen.getByTestId('experience')).toHaveAttribute('data-controls', 'true')
  })

  it('reopening skips the typewriter once it has been read', async () => {
    const user = await startExploring()
    await openCard(user)
    await user.keyboard('x')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.keyboard('e')
    await screen.findByRole('dialog')
    expect(screen.getByTestId('about-typed')).toHaveTextContent(ABOUT_ME.heading)
  })
})

describe("About Me: Let's Connect", () => {
  it('shows email, LinkedIn and GitHub links with the right targets', async () => {
    const user = await startExploring()
    await openCard(user)
    await user.keyboard('x') // finish the typing so the details appear
    expect(await screen.findByRole('heading', { name: "Let's Connect" })).toBeInTheDocument()

    const email = screen.getByRole('link', { name: /email/i })
    expect(email).toHaveAttribute('href', 'mailto:nadiaks2007@gmail.com')
    expect(email).not.toHaveAttribute('target')

    const linkedin = screen.getByRole('link', { name: /linkedin/i })
    expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/nadia-shastri/')
    expect(linkedin).toHaveAttribute('target', '_blank')
    expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer')

    const github = screen.getByRole('link', { name: /github/i })
    expect(github).toHaveAttribute('href', 'https://github.com/nadiashastri')
    expect(github).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

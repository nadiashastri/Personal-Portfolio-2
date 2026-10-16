import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'

// WebGL isn't available in jsdom; the scene is covered by visual checks instead.
vi.mock('../scene/Experience', () => ({
  Experience: ({ controlsEnabled }: { controlsEnabled: boolean }) => (
    <div data-testid="experience" data-controls={String(controlsEnabled)} />
  ),
}))

describe('App', () => {
  it('renders the world behind the intro and requests pointer lock on start', async () => {
    const requestPointerLock = vi.fn()
    document.body.requestPointerLock = requestPointerLock
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('experience')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /enter the quad/i }))

    expect(requestPointerLock).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Nadia Shastri' })).not.toBeInTheDocument(),
    )
  })
})

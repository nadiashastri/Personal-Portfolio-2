import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IntroOverlay } from '../IntroOverlay'

describe('IntroOverlay', () => {
  it('shows the name, intro, guide hint and enter button', () => {
    render(<IntroOverlay onStart={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Nadia Shastri' })).toBeInTheDocument()
    expect(screen.getByText('A little about me, one stop at a time.')).toBeInTheDocument()
    expect(screen.getByText(/guide in the corner/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enter the quad/i })).toBeInTheDocument()
  })

  it('calls onStart when the button is clicked', async () => {
    const onStart = vi.fn()
    render(<IntroOverlay onStart={onStart} />)
    await userEvent.click(screen.getByRole('button', { name: /enter the quad/i }))
    expect(onStart).toHaveBeenCalledOnce()
  })
})

describe('IntroOverlay keyboard', () => {
  it('starts on Enter, like a game title screen', async () => {
    const onStart = vi.fn()
    render(<IntroOverlay onStart={onStart} />)
    await userEvent.keyboard('{Enter}')
    expect(onStart).toHaveBeenCalledOnce()
  })
})

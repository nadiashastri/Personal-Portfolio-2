import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocationCompass } from '../LocationCompass'

describe('LocationCompass', () => {
  it('keeps the heading and place line, and swaps the location name when it changes', async () => {
    const { rerender } = render(<LocationCompass location="Exploring the Quad" />)
    expect(screen.getByText(/The Main Quad/)).toBeInTheDocument()
    expect(screen.getByText('N')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Current location' })).toHaveTextContent('Exploring the Quad')

    rerender(<LocationCompass location="Illini Union" />)
    await waitFor(() => expect(screen.getByRole('status', { name: 'Current location' })).toHaveTextContent(/^Illini Union$/))
    expect(screen.getByText('N')).toBeInTheDocument()
  })
})

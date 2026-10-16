import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LightingToggle } from '../LightingToggle'

describe('LightingToggle', () => {
  it('shows Daylight and Sunset as a labelled radio group with the current mode checked', async () => {
    const onChange = vi.fn()
    render(<LightingToggle mode="daylight" onChange={onChange} />)
    expect(screen.getByRole('radiogroup', { name: 'Lighting' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Daylight' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Sunset' })).not.toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Sunset' }))
    expect(onChange).toHaveBeenCalledWith('sunset')
  })
})

import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DESTINATIONS } from '../../config/fastTravel'
import { NavigationGuide } from '../NavigationGuide'

function Harness({ onTravel = vi.fn() }: { onTravel?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return <NavigationGuide open={open} onOpenChange={setOpen} onTravel={onTravel} />
}

describe('NavigationGuide', () => {
  it('opens to a Quick Travel list of the three stops (no Contact) and closes with Escape', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /guide/i }))
    const dialog = screen.getByRole('dialog', { name: /quad guide/i })
    expect(dialog).toHaveTextContent('Quick travel')
    for (const [title, subtitle] of [
      ['Center Quad', 'About Me'],
      ['Foellinger Auditorium', 'Projects'],
      ['Illini Union', 'Experience & Involvement'],
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(`${title}.*${subtitle}`) })).toBeInTheDocument()
    }
    expect(dialog).not.toHaveTextContent(/contact|kiosk/i)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('reports the chosen destination', async () => {
    const onTravel = vi.fn()
    const user = userEvent.setup()
    render(<Harness onTravel={onTravel} />)
    await user.click(screen.getByRole('button', { name: /guide/i }))
    await user.click(screen.getByRole('button', { name: /Illini Union/ }))
    expect(onTravel).toHaveBeenCalledWith('union')
    expect(DESTINATIONS.map((d) => d.id)).toEqual(['center', 'foellinger', 'union'])
  })
})

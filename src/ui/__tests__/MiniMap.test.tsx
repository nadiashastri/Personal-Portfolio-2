import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DESTINATIONS } from '../../config/fastTravel'
import type { PlayerPose } from '../../lib/playerPose'
import { MiniMap } from '../MiniMap'

const nextFrame = () => act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))))

describe('MiniMap', () => {
  it('places the YOU marker at the live player position and rotates it to their facing', async () => {
    const pose: PlayerPose = { x: 0, z: 0, yaw: 0, version: 0 }
    render(<MiniMap onTravel={() => {}} pose={pose} />)
    await nextFrame()
    expect(screen.getByTestId('map-player')).toHaveAttribute('transform', 'translate(0.00 0.00)')
    expect(screen.getByTestId('map-arrow')).toHaveAttribute('transform', 'rotate(0.0)')

    // The player walks to the Illini Union and turns to face east.
    Object.assign(pose, { x: 4, z: -120, yaw: -Math.PI / 2, version: 1 })
    await nextFrame()
    await nextFrame()
    expect(screen.getByTestId('map-player')).toHaveAttribute('transform', 'translate(4.00 -120.00)')
    expect(screen.getByTestId('map-arrow')).toHaveAttribute('transform', 'rotate(90.0)')
  })

  it('jumps straight to a fast-travel arrival point', async () => {
    const pose: PlayerPose = { x: 0, z: 0, yaw: 0, version: 0 }
    render(<MiniMap onTravel={() => {}} pose={pose} />)
    const union = DESTINATIONS.find((d) => d.id === 'union')!.arrival.position
    Object.assign(pose, { x: union[0], z: union[2], version: 5 })
    await nextFrame()
    await nextFrame()
    expect(screen.getByTestId('map-player')).toHaveAttribute('transform', `translate(${union[0].toFixed(2)} ${union[2].toFixed(2)})`)
  })

  it('clamps a player outside the map to its edge', async () => {
    const pose: PlayerPose = { x: 500, z: 900, yaw: 0, version: 1 }
    render(<MiniMap onTravel={() => {}} pose={pose} />)
    await nextFrame()
    const [, x, y] = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(screen.getByTestId('map-player').getAttribute('transform')!)!
    expect(Number(x)).toBeLessThan(88)
    expect(Number(y)).toBeLessThan(182)
  })

  it('travels when a destination pin is clicked', async () => {
    const onTravel = vi.fn()
    const user = userEvent.setup()
    render(<MiniMap onTravel={onTravel} />)
    for (const [name, id] of [['Experience', 'union'], ['About Me', 'center'], ['Projects', 'foellinger']] as const) {
      await user.click(screen.getByRole('button', { name: `Travel to ${name}` }))
      expect(onTravel).toHaveBeenLastCalledWith(id)
    }
  })

  it('explains each destination in a tooltip, and disables pins during a trip', () => {
    render(<MiniMap onTravel={() => {}} travelling />)
    const pin = screen.getByRole('button', { name: 'Travel to Projects' })
    expect(pin).toHaveAccessibleDescription(/browse my projects/i)
    expect(pin).toBeDisabled()
  })

  it('scales responsively: fixed aspect ratio, fluid width, viewBox in world metres', () => {
    const { container } = render(<MiniMap onTravel={() => {}} />)
    const frame = container.firstElementChild as HTMLElement
    expect(frame).toHaveClass('w-full')
    expect(frame.style.aspectRatio).toMatch(/176 \/ 364/)
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-88 -182 176 364')
  })
})

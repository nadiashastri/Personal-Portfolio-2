import { describe, expect, it } from 'vitest'
import { headingFromYaw } from '../compass'

describe('headingFromYaw', () => {
  it('reads the facing direction from the camera yaw', () => {
    expect(headingFromYaw(0).cardinal).toBe('N')
    expect(headingFromYaw(-Math.PI / 2).cardinal).toBe('E')
    expect(headingFromYaw(Math.PI).cardinal).toBe('S')
    expect(headingFromYaw(Math.PI / 2).cardinal).toBe('W')
    expect(headingFromYaw(-Math.PI / 4).cardinal).toBe('NE')
    expect(headingFromYaw(-Math.PI / 2).bearing).toBeCloseTo(90)
  })
})

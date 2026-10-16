const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

/**
 * Compass reading for a camera yaw (three.js convention: 0 faces -Z, which is
 * north on the Quad; positive turns left). Bearing is clockwise from north.
 */
export function headingFromYaw(yaw: number) {
  const bearing = (((-yaw * 180) / Math.PI) % 360 + 360) % 360
  return { bearing, cardinal: CARDINALS[Math.round(bearing / 45) % 8] }
}

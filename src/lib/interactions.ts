export interface InteractionPoint {
  id: string
  /** World XZ position the player's distance is measured from. */
  x: number
  z: number
  /** Enter range; the active point stays active until beyond `exit`. */
  enter: number
  exit: number
}

/**
 * Chooses which interaction the player is "at": the nearest point within
 * range. The currently active point keeps its larger exit radius
 * (hysteresis), but a different point that is nearer and within its own
 * enter radius takes over — so the nearest booth always wins.
 */
export function pickInteraction(points: readonly InteractionPoint[], x: number, z: number, current: string | null): string | null {
  let best: string | null = null
  let bestDistance = Infinity
  for (const p of points) {
    const d = Math.hypot(x - p.x, z - p.z)
    const limit = p.id === current ? p.exit : p.enter
    if (d <= limit && d < bestDistance) {
      best = p.id
      bestDistance = d
    }
  }
  return best
}

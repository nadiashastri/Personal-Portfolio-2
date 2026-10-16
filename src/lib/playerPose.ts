/**
 * The player's live position and facing, written by the first-person
 * controller every frame and read by 2D UI such as the mini-map. A plain
 * mutable object (no React state), so updating it costs nothing and nothing
 * re-renders; readers poll it on their own animation frame while visible.
 */
export interface PlayerPose {
  /** World X (east is +X). */
  x: number
  /** World Z (north is −Z). */
  z: number
  /** Camera yaw in radians (three.js: 0 faces −Z, i.e. north; positive turns left). */
  yaw: number
  /** Increments on every write, so readers can skip unchanged frames. */
  version: number
}

export const playerPose: PlayerPose = { x: 0, z: 0, yaw: 0, version: 0 }

export function setPlayerPose(x: number, z: number, yaw: number) {
  if (x === playerPose.x && z === playerPose.z && yaw === playerPose.yaw) return
  playerPose.x = x
  playerPose.z = z
  playerPose.yaw = yaw
  playerPose.version++
}

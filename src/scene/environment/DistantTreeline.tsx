import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, DoubleSide, RepeatWrapping, SRGBColorSpace, type Mesh } from 'three'
import { createRandom } from '../../lib/random'

/** Painted silhouette of distant tree crowns and rooftops, wrapped around the horizon. */
function createTreelineTexture() {
  const w = 2048
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const rand = createRandom(9)
  const layer = (color: string, base: number, crown: [number, number], roofs: boolean) => {
    ctx.fillStyle = color
    ctx.fillRect(0, h - base, w, base)
    for (let x = -40; x < w + 40; x += 18 + rand() * 30) {
      if (roofs && rand() < 0.12) {
        const bw = 60 + rand() * 90
        const bh = base + 20 + rand() * 40
        ctx.fillRect(x, h - bh, bw, bh)
        x += bw * 0.6
        continue
      }
      const r = crown[0] + rand() * crown[1]
      for (const ox of [0, -w, w]) {
        ctx.beginPath()
        ctx.arc(x + ox, h - base - r * 0.4 + rand() * 6, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  layer('#9fb3a6', 60, [16, 26], true)
  layer('#87a08e', 40, [12, 20], false)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.repeat.set(3, 1)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * A ring of hazy tree line far beyond the campus, so the horizon reads as
 * more town and trees rather than an empty plain. Follows the camera like the sky.
 */
export function DistantTreeline() {
  const mesh = useRef<Mesh>(null)
  const texture = useMemo(createTreelineTexture, [])
  useFrame(({ camera }) => mesh.current?.position.set(camera.position.x, 0, camera.position.z))
  return (
    <mesh ref={mesh} position={[0, 0, 0]} frustumCulled={false}>
      <cylinderGeometry args={[360, 360, 46, 64, 1, true]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.5} side={DoubleSide} depthWrite={false} />
    </mesh>
  )
}

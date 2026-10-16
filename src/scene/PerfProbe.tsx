import { useEffect } from 'react'
import { Stats } from '@react-three/drei'
import { useThree } from '@react-three/fiber'

/**
 * Open the site with `?stats` to show an FPS meter and log draw calls and
 * triangles to the console once the scene has settled.
 */
export const statsEnabled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('stats')

export function PerfProbe() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const id = window.setTimeout(() => {
      const { calls, triangles } = gl.info.render
      console.info(`[quad] draw calls: ${calls}, triangles: ${triangles.toLocaleString()}, textures: ${gl.info.memory.textures}`)
    }, 4000)
    return () => window.clearTimeout(id)
  }, [gl])
  return <Stats />
}

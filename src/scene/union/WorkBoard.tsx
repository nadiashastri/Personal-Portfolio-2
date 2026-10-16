import { useEffect, useMemo } from 'react'
import { WORK_BOARD } from '../../config/quadDay'
import { WORK_EXPERIENCE } from '../../content/involvement'
import { box, gableRoof, place } from '../architecture/geometry'
import { PartList, Parts } from '../architecture/kit'
import { getMaterials } from '../materials/materials'
import { FloatingMarker, paintedTexture } from './QuadDayBooth'

const BOARD = { w: 1.9, h: 1.2, y: 1.6 }

/** Cork board face: navy header, then one pinned index card per job. */
function boardTexture() {
  return paintedTexture(760, 480, (ctx, w, h) => {
    ctx.fillStyle = '#b98a5a'
    ctx.fillRect(0, 0, w, h)
    // Cork speckle
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(90,55,25,0.18)' : 'rgba(255,230,190,0.15)'
      ctx.fillRect((i * 97) % w, (i * 53) % h, 2, 2)
    }
    ctx.fillStyle = '#13294b'
    ctx.fillRect(0, 0, w, 88)
    ctx.fillStyle = '#ff5f05'
    ctx.fillRect(0, 84, w, 6)
    ctx.fillStyle = '#fbf6ee'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '54px "Lilita One", sans-serif'
    ctx.fillText('WORK EXPERIENCE', w / 2, 46)

    const cardW = 210
    WORK_EXPERIENCE.forEach((job, i) => {
      const x = 40 + i * (cardW + 25)
      const y = 130 + (i % 2) * 22
      ctx.save()
      ctx.translate(x + cardW / 2, y + 140)
      ctx.rotate([-0.04, 0.03, -0.02][i] ?? 0)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(-cardW / 2 + 5, -135, cardW, 280)
      ctx.fillStyle = '#fbf6ee'
      ctx.fillRect(-cardW / 2, -140, cardW, 280)
      ctx.fillStyle = '#13294b'
      ctx.font = '28px "Lilita One", sans-serif'
      ctx.textAlign = 'left'
      const words = job.title.split(' ')
      let line = ''
      let ly = -95
      for (const word of words) {
        if (ctx.measureText(line + word).width > cardW - 36) {
          ctx.fillText(line.trim(), -cardW / 2 + 18, ly)
          line = ''
          ly += 32
        }
        line += word + ' '
      }
      ctx.fillText(line.trim(), -cardW / 2 + 18, ly)
      ctx.fillStyle = '#ff5f05'
      ctx.fillRect(-cardW / 2 + 18, ly + 24, 40, 4)
      ctx.fillStyle = 'rgba(12,26,48,0.7)'
      ctx.font = '600 20px Figtree, sans-serif'
      ctx.fillText(job.employer, -cardW / 2 + 18, ly + 58)
      ctx.fillText(job.dates, -cardW / 2 + 18, ly + 86)
      // Pushpin
      ctx.fillStyle = ['#ff5f05', '#13294b', '#e2a72e'][i] ?? '#ff5f05'
      ctx.beginPath()
      ctx.arc(0, -126, 11, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  })
}

/**
 * A campus kiosk noticeboard: cork panel in a wood frame on two posts, under
 * a small shingled roof, with the work experience pinned up as index cards.
 */
export function WorkBoard() {
  const m = getMaterials()
  const texture = useMemo(boardTexture, [])
  const parts = useMemo(() => {
    const p = new PartList()
    for (const x of [-1.05, 1.05]) p.add(m.doorWood, place(box(0.12, 2.5, 0.12), [x, 1.25, 0]))
    p.add(m.doorWood, place(box(BOARD.w + 0.2, BOARD.h + 0.2, 0.08), [0, BOARD.y, -0.02]))
    p.add(m.slate, place(gableRoof(2.4, 0.7, 0.35, 0.05), [0, BOARD.y + BOARD.h / 2 + 0.25, 0], [0, Math.PI / 2, 0]))
    p.add(m.limestone, place(box(2.5, 0.12, 0.5), [0, 0.06, 0]))
    return p.build()
  }, [m])
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <group position={[WORK_BOARD.position[0], 0, WORK_BOARD.position[1]]} rotation={[0, WORK_BOARD.rotationY, 0]}>
      <Parts parts={parts} />
      <mesh position={[0, BOARD.y, 0.025]}>
        <planeGeometry args={[BOARD.w, BOARD.h]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
      <FloatingMarker y={2.75} phase={5} />
    </group>
  )
}

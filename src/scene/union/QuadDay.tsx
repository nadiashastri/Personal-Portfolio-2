import type { RefObject } from 'react'
import { BOOTHS, PROMPT_HEIGHT, QUAD_DAY_POINTS, WORK_BOARD_ID } from '../../config/quadDay'
import { InteractionPoints } from '../installations/InteractionPoints'
import { QuadDayBooth } from './QuadDayBooth'
import { WorkBoard } from './WorkBoard'

const POINTS = QUAD_DAY_POINTS.map((p) => ({ ...p, promptY: p.id === WORK_BOARD_ID ? PROMPT_HEIGHT.board : PROMPT_HEIGHT.booth }))

interface QuadDayProps {
  promptRef?: RefObject<HTMLDivElement | null>
  onTargetChange: (id: string | null) => void
}

/** Mini Quad Day in front of the Illini Union: four org booths and the work board. */
export function QuadDay({ promptRef, onTargetChange }: QuadDayProps) {
  return (
    <group>
      {BOOTHS.map((b, i) => (
        <QuadDayBooth key={b.org.id} placement={b} index={i} />
      ))}
      <WorkBoard />
      <InteractionPoints points={POINTS} promptRef={promptRef} onTargetChange={onTargetChange} />
    </group>
  )
}

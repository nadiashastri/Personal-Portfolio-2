import { useEffect, useMemo, useRef } from 'react'
import { MAP_DESTINATIONS, MAP_HEIGHT, MAP_VIEWBOX, MAP_WIDTH, arrowRotation, buildMapData, worldToMap, type MapDestination } from '../config/miniMap'
import type { DestinationId } from '../config/fastTravel'
import { playerPose, type PlayerPose } from '../lib/playerPose'

const C = {
  paper: '#f3ead8',
  paperEdge: '#e2d3b5',
  meadow: '#c9d6a3',
  lawn: '#a9c77f',
  lawnStripe: '#9fbf75',
  path: '#efe3c8',
  pathEdge: '#d9c8a3',
  plaza: '#e8d9b8',
  brick: '#b4553a',
  brickDark: '#8f3f2a',
  roof: '#5a5f6e',
  roofLight: '#727889',
  stone: '#e4dac6',
  dome: '#8aa0b3',
  domeLight: '#b9c8d4',
  copper: '#6fa79d',
  tree: '#6f9b52',
  treeDark: '#557d3f',
  ink: '#13294b',
  orange: '#ff5f05',
}

/** Builds an SVG path through points (closed). */
const polygon = (pts: readonly (readonly [number, number])[]) => `M${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z`

function DestinationIcon({ kind }: { kind: MapDestination['icon'] }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5">
      {kind === 'person' && (
        <g {...s}>
          <circle cx="12" cy="8" r="3.6" />
          <path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6" />
        </g>
      )}
      {kind === 'code' && (
        <g {...s}>
          <path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5" />
        </g>
      )}
      {kind === 'briefcase' && (
        <g {...s}>
          <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
          <path d="M9 7.5V5.5h6v2M3.5 12.5h17" />
        </g>
      )}
    </svg>
  )
}

/** The static illustration: lawns, paths, trees, buildings, booths. Rendered once. */
function MapArt() {
  const d = useMemo(buildMapData, [])
  const { union, foellinger } = d
  return (
    <>
      <defs>
        {/* Gentle wobble so edges look hand-inked rather than vector-perfect. */}
        <filter id="mm-hand" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
        <filter id="mm-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1.2" dy="1.8" stdDeviation="1" floodColor="#3b2a14" floodOpacity="0.28" />
        </filter>
        {/* Paper grain */}
        <filter id="mm-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0.12 0" />
        </filter>
        <pattern id="mm-mow" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="5" fill={C.lawn} />
          <rect y="5" width="10" height="5" fill={C.lawnStripe} />
        </pattern>
        <radialGradient id="mm-dome" cx="40%" cy="38%" r="70%">
          <stop offset="0%" stopColor={C.domeLight} />
          <stop offset="100%" stopColor={C.dome} />
        </radialGradient>
      </defs>

      {/* Paper and surrounding meadow */}
      <rect x={-200} y={-300} width={400} height={600} fill={C.paper} />
      <g filter="url(#mm-hand)">
        <rect x={d.lawn.x - 20} y={d.lawn.y - 14} width={d.lawn.w + 40} height={d.lawn.h + 28} rx={10} fill={C.meadow} />
        {/* The Quad's main lawn, with mown stripes */}
        <rect x={d.lawn.x} y={d.lawn.y} width={d.lawn.w} height={d.lawn.h} rx={4} fill="url(#mm-mow)" />
      </g>

      {/* Sidewalks: a darker under-stroke gives each walk a soft edge */}
      <g strokeLinecap="round" filter="url(#mm-hand)">
        {d.paths.map((p, i) => (
          <line key={`e${i}`} x1={p.from[0]} y1={p.from[1]} x2={p.to[0]} y2={p.to[1]} stroke={C.pathEdge} strokeWidth={p.width + 1.2} />
        ))}
        {d.paths.map((p, i) => (
          <line key={`p${i}`} x1={p.from[0]} y1={p.from[1]} x2={p.to[0]} y2={p.to[1]} stroke={C.path} strokeWidth={p.width} />
        ))}
        {d.plazas.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={C.plaza} />
        ))}
      </g>

      {/* Side halls */}
      <g filter="url(#mm-shadow)">
        {d.halls.map((h) => (
          <g key={h.id}>
            <rect x={h.x} y={h.y} width={h.w} height={h.h} rx={1.5} fill={C.brick} />
            <rect x={h.x + 2} y={h.y + 2} width={h.w - 4} height={h.h - 4} rx={1} fill={C.roof} opacity={0.85} />
            <line x1={h.x + h.w / 2} y1={h.y + 5} x2={h.x + h.w / 2} y2={h.y + h.h - 5} stroke={C.roofLight} strokeWidth={1.2} />
          </g>
        ))}
        {/* Altgeld's bell tower, peeking in at the north-west */}
        <rect x={d.altgeld.x - 4.5} y={d.altgeld.y - 4.5} width={9} height={9} fill="#c9a77c" />
        <path d={`M${d.altgeld.x - 4.5},${d.altgeld.y - 4.5}L${d.altgeld.x + 4.5},${d.altgeld.y + 4.5}M${d.altgeld.x + 4.5},${d.altgeld.y - 4.5}L${d.altgeld.x - 4.5},${d.altgeld.y + 4.5}`} stroke="#a0472e" strokeWidth={1.2} />
      </g>

      {/* Illini Union: brick main block and wings under slate roofs, terrace, cupola */}
      <g filter="url(#mm-shadow)">
        <rect x={union.terrace.x} y={union.terrace.y} width={union.terrace.w} height={union.terrace.h} fill={C.stone} />
        {[union.main, ...union.wings].map((r, i) => (
          <g key={i}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={1.5} fill={C.brick} />
            <rect x={r.x + 2.2} y={r.y + 2.2} width={r.w - 4.4} height={r.h - 4.4} rx={1} fill={C.roof} />
            <line
              x1={r.w > r.h ? r.x + r.h / 2 : r.x + r.w / 2}
              y1={r.w > r.h ? r.y + r.h / 2 : r.y + r.w / 2}
              x2={r.w > r.h ? r.x + r.w - r.h / 2 : r.x + r.w / 2}
              y2={r.w > r.h ? r.y + r.h / 2 : r.y + r.h - r.w / 2}
              stroke={C.roofLight}
              strokeWidth={1.4}
            />
          </g>
        ))}
        <rect x={union.main.x} y={union.main.y + union.main.h - 1.6} width={union.main.w} height={1.6} fill={C.brickDark} />
        <circle cx={union.cupola.x} cy={union.cupola.y} r={3.2} fill="#f6f1e6" stroke={C.ink} strokeOpacity={0.4} strokeWidth={0.6} />
        <circle cx={union.cupola.x} cy={union.cupola.y} r={1.5} fill="#3d4247" />
      </g>

      {/* Foellinger: D-shaped forecourt ringed by planting, brick front block, ribbed dome */}
      <g filter="url(#mm-shadow)">
        <path d={polygon(foellinger.bed)} fill="none" stroke={C.treeDark} strokeWidth={3.6} strokeLinejoin="round" />
        <path d={polygon(foellinger.bed)} fill="none" stroke={C.orange} strokeWidth={1} strokeDasharray="1.5 2.2" strokeOpacity={0.8} />
        <path d={polygon(foellinger.forecourt)} fill={C.stone} stroke="#cdbfa6" strokeWidth={0.8} />
        <rect x={foellinger.podium.x} y={foellinger.podium.y} width={foellinger.podium.w} height={foellinger.podium.h} fill="#d8ccb4" />
        <rect x={foellinger.front.x} y={foellinger.front.y} width={foellinger.front.w} height={foellinger.front.h} rx={1.5} fill={C.brick} />
        <rect x={foellinger.front.x} y={foellinger.front.y} width={foellinger.front.w} height={2} fill={C.copper} />
        <circle cx={foellinger.drum.x} cy={foellinger.drum.y} r={foellinger.drum.r + 1} fill={C.copper} />
        <circle cx={foellinger.drum.x} cy={foellinger.drum.y} r={foellinger.drum.r} fill="url(#mm-dome)" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          const r = foellinger.drum.r
          return (
            <line
              key={i}
              x1={foellinger.drum.x + Math.cos(a) * 3}
              y1={foellinger.drum.y + Math.sin(a) * 3}
              x2={foellinger.drum.x + Math.cos(a) * r}
              y2={foellinger.drum.y + Math.sin(a) * r}
              stroke="#e8eef3"
              strokeWidth={0.6}
              strokeOpacity={0.8}
            />
          )
        })}
        <circle cx={foellinger.drum.x} cy={foellinger.drum.y} r={3} fill="#3d4247" />
      </g>

      {/* Trees: a soft shadow, a canopy and a highlight each */}
      <g>
        {d.trees.map((t, i) => (
          <circle key={`s${i}`} cx={t.x + 1.4} cy={t.y + 1.8} r={t.r} fill="#3b2a14" opacity={0.14} />
        ))}
        {d.trees.map((t, i) => (
          <g key={i}>
            <circle cx={t.x} cy={t.y} r={t.r} fill={C.tree} />
            <circle cx={t.x} cy={t.y} r={t.r} fill={t.tint} opacity={0.35} />
            <circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.32} r={t.r * 0.42} fill="#fff" opacity={0.14} />
          </g>
        ))}
      </g>

      {/* Quad Day booths and the work board */}
      <g filter="url(#mm-shadow)">
        {d.booths.map((b) => (
          <g key={b.id} transform={`translate(${b.x} ${b.y}) rotate(${b.rotation})`}>
            <rect x={-1.6} y={-1.6} width={3.2} height={3.2} fill={b.color} stroke="#fff" strokeWidth={0.5} />
            <path d="M-1.6,-1.6L1.6,1.6M1.6,-1.6L-1.6,1.6" stroke="#fff" strokeOpacity={0.5} strokeWidth={0.35} />
          </g>
        ))}
        <rect x={d.workBoard.x - 1.3} y={d.workBoard.y - 0.5} width={2.6} height={1} fill="#8a6440" />
      </g>

      {/* About Me sign */}
      <g filter="url(#mm-shadow)">
        <rect x={d.aboutMe.x - 1.9} y={d.aboutMe.y - 1.1} width={3.8} height={2.2} rx={0.4} fill={C.ink} />
        <rect x={d.aboutMe.x - 1.9} y={d.aboutMe.y - 1.1} width={3.8} height={0.6} fill={C.orange} />
      </g>

      {/* Paper grain over everything, and a compass rose in the corner */}
      <rect x={-200} y={-300} width={400} height={600} filter="url(#mm-grain)" pointerEvents="none" />
      <g transform="translate(74 -166)" fill={C.ink}>
        <circle r={7} fill="#fbf6ee" stroke={C.ink} strokeOpacity={0.35} strokeWidth={0.6} />
        <path d="M0,-5.5L1.8,0L0,-1L-1.8,0Z" fill={C.orange} />
        <path d="M0,5.5L1.8,0L0,1L-1.8,0Z" opacity={0.7} />
        <text y={-8.5} textAnchor="middle" fontSize={4.2} fontWeight={700} fontFamily="Figtree, sans-serif">
          N
        </text>
      </g>
    </>
  )
}

interface MiniMapProps {
  onTravel: (id: DestinationId) => void
  /** A trip is in progress: destination pins are briefly disabled. */
  travelling?: boolean
  /** Where to read the live player pose from (the shared store by default; tests pass their own). */
  pose?: PlayerPose
}

/**
 * Illustrated, north-up mini-map of the Quad, drawn from the scene's own
 * layout. The "you" arrow follows the player's real position and facing:
 * while the map is open it polls the shared pose on each animation frame and
 * moves the SVG directly, so React never re-renders for movement.
 */
export function MiniMap({ onTravel, travelling = false, pose = playerPose }: MiniMapProps) {
  const marker = useRef<SVGGElement>(null)
  const arrow = useRef<SVGGElement>(null)

  useEffect(() => {
    let raf = 0
    let seen = -1
    const place = () => {
      if (pose.version !== seen) {
        seen = pose.version
        const p = worldToMap(pose.x, pose.z)
        marker.current?.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`)
        arrow.current?.setAttribute('transform', `rotate(${arrowRotation(pose.yaw).toFixed(1)})`)
      }
      raf = requestAnimationFrame(place)
    }
    place()
    return () => cancelAnimationFrame(raf)
  }, [pose])

  return (
    <div className="relative mx-auto w-full" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
      <svg
        viewBox={MAP_VIEWBOX}
        role="img"
        aria-label="Illustrated map of the Main Quad: Illini Union to the north, Foellinger Auditorium to the south, Center Quad in the middle. An orange arrow shows where you are."
        className="absolute inset-0 size-full overflow-hidden rounded-[1rem]"
      >
        <MapArt />
        {/* You are here */}
        <g ref={marker} data-testid="map-player">
          <circle r={7} fill="#ff5f05" opacity={0.22}>
            <animate attributeName="r" values="5;8.5;5" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.28;0.08;0.28" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <g ref={arrow} data-testid="map-arrow">
            <path d="M0,-6.2L4.4,4.6L0,2.4L-4.4,4.6Z" fill={C.orange} stroke="#fbf6ee" strokeWidth={1.2} strokeLinejoin="round" />
          </g>
          <text y={11.5} textAnchor="middle" fontSize={4.4} fontWeight={800} letterSpacing={0.6} fill={C.ink} stroke="#fbf6ee" strokeWidth={1.4} paintOrder="stroke" fontFamily="Figtree, sans-serif">
            YOU
          </text>
        </g>
      </svg>

      {/* Destination pins: real buttons over the map, so they're focusable and clickable. */}
      {MAP_DESTINATIONS.map((dest) => {
        const p = worldToMap(dest.at[0], dest.at[1])
        return (
          <div key={dest.id} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.u * 100}%`, top: `${p.v * 100}%` }}>
            <button
              type="button"
              onClick={() => onTravel(dest.id)}
              disabled={travelling}
              aria-label={`Travel to ${dest.label}`}
              aria-describedby={`map-tip-${dest.id}`}
              className="flex items-center gap-1 rounded-full border border-b-2 border-[#0a1628] bg-illini-blue py-0.5 pr-2 pl-1 font-sans text-[0.68rem] font-bold whitespace-nowrap text-cream shadow-[0_3px_8px_-2px_rgb(12_26_48/0.5)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#1c3766] focus-visible:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="grid size-[1.15rem] place-items-center rounded-full bg-illini-orange text-white transition-transform duration-200 group-hover:scale-110">
                <DestinationIcon kind={dest.icon} />
              </span>
              {dest.label}
            </button>
            <span
              id={`map-tip-${dest.id}`}
              role="tooltip"
              className="pointer-events-none absolute top-full left-1/2 z-10 mt-1.5 w-44 -translate-x-1/2 translate-y-1 rounded-[0.5rem] bg-cream px-2.5 py-1.5 text-left font-sans text-[0.68rem] leading-snug text-ink/80 opacity-0 shadow-[0_8px_20px_-8px_rgb(12_26_48/0.55)] transition duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
            >
              {dest.tooltip}
            </span>
          </div>
        )
      })}
    </div>
  )
}

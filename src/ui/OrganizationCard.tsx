import { motion, type Variants } from 'motion/react'
import { ORGANIZATIONS, type Organization, type OrgIcon } from '../content/involvement'
import { GameDialog, type DialogCloseReason } from './GameDialog'

const EASE = [0.16, 1, 0.3, 1] as const
const reveal: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } } }
const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}
const tags: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const tag: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: EASE } },
}

/** Small line illustrations, one per organisation. */
function Icon({ kind }: { kind: OrgIcon }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-full">
      {kind === 'database' && (
        <g {...common}>
          <ellipse cx="24" cy="12" rx="13" ry="5" />
          <path d="M11 12v24c0 2.8 5.8 5 13 5s13-2.2 13-5V12" />
          <path d="M11 24c0 2.8 5.8 5 13 5s13-2.2 13-5" />
        </g>
      )}
      {kind === 'gear' && (
        <g {...common}>
          <circle cx="24" cy="24" r="6" />
          <path d="M24 6v6M24 36v6M6 24h6M36 24h6M11.3 11.3l4.2 4.2M32.5 32.5l4.2 4.2M11.3 36.7l4.2-4.2M32.5 15.5l4.2-4.2" />
          <circle cx="24" cy="24" r="12" />
        </g>
      )}
      {kind === 'megaphone' && (
        <g {...common}>
          <path d="M8 20v8h6l16 9V11l-16 9H8z" />
          <path d="M14 28l3 10h5l-2-9" />
          <path d="M36 18c2 1.5 3 3.6 3 6s-1 4.5-3 6" />
        </g>
      )}
      {kind === 'code' && (
        <g {...common}>
          <path d="M17 14L7 24l10 10M31 14l10 10-10 10M27 10l-6 28" />
        </g>
      )}
    </svg>
  )
}

/**
 * A collectible organisation profile: a header band in the org's colour
 * with its badge and illustration, then role, dates, what I do, and the
 * skills gained as badges. Same shell as every in-world popup.
 */
export function OrganizationCard({ org, onClose }: { org: Organization; onClose: (reason: DialogCloseReason) => void }) {
  const number = ORGANIZATIONS.findIndex((o) => o.id === org.id) + 1
  const headingId = `org-${org.id}-heading`

  return (
    <GameDialog labelledBy={headingId} onClose={onClose} closeLabel={`Close ${org.short}`}>
      <motion.div variants={reveal} initial="hidden" animate="show">
        {/* Header band */}
        <div className="relative overflow-hidden rounded-t-[1.4rem] px-6 pt-6 pb-5 sm:px-8" style={{ background: org.colors.primary, color: org.colors.ink }}>
          <div aria-hidden className="absolute -right-6 -bottom-8 size-36 opacity-15">
            <Icon kind={org.icon} />
          </div>
          <motion.p variants={item} className="font-title text-[0.78rem] tracking-[0.16em] uppercase opacity-80">
            Quad Day · Involvement {String(number).padStart(2, '0')} / {String(ORGANIZATIONS.length).padStart(2, '0')}
          </motion.p>
          <motion.div variants={item} className="mt-3 flex items-center gap-4 pr-10">
            <div
              aria-hidden
              className="grid size-14 shrink-0 place-items-center rounded-[0.9rem] bg-cream p-2.5"
              style={{ color: org.colors.primary === '#e2a72e' ? '#13294b' : org.colors.primary, boxShadow: `0 4px 0 ${org.colors.secondary}` }}
            >
              <Icon kind={org.icon} />
            </div>
            <div>
              <p className="font-title text-[1.9rem] leading-none tracking-[0.02em]">{org.short}</p>
              <h2 id={headingId} className="mt-1 font-sans text-[0.98rem] leading-snug font-semibold">
                {org.name}
              </h2>
            </div>
          </motion.div>
        </div>

        <div className="px-6 pt-5 pb-6 sm:px-8 sm:pb-7">
          <motion.div variants={item} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="font-title text-[1.25rem] leading-tight">{org.role}</p>
            <span
              className="rounded-[0.4rem] border px-2 py-0.5 font-sans text-[0.72rem] font-semibold tracking-[0.1em] text-illini-blue uppercase"
              style={{ borderColor: org.colors.primary }}
            >
              {org.dates}
            </span>
          </motion.div>
          <motion.div variants={item} className="mt-4 space-y-2.5 font-sans text-[0.95rem] leading-relaxed text-ink/85">
            {org.description.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </motion.div>
          <motion.section variants={item} className="mt-6">
            <h3 className="font-title text-[0.9rem] tracking-[0.1em] uppercase">Skills gained</h3>
            <motion.ul variants={tags} className="mt-2.5 flex flex-wrap gap-2" aria-label="Skills gained">
              {org.skills.map((s) => (
                <motion.li
                  key={s}
                  variants={tag}
                  className="rounded-[0.5rem] border border-b-[3px] border-illini-blue/15 bg-white px-2.5 pt-1 pb-1.5 font-sans text-[0.82rem] font-semibold"
                  style={{ borderBottomColor: org.colors.primary }}
                >
                  {s}
                </motion.li>
              ))}
            </motion.ul>
          </motion.section>
        </div>
      </motion.div>
    </GameDialog>
  )
}

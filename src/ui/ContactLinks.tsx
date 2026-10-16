import { motion, type Variants } from 'motion/react'
import { CONTACT_LINKS, isUsableContactHref, type ContactLink } from '../content/contact'

function ContactIcon({ id }: { id: ContactLink['id'] }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      {id === 'email' && (
        <g {...stroke}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3.5 6.5 12 13l8.5-6.5" />
        </g>
      )}
      {id === 'linkedin' && (
        <g fill="currentColor">
          <rect x="3" y="9" width="4" height="12" rx="0.6" />
          <circle cx="5" cy="5" r="2.2" />
          <path d="M10 9h3.8v1.7c.6-1.1 2-2 3.9-2 3.2 0 4.3 2 4.3 5.3V21h-4v-6.2c0-1.6-.4-2.7-1.9-2.7-1.6 0-2.1 1.2-2.1 2.8V21h-4z" />
        </g>
      )}
      {id === 'github' && (
        <path
          fill="currentColor"
          d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.3-1.2-3.3-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.4-1.1-4.4-4.8 0-1 .4-1.9 1-2.6-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.6 0 3.7-2.3 4.6-4.4 4.8.3.3.6.9.6 1.8v2.6c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5z"
        />
      )}
    </svg>
  )
}

interface ContactLinksProps {
  /** Reveal variant from the parent card, so links join its stagger. */
  variants?: Variants
}

/**
 * "Let's Connect": compact contact chips for the About Me card. Only links
 * with a usable mailto:/https: address render; external ones open in a new
 * tab with noopener/noreferrer.
 */
export function ContactLinks({ variants }: ContactLinksProps) {
  const links = CONTACT_LINKS.filter((l) => isUsableContactHref(l.href))
  if (links.length === 0) return null
  return (
    <section aria-labelledby="connect-heading">
      <motion.h3 variants={variants} id="connect-heading" className="font-title text-[0.95rem] tracking-[0.08em] text-illini-blue uppercase">
        Let&apos;s Connect
      </motion.h3>
      <ul className="mt-3 flex flex-wrap gap-1.5 max-[420px]:flex-col">
        {links.map((link) => (
          <motion.li key={link.id} variants={variants}>
            <a
              href={link.href!}
              {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              aria-label={`${link.label}: ${link.display}${link.external ? ' (opens in a new tab)' : ''}`}
              className="group flex items-center gap-2 rounded-[0.6rem] border border-b-[3px] border-illini-blue/15 bg-white py-1.5 pr-2.5 pl-1.5 text-illini-blue transition duration-200 hover:-translate-y-0.5 hover:border-illini-orange/60 hover:text-illini-orange-deep focus-visible:-translate-y-0.5 active:translate-y-0 max-[420px]:w-full"
            >
              <span className="grid size-7 place-items-center rounded-[0.45rem] bg-illini-blue text-cream transition duration-200 group-hover:-rotate-8 group-hover:bg-illini-orange group-focus-visible:bg-illini-orange">
                <ContactIcon id={link.id} />
              </span>
              <span className="leading-tight">
                <span className="block font-sans text-[0.62rem] font-semibold tracking-[0.16em] text-ink/50 uppercase">{link.label}</span>
                <span className="block font-sans text-[0.78rem] font-semibold">{link.display}</span>
              </span>
            </a>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}

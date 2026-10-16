/**
 * Contact links shown in the About Me card's "Let's Connect" section.
 * A link only appears when its `href` is a valid mailto: or https: URL.
 */
export interface ContactLink {
  id: 'email' | 'linkedin' | 'github'
  label: string
  /** What's shown under the label. */
  display: string
  href: string | null
  external: boolean
}

export const CONTACT_LINKS: readonly ContactLink[] = [
  { id: 'email', label: 'Email', display: 'nadiaks2007@gmail.com', href: 'mailto:nadiaks2007@gmail.com', external: false },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    display: 'nadia-shastri',
    href: 'https://www.linkedin.com/in/nadia-shastri/',
    external: true,
  },
  // From this repository's git remote (github.com/nadiashastri/Personal-Portfolio-2).
  { id: 'github', label: 'GitHub', display: 'nadiashastri', href: 'https://github.com/nadiashastri', external: true },
]

/** True for mailto: addresses and https: URLs — anything else isn't rendered as a link. */
export function isUsableContactHref(href: string | null): href is string {
  if (!href) return false
  try {
    const url = new URL(href)
    return url.protocol === 'https:' || (url.protocol === 'mailto:' && url.pathname.includes('@'))
  } catch {
    return false
  }
}

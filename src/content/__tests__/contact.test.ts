import { describe, expect, it } from 'vitest'
import { CONTACT_LINKS, isUsableContactHref } from '../contact'

describe('contact links', () => {
  it('includes email, LinkedIn and GitHub', () => {
    expect(CONTACT_LINKS.map((l) => l.id)).toEqual(['email', 'linkedin', 'github'])
  })

  it('only treats mailto: addresses and https: URLs as usable', () => {
    expect(isUsableContactHref('mailto:nadiaks2007@gmail.com')).toBe(true)
    expect(isUsableContactHref('https://www.linkedin.com/in/nadia-shastri/')).toBe(true)
    for (const bad of [null, '', 'TODO', 'javascript:alert(1)', 'http://insecure.example', 'mailto:']) {
      expect(isUsableContactHref(bad)).toBe(false)
    }
  })
})

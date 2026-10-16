import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const vercel = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
const site = Object.fromEntries(vercel.headers.find((h) => h.source === '/(.*)')!.headers.map((h) => [h.key, h.value]))
const csp = Object.fromEntries(
  site['Content-Security-Policy']
    .split(';')
    .map((d: string) => d.trim().split(/\s+/))
    .filter((parts: string[]) => parts[0])
    .map(([name, ...values]: string[]) => [name, values]),
) as Record<string, string[]>

describe('production security headers (vercel.json)', () => {
  it('sends a strict Content Security Policy', () => {
    expect(csp['default-src']).toEqual(["'self'"])
    // Scripts only from this site; no inline scripts and no JavaScript eval (WebAssembly only, for the model decoder).
    expect(csp['script-src']).toEqual(["'self'", "'wasm-unsafe-eval'"])
    expect(csp['script-src']).not.toContain("'unsafe-inline'")
    expect(csp['script-src']).not.toContain("'unsafe-eval'")
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['base-uri']).toEqual(["'none'"])
    expect(csp['form-action']).toEqual(["'none'"])
    expect(csp['frame-ancestors']).toEqual(["'none'"])
    expect(csp['connect-src']).toEqual(["'self'"])
  })

  it('blocks framing, MIME sniffing and unused browser features, and forces HTTPS', () => {
    expect(site['X-Frame-Options']).toBe('DENY')
    expect(site['X-Content-Type-Options']).toBe('nosniff')
    expect(site['Strict-Transport-Security']).toMatch(/max-age=\d{8,}/)
    expect(site['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(site['Permissions-Policy']).toContain('camera=()')
    expect(site['Permissions-Policy']).toContain('microphone=()')
  })
})

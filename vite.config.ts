import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * The production security headers live in vercel.json. `npm run preview` serves
 * the build with the same site-wide headers, so the Content Security Policy can
 * be checked locally before deploying.
 */
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
const securityHeaders = Object.fromEntries(
  vercel.headers.find((h) => h.source === '/(.*)')!.headers.map(({ key, value }) => [key, value]),
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: { headers: securityHeaders },
})

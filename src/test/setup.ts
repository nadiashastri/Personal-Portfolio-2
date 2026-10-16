import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)

// WebGL isn't available in jsdom: stand the 3D title in with its plain-type fallback.
vi.mock('../ui/TitleLettering', async () => {
  const actual = await vi.importActual<typeof import('../ui/TitleLettering')>('../ui/TitleLettering')
  return { ...actual, TitleLettering: actual.TitleFallback }
})

// The auditorium is a WebGL canvas: stand it in with a marker element.
vi.mock('../scene/auditorium/AuditoriumScene', async () => {
  const { createElement } = await import('react')
  return { AuditoriumScene: () => createElement('div', { 'data-testid': 'auditorium' }) }
})

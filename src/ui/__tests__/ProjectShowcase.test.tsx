import { createRef } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PROJECTS, isValidUrl, type Project } from '../../content/projects'
import { ProjectShowcase } from '../ProjectShowcase'

const renderShowcase = (props: Partial<Parameters<typeof ProjectShowcase>[0]> = {}) => {
  const onExit = vi.fn()
  render(<ProjectShowcase screenRef={createRef()} onExit={onExit} {...props} />)
  return { onExit, user: userEvent.setup() }
}

const currentTitle = () => screen.getByRole('heading', { level: 2 }).textContent

describe('ProjectShowcase', () => {
  it('starts on the first project with its details and a counter', () => {
    renderShowcase()
    expect(currentTitle()).toBe(PROJECTS[0].title)
    expect(screen.getByText(PROJECTS[0].affiliation!)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Technology stack' })).toHaveTextContent('Supabase')
    expect(screen.getAllByText(/01/).length).toBeGreaterThan(0)
  })

  it('moves forward and back with the buttons', async () => {
    const { user } = renderShowcase()
    await user.click(screen.getByRole('button', { name: 'Next project' }))
    await waitFor(() => expect(currentTitle()).toBe(PROJECTS[1].title))
    await user.click(screen.getByRole('button', { name: 'Previous project' }))
    await waitFor(() => expect(currentTitle()).toBe(PROJECTS[0].title))
  })

  it('wraps from the last project to the first, and back again', async () => {
    const { user } = renderShowcase()
    for (let i = 0; i < PROJECTS.length - 1; i++) await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(currentTitle()).toBe(PROJECTS[PROJECTS.length - 1].title))
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(currentTitle()).toBe(PROJECTS[0].title))
    await user.keyboard('{ArrowLeft}')
    await waitFor(() => expect(currentTitle()).toBe(PROJECTS[PROJECTS.length - 1].title))
  })

  it('returns to the Quad with the button or Escape', async () => {
    const { user, onExit } = renderShowcase()
    await user.click(screen.getByRole('button', { name: /return to quad/i }))
    expect(onExit).toHaveBeenLastCalledWith('button')
    await user.keyboard('{Escape}')
    expect(onExit).toHaveBeenLastCalledWith('escape')
  })

  it('shows no link buttons when a project has no URLs', () => {
    renderShowcase()
    expect(PROJECTS.every((p) => !p.links)).toBe(true)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('only renders links for valid http(s) URLs', () => {
    const project: Project = {
      ...PROJECTS[0],
      links: { github: 'https://github.com/example/repo', demo: 'javascript:alert(1)' },
    }
    renderShowcase({ projects: [project] })
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', 'https://github.com/example/repo')
  })
})

describe('isValidUrl', () => {
  it('accepts only absolute http(s) URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://example.com/x')).toBe(true)
    for (const bad of [undefined, '', 'not a url', 'javascript:alert(1)', '/relative', 'ftp://x.org']) {
      expect(isValidUrl(bad)).toBe(false)
    }
  })
})

describe('ProjectShowcase: optional fields', () => {
  it('shows the facial recognition project second, with planned features and no role line', async () => {
    const onExit = vi.fn()
    const user = userEvent.setup()
    render(<ProjectShowcase screenRef={createRef()} onExit={onExit} />)
    await user.click(screen.getByRole('button', { name: 'Next project' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Facial Recognition Attendance System'))
    expect(PROJECTS[1].id).toBe('face-attendance')
    expect(screen.getByText('Planned features')).toBeInTheDocument()
    expect(screen.getByText('CSV-based attendance record management')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Technology stack' })).toHaveTextContent('face_recognition')
    expect(screen.queryByText('Role')).not.toBeInTheDocument()
    expect(screen.queryByText('Program')).not.toBeInTheDocument()
  })
})

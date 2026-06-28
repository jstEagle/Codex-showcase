'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ProjectCard } from './ProjectCard'
import type { Project } from '../projects'

const filters = ['All', 'Research', 'Automation', 'Debugging', 'Mobile']

export function SearchExperience({
  projects,
  initialQuery = '',
}: {
  projects: Array<Project>
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState('All')
  const heroCanvas = useRef<HTMLCanvasElement>(null)
  const asciiCanvas = useRef<HTMLCanvasElement>(null)
  const bandCanvas = useRef<HTMLCanvasElement>(null)

  useAuroraCanvas(heroCanvas)
  useAuroraCanvas(bandCanvas)
  useAsciiCanvas(asciiCanvas)

  const visible = useMemo(
    () => filterProjects(projects, query, filter),
    [projects, query, filter],
  )
  const featured =
    projects.find((project) => project.status === 'Featured') ?? projects[0]

  return (
    <section className="browse-page" aria-label="Project showcase">
      <section className="hero-panel">
        <canvas ref={heroCanvas} className="shader-canvas" />
        <canvas ref={asciiCanvas} className="ascii-canvas" />
        <div className="hero-content">
          <span className="hero-badge">
            &gt;_ A library of things built with AI
          </span>
          <h1>
            Every project is a
            <br />
            conversation you can read.
          </h1>
          <p>
            Browse ambassador projects, read the project post, then replay the
            cleaned Codex history that shows how the thing was actually built.
          </p>
          <label className="hero-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search projects, builders, or what they do..."
            />
          </label>
        </div>
      </section>

      <section className="browse-section" id="projects">
        <div className="section-bar">
          <div>
            <p className="eyebrow">Published work</p>
            <h2>Projects</h2>
          </div>
          <span className="count-label">
            {visible.length} {visible.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        <div className="filter-row" aria-label="Project filters">
          {filters.map((item) => (
            <button
              type="button"
              className={filter === item ? 'filter-pill active' : 'filter-pill'}
              onClick={() => setFilter(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>

        {visible.length > 0 ? (
          <div className="project-grid">
            {visible.map((project, index) => (
              <ProjectCard project={project} index={index} key={project.slug} />
            ))}
          </div>
        ) : (
          <div className="empty-results">
            No matching projects yet. Try a different stack, builder, or
            workflow.
          </div>
        )}
      </section>

      <section className="story-band" id="collections">
        <canvas ref={bandCanvas} className="shader-canvas" />
        <div className="story-band-copy">
          <p className="band-kicker">The Story view</p>
          <h2>
            Read the build, or
            <br />
            replay the chat.
          </h2>
          <p>
            Every project carries its full history. Open any one and switch to
            Story to watch it get built, message by message, without raw tool
            call noise.
          </p>
          {featured && (
            <Link href={`/projects/${featured.slug}`} className="band-link">
              Replay a project <span>→</span>
            </Link>
          )}
        </div>
        <div className="story-terminal" aria-hidden="true">
          <div className="terminal-top">
            <span />
            <span />
            <span />
          </div>
          <div className="terminal-line user">
            <b>User</b>
            <p>{featured?.history[0]?.user}</p>
          </div>
          <div className="terminal-line codex">
            <b>Codex · {featured?.history[0]?.workedFor}</b>
            <p>{featured?.history[0]?.codex}</p>
          </div>
        </div>
      </section>

      <footer className="site-footer" id="about">
        <div>
          <Link href="/" className="site-brand footer-brand">
            <span className="atelier-mark">▚</span>
            <span>Atelier</span>
          </Link>
          <p>
            A showcase where the project is the primitive, and its conversation
            is the documentation.
          </p>
        </div>
        <div className="footer-links" id="builders">
          <Link href="/submit">Submit a project</Link>
          <Link href="/#projects">Browse projects</Link>
          <span>© 2026 Atelier. Built in the open.</span>
        </div>
      </footer>
    </section>
  )
}

function filterProjects(pool: Array<Project>, query: string, filter: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)

  return pool.filter((project) => {
    if (filter !== 'All' && project.category !== filter) {
      return false
    }

    if (!terms.length) {
      return true
    }

    const searchable = [
      project.title,
      project.author,
      project.maker,
      project.description,
      project.category,
      project.status,
      ...project.body,
      ...project.stack,
      ...project.links.flatMap((link) => [link.label, link.url, link.kind]),
      ...project.history.flatMap((turn) => [turn.user, turn.codex]),
    ]
      .join(' ')
      .toLowerCase()

    return terms.every((term) => searchable.includes(term))
  })
}

function useAuroraCanvas(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    let frame = 0
    let raf = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect()
      frame += 0.008
      context.clearRect(0, 0, width, height)

      const base = context.createLinearGradient(0, 0, width, height)
      base.addColorStop(0, '#5965f3')
      base.addColorStop(0.38, '#8da0fa')
      base.addColorStop(0.7, '#cac8f8')
      base.addColorStop(1, '#eef0fb')
      context.fillStyle = base
      context.fillRect(0, 0, width, height)

      for (let i = 0; i < 6; i += 1) {
        const x = width * (0.12 + i * 0.18 + Math.sin(frame + i) * 0.05)
        const y = height * (0.2 + Math.cos(frame * 1.3 + i) * 0.2)
        const radius = Math.max(width, height) * (0.22 + i * 0.025)
        const glow = context.createRadialGradient(x, y, 0, x, y, radius)
        glow.addColorStop(0, `rgba(${70 + i * 18}, ${80 + i * 16}, 245, .28)`)
        glow.addColorStop(1, 'rgba(255,255,255,0)')
        context.fillStyle = glow
        context.fillRect(0, 0, width, height)
      }

      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [ref])
}

function useAsciiCanvas(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const chars = ' .:-=+*>oc#'
    const cell = 14
    let raf = 0
    let tick = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect()
      tick += 0.035
      context.clearRect(0, 0, width, height)
      context.font = '12px "JetBrains Mono", monospace'
      context.textBaseline = 'top'

      for (let y = 0; y < height; y += cell) {
        for (let x = 0; x < width; x += cell) {
          const wave =
            Math.sin(x * 0.018 + tick) + Math.cos(y * 0.02 + tick * 1.2)
          if (wave < 1.42) {
            continue
          }
          const index = Math.min(
            chars.length - 1,
            Math.max(0, Math.floor((wave - 1.42) * 7)),
          )
          context.fillStyle = `rgba(28,32,82,${Math.min(0.5, (wave - 1.2) / 3)})`
          context.fillText(chars[index], x, y)
        }
      }

      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [ref])
}

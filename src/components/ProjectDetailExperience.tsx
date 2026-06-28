'use client'

import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Github,
  ImageIcon,
  Play,
  SquareArrowOutUpRight,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'

import type { Project, ProjectLink } from '../projects'

export function ProjectDetailExperience({
  project,
  related,
}: {
  project: Project
  related: Array<Project>
}) {
  const [view, setView] = useState<'read' | 'story'>('read')
  const demo = project.links.find((link) => link.kind === 'demo')
  const repo = project.links.find((link) => link.kind === 'repo')

  return (
    <section className="project-detail" aria-label={project.title}>
      <header className="detail-nav">
        <Link href="/" className="detail-back">
          <ArrowLeft size={15} />
          All projects
        </Link>
        <span className="detail-nav-title">{project.title}</span>
        <div className="detail-toggle" role="group" aria-label="Project view">
          <button
            type="button"
            className={view === 'read' ? 'active' : ''}
            onClick={() => setView('read')}
          >
            Read
          </button>
          <button
            type="button"
            className={view === 'story' ? 'active' : ''}
            onClick={() => setView('story')}
          >
            Story
          </button>
        </div>
      </header>

      {view === 'read' ? (
        <ReadView
          project={project}
          related={related}
          demo={demo}
          repo={repo}
          onStory={() => setView('story')}
        />
      ) : (
        <StoryView project={project} />
      )}
    </section>
  )
}

function ReadView({
  project,
  related,
  demo,
  repo,
  onStory,
}: {
  project: Project
  related: Array<Project>
  demo?: ProjectLink
  repo?: ProjectLink
  onStory: () => void
}) {
  return (
    <div className="read-layout">
      <article className="project-article">
        <div className="article-kicker">{project.category}</div>
        <h1>{project.title}</h1>
        <p className="article-lead">{project.description}</p>

        <div className="article-meta">
          <span className="author-badge lg">{initials(project.author)}</span>
          <span>
            <b>{project.author}</b>
            <small>
              {project.updated} ago · {project.history.length} turns · GPT-5
            </small>
          </span>
        </div>

        <div className="article-terminal" aria-hidden="true">
          <div className="terminal-top">
            <span />
            <span />
            <span />
          </div>
          <pre>{asciiFor(project)}</pre>
          <p>$ {project.slug.split('-').slice(0, 3).join(' ')} --publish</p>
        </div>

        <div className="article-body">
          {project.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p>
            The useful artifact is not just the shipped project. It is the
            edited conversation behind it: the prompts, the summarized work, the
            design pivots, and the final checks that made the project real.
            Switch to{' '}
            <button type="button" onClick={onStory}>
              Story view
            </button>{' '}
            to read the build as a sequence.
          </p>
        </div>

        <section className="link-section">
          <h2>Artifacts & links</h2>
          <div className="attach-list">
            {project.links.map((link) => {
              const Icon = linkIcon(link.kind)
              return (
                <a
                  className="attach-card"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  key={link.url}
                >
                  <span className="attach-ico">
                    <Icon size={17} />
                  </span>
                  <span>
                    <b>{link.label}</b>
                    <small>{link.url.replace(/^https?:\/\//, '')}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </a>
              )
            })}
          </div>
        </section>
      </article>

      <aside className="article-side">
        <p className="side-title">Project</p>
        <InfoRow label="Maker">{project.maker}</InfoRow>
        <InfoRow label="Category">{project.category}</InfoRow>
        <InfoRow label="Status">{project.status}</InfoRow>
        <InfoRow label="History">{project.history.length} turns</InfoRow>
        <InfoRow label="Stack">{project.stack.join(', ')}</InfoRow>
        <div className="side-actions">
          {demo && (
            <a href={demo.url} target="_blank" rel="noreferrer">
              <SquareArrowOutUpRight size={15} />
              Demo
            </a>
          )}
          {repo && (
            <a href={repo.url} target="_blank" rel="noreferrer">
              <Github size={15} />
              Repo
            </a>
          )}
          <button type="button" onClick={onStory}>
            Open Story view
          </button>
        </div>

        {related.length > 0 && (
          <div className="related-panel">
            <p className="side-title">Related</p>
            {related.map((item) => (
              <Link href={`/projects/${item.slug}`} key={item.slug}>
                <span>{item.category}</span>
                <b>{item.title}</b>
              </Link>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}

function StoryView({ project }: { project: Project }) {
  return (
    <div className="story-page">
      <div className="story-intro">
        <p className="article-kicker">Codex history</p>
        <h1>{project.title}</h1>
        <p>
          A cleaned replay of the user messages and final Codex summaries. Raw
          tool calls are intentionally left out.
        </p>
      </div>

      <div className="story-rail">
        {project.history.map((turn, index) => (
          <article className="story-turn" key={turn.id}>
            <div className="chat-user-bubble">
              <p>{turn.user}</p>
            </div>

            <div className="worked-divider">
              <span>{turn.workedFor.replace(/^worked/, 'Worked')}</span>
              <small>{String(index + 1).padStart(2, '0')}</small>
            </div>

            <div className="story-codex">
              <div className="turn-meta">
                <b>Codex</b>
              </div>
              <p>{turn.codex}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <b>{children}</b>
    </div>
  )
}

function linkIcon(kind: ProjectLink['kind']) {
  switch (kind) {
    case 'repo':
      return Github
    case 'video':
      return Play
    case 'image':
      return ImageIcon
    case 'article':
      return FileText
    default:
      return SquareArrowOutUpRight
  }
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function asciiFor(project: Project) {
  const text = project.stack.join('')
  const bars = Array.from({ length: 6 }, (_, row) => {
    return Array.from({ length: 18 }, (_, col) => {
      const code = text.charCodeAt((row + col) % Math.max(text.length, 1)) || 42
      return ['.', ':', '+', '#', '%'][code % 5]
    }).join('')
  })

  return bars.join('\n')
}

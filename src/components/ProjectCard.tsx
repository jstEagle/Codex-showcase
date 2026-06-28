import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Project } from '../projects'

export function ProjectCard({
  project,
  index = 0,
}: {
  project: Project
  index?: number
}) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="project-card"
      style={{ '--i': index } as CSSProperties}
      data-card
    >
      <div className="card-command">$ {commandFor(project)}</div>
      <div className="card-meta">
        <span>{project.category}</span>
        <span>{project.history.length} turns</span>
      </div>
      <h3 className="card-title" data-scramble>
        {project.title}
      </h3>
      <p className="card-summary">{project.description}</p>
      <div className="card-stack">
        {project.stack.slice(0, 3).map((tech) => (
          <span key={tech}>{tech}</span>
        ))}
      </div>
      <div className="card-foot">
        <span className="author-badge">{initials(project.author)}</span>
        <span>
          <b>{project.author}</b>
          <small>{project.updated} ago</small>
        </span>
        <ArrowUpRight size={16} />
      </div>
    </Link>
  )
}

function commandFor(project: Project) {
  const stem = project.slug.split('-').slice(0, 2).join('-')
  return `${stem} open --story`
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

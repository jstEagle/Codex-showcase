import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Project } from '../projects'

export function BrandMark() {
  return (
    <span className="atelier-mark" aria-hidden="true">
      ▚
    </span>
  )
}

export function Shell({
  children,
  projects,
}: {
  children: ReactNode
  activeSlug?: string
  projects: Array<Project>
}) {
  return (
    <main className="atelier-shell">
      <header className="site-nav">
        <Link href="/" className="site-brand" aria-label="Atelier home">
          <BrandMark />
          <span>Atelier</span>
        </Link>

        <nav className="site-links" aria-label="Primary">
          <Link href="/#projects">Projects</Link>
          <Link href="/#collections">Collections</Link>
          <Link href="/#builders">Builders</Link>
          <Link href="/#about">About</Link>
        </nav>

        <div className="site-actions">
          <span className="project-total">{projects.length} projects</span>
          <Link className="nav-login" href="/">
            Log in
          </Link>
          <Link className="nav-submit" href="/submit">
            Submit a project
          </Link>
        </div>
      </header>

      {children}
    </main>
  )
}

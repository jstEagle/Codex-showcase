import Link from 'next/link'

import { Shell } from '../components/Shell'
import { listProjects } from '../lib/project-data'

export default async function NotFound() {
  const projects = await listProjects()

  return (
    <Shell projects={projects}>
      <section className="codex-main">
        <div className="main-scroll">
          <div className="main-pad">
            <div className="empty-results">
              <h1>Project not found</h1>
              <p>The project is not published in this showcase.</p>
              <Link className="btn btn-primary" href="/">
                Back to projects
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  )
}

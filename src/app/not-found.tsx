import Link from 'next/link'

import { Shell } from '../components/Shell'

export default function NotFound() {
  return (
    <Shell>
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

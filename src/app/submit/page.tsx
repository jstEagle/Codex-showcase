import type { Metadata } from 'next'

import { Shell } from '../../components/Shell'
import { SubmissionForm } from '../../components/SubmissionForm'
import { listProjects } from '../../lib/project-data'

export const metadata: Metadata = {
  title: 'Submit project',
  description: 'Submit a Codex Showcase project artifact for review.',
}

export default async function SubmitPage() {
  const projects = await listProjects()

  return (
    <Shell projects={projects}>
      <section className="codex-main">
        <div className="main-scroll">
          <div className="main-pad submit-pad">
            <SubmissionForm />
          </div>
        </div>
      </section>
    </Shell>
  )
}

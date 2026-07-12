import type { Metadata } from 'next'

import { Shell } from '../../components/Shell'
import { SubmissionForm } from '../../components/SubmissionForm'
import { getAmbassadorIdentity } from '../../lib/ambassador-auth'
import { listProjectsForOwner } from '../../lib/project-data'

export const metadata: Metadata = {
  title: 'Ambassador upload',
  description: 'Upload a Codex Showcase project artifact.',
}

export default async function AmbassadorPage() {
  const isClerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  )
  const ambassador = isClerkConfigured ? await getAmbassadorIdentity() : null
  const projects = ambassador?.identity
    ? await listProjectsForOwner(ambassador.identity.clerkUserId)
    : []

  return (
    <Shell>
      <section className="codex-main">
        <div className="main-scroll">
          <div className="main-pad submit-pad">
            {ambassador && !ambassador.identity ? (
              <div className="submit-panel access-denied">
                <h1>Ambassador access required</h1>
                <p>{ambassador.error}</p>
              </div>
            ) : (
              <SubmissionForm initialProjects={projects} />
            )}
          </div>
        </div>
      </section>
    </Shell>
  )
}

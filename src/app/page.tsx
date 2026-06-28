import { SearchExperience } from '../components/SearchExperience'
import { Shell } from '../components/Shell'
import { listProjects } from '../lib/project-data'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const projects = await listProjects()

  return (
    <Shell projects={projects}>
      <SearchExperience projects={projects} initialQuery={q ?? ''} />
    </Shell>
  )
}

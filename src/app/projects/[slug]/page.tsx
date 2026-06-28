import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ProjectDetailExperience } from '../../../components/ProjectDetailExperience'
import { Shell } from '../../../components/Shell'
import {
  getProject,
  listProjects,
  relatedProjects,
} from '../../../lib/project-data'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = await getProject(slug)

  if (!project) {
    return { title: 'Project not found' }
  }

  return {
    title: project.title,
    description: project.description,
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = await getProject(slug)

  if (!project) {
    notFound()
  }

  const [allProjects, related] = await Promise.all([
    listProjects(),
    relatedProjects(project),
  ])

  return (
    <Shell activeSlug={project.slug} projects={allProjects}>
      <ProjectDetailExperience project={project} related={related} />
    </Shell>
  )
}

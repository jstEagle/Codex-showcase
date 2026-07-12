import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { HomeExperience } from '../../../components/HomeExperience'
import { appConfig } from '../../../config/app'
import { getProject, listProjectsPage } from '../../../lib/project-data'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = await getProject(slug)

  if (!project) {
    return {
      title: 'Project not found',
      robots: { index: false, follow: false },
    }
  }

  const shareImage =
    project.media.find((item) => item.cover)?.url ??
    project.media.find((item) => item.kind === 'image')?.url ??
    project.heroImageUrl ??
    '/og-image.png'
  const canonicalPath = `/projects/${project.slug}`

  return {
    title: project.title,
    description: project.description,
    alternates: { canonical: canonicalPath },
    authors: [{ name: project.maker }],
    category: project.category,
    keywords: [
      project.category,
      ...project.stack,
      'Codex',
      'Codex Ambassador',
      'OpenAI',
    ],
    openGraph: {
      type: 'article',
      locale: 'en_US',
      url: canonicalPath,
      siteName: appConfig.name,
      title: project.title,
      description: project.description,
      authors: [project.maker],
      images: [{ url: shareImage, alt: `${project.title} project cover` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description: project.description,
      images: [shareImage],
    },
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

  const initialPage = await listProjectsPage()
  return <HomeExperience initialPage={initialPage} initialProject={project} />
}

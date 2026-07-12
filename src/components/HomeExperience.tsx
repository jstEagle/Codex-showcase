'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'

import type { ProjectPage } from '../lib/project-data'
import type { Project } from '../projects'
import { IntroSequence } from './IntroSequence'
import { ProjectCanvas } from './ProjectCanvas'

export function HomeExperience({
  initialPage,
  initialProject,
}: {
  initialPage: ProjectPage
  initialProject?: Project
}) {
  const [introDone, setIntroDone] = useState(Boolean(initialProject))
  const query = useInfiniteQuery({
    queryKey: ['projects', 'canvas'],
    initialPageParam: null as string | null,
    initialData: { pages: [initialPage], pageParams: [null] },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (pageParam) {
        params.set('cursor', pageParam)
      }
      const response = await fetch(`/api/projects?${params}`)
      if (!response.ok) {
        throw new Error('Could not load more projects.')
      }
      return (await response.json()) as ProjectPage
    },
    staleTime: 30_000,
  })
  const loadedProjects = query.data.pages.flatMap((page) => page.projects)
  const projects =
    initialProject &&
    !loadedProjects.some((project) => project.slug === initialProject.slug)
      ? [initialProject, ...loadedProjects]
      : loadedProjects

  return (
    <>
      <ProjectCanvas
        projects={projects}
        active={introDone}
        initialProject={initialProject}
        hasMore={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        onNeedMore={() => void query.fetchNextPage()}
      />
      {!introDone ? (
        <IntroSequence onComplete={() => setIntroDone(true)} />
      ) : null}
    </>
  )
}

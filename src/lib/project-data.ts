import { unstable_noStore as noStore } from 'next/cache'

import { appConfig } from '../config/app'
import { projects as sampleProjects } from '../projects'
import type { Project, ProjectLink, ProjectTurn } from '../projects'
import type { Json } from './database.types'
import { getAdminSupabase, getPublicSupabase } from './supabase'
import type { Database } from './database.types'

type CodexHistoryThread = {
  threadId?: string
  title?: string
  turns?: Array<{
    id?: string
    user?: string
    codex?: string
    workedFor?: string
  }>
}

type ProjectRow = Database['public']['Tables']['projects']['Row']

export type ProjectArtifact = {
  schemaVersion?: string
  project?: {
    title?: string
    description?: string
    author?: string
    maker?: string
    category?: string
    stack?: Array<string>
    links?: Array<Partial<ProjectLink>>
    body?: Array<string>
  }
  codexHistory?: Array<CodexHistoryThread>
}

const statusFromDatabase = {
  featured: 'Featured',
  popular: 'Popular',
  new: 'New',
  review: 'New',
} as const

const statusToDatabase = {
  Featured: 'featured',
  Popular: 'popular',
  New: 'new',
} as const

export async function listProjects(query?: string): Promise<Array<Project>> {
  noStore()
  const supabase = getPublicSupabase()

  if (!supabase) {
    return filterProjects(sampleProjects, query)
  }

  const request = supabase
    .from('projects')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })

  const { data, error } = await request

  if (error) {
    if (appConfig.fallbackToSampleData) {
      return filterProjects(sampleProjects, query)
    }

    throw new Error(error.message)
  }

  return filterProjects(data.map(projectFromRow), query)
}

export async function getProject(slug: string): Promise<Project | null> {
  noStore()
  const supabase = getPublicSupabase()

  if (!supabase) {
    return sampleProjects.find((project) => project.slug === slug) ?? null
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (error) {
    if (appConfig.fallbackToSampleData) {
      return sampleProjects.find((project) => project.slug === slug) ?? null
    }

    throw new Error(error.message)
  }

  return data ? projectFromRow(data) : null
}

export async function relatedProjects(
  project: Project,
  count = 3,
): Promise<Array<Project>> {
  const allProjects = await listProjects()

  return allProjects
    .filter((candidate) => candidate.slug !== project.slug)
    .sort((a, b) => {
      const aScore =
        Number(a.category === project.category) +
        a.stack.filter((item) => project.stack.includes(item)).length
      const bScore =
        Number(b.category === project.category) +
        b.stack.filter((item) => project.stack.includes(item)).length

      return bScore - aScore
    })
    .slice(0, count)
}

export async function submitProjectArtifact({
  artifact,
  submitterName,
  submitterContact,
}: {
  artifact: ProjectArtifact
  submitterName?: string | null
  submitterContact?: string | null
}) {
  const supabase = getAdminSupabase()

  if (!supabase) {
    throw new Error(
      'Supabase admin access is not configured. Set SUPABASE_SERVICE_ROLE_KEY and src/config/app.ts before accepting submissions.',
    )
  }

  const { data, error } = await supabase
    .from('project_submissions')
    .insert({
      artifact: artifact as Json,
      submitter_name: submitterName ?? null,
      submitter_contact: submitterContact ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data.id
}

export async function publishProjectArtifact(artifact: ProjectArtifact) {
  const supabase = getAdminSupabase()

  if (!supabase) {
    throw new Error(
      'Supabase admin access is not configured. Set SUPABASE_SERVICE_ROLE_KEY and src/config/app.ts before importing projects.',
    )
  }

  const project = projectFromArtifact(artifact)
  const row = rowFromProject(project, artifact)

  const { error } = await supabase
    .from('projects')
    .upsert(row, { onConflict: 'slug' })

  if (error) {
    throw new Error(error.message)
  }

  return project
}

function rowFromProject(project: Project, artifact: ProjectArtifact) {
  return {
    slug: project.slug,
    title: project.title,
    description: project.description,
    author: project.author,
    maker: project.maker,
    category: project.category,
    status: statusToDatabase[project.status],
    body: project.body,
    stack: project.stack,
    links: project.links as unknown as Json,
    codex_history: project.history as unknown as Json,
    artifact: artifact as unknown as Json,
    published: true,
    published_at: new Date().toISOString(),
  }
}

function projectFromRow(row: ProjectRow): Project {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    author: row.author,
    maker: row.maker,
    category: row.category,
    status: statusFromDatabase[row.status] ?? 'New',
    body: row.body,
    stack: row.stack,
    links: coerceLinks(row.links),
    history: coerceTurns(row.codex_history),
    updated: relativeTime(row.updated_at),
  }
}

function projectFromArtifact(artifact: ProjectArtifact): Project {
  const source = artifact.project ?? {}
  const title = requiredString(source.title, 'project.title')

  return {
    slug: slugify(title),
    title,
    description: requiredString(source.description, 'project.description'),
    author: requiredString(source.author, 'project.author'),
    maker: source.maker || source.author || 'Unknown maker',
    category: source.category || 'Project',
    status: 'New',
    body: source.body?.filter(Boolean) ?? [],
    stack: source.stack?.filter(Boolean) ?? [],
    links: coerceLinks(source.links ?? []),
    history: (artifact.codexHistory ?? []).flatMap((thread, threadIndex) =>
      (thread.turns ?? []).map(
        (turn, turnIndex): ProjectTurn => ({
          id: turn.id ?? `thread-${threadIndex + 1}-turn-${turnIndex + 1}`,
          user: requiredString(turn.user, 'turn.user'),
          codex: requiredString(turn.codex, 'turn.codex'),
          workedFor: turn.workedFor || 'worked for a bit',
        }),
      ),
    ),
    updated: 'now',
  }
}

function filterProjects(pool: Array<Project>, query?: string) {
  const terms = query?.toLowerCase().split(/\s+/).filter(Boolean) ?? []

  if (!terms.length) {
    return pool
  }

  return pool
    .map((project) => {
      const searchable = [
        project.title,
        project.author,
        project.maker,
        project.description,
        project.category,
        project.status,
        ...project.body,
        ...project.stack,
        ...project.links.flatMap((link) => [link.label, link.url, link.kind]),
        ...project.history.flatMap((turn) => [
          turn.user,
          turn.codex,
          turn.workedFor,
        ]),
      ]
        .join(' ')
        .toLowerCase()

      const score = terms.reduce(
        (sum, term) => sum + (searchable.includes(term) ? 1 : 0),
        0,
      )

      return { project, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.project)
}

function coerceLinks(value: Json | Array<Partial<ProjectLink>>) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item): ProjectLink | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null
      }

      const label = typeof item.label === 'string' ? item.label : null
      const url = typeof item.url === 'string' ? item.url : null
      const kind = typeof item.kind === 'string' ? item.kind : 'article'

      if (!label || !url || !isLinkKind(kind)) {
        return null
      }

      return { label, url, kind }
    })
    .filter((link): link is ProjectLink => Boolean(link))
}

function coerceTurns(value: Json) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index): ProjectTurn | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null
      }

      const user = typeof item.user === 'string' ? item.user : null
      const codex = typeof item.codex === 'string' ? item.codex : null

      if (!user || !codex) {
        return null
      }

      return {
        id: typeof item.id === 'string' ? item.id : `turn-${index + 1}`,
        user,
        codex,
        workedFor:
          typeof item.workedFor === 'string'
            ? item.workedFor
            : 'worked for a bit',
      }
    })
    .filter((turn): turn is ProjectTurn => Boolean(turn))
}

function isLinkKind(value: string): value is ProjectLink['kind'] {
  return ['demo', 'repo', 'video', 'image', 'article'].includes(value)
}

function requiredString(value: unknown, path: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required artifact field: ${path}`)
  }

  return value.trim()
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function relativeTime(value: string) {
  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    return 'recently'
  }

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))

  if (seconds < 60) {
    return 'now'
  }

  const minutes = Math.round(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.round(minutes / 60)

  if (hours < 24) {
    return `${hours}h`
  }

  return `${Math.round(hours / 24)}d`
}

import { unstable_noStore as noStore } from 'next/cache'
import { and, desc, eq, lt, or } from 'drizzle-orm'

import { appConfig, type CardAnimation } from '../config/app'
import {
  projectMedia,
  projects as projectsTable,
  type ProjectRow,
} from '../db/schema'
import {
  projectFromArtifact as sampleProjectFromArtifact,
  projects as sampleProjects,
  sampleArtifacts,
  slugify,
  summarizeMetrics,
  type Project,
  type ProjectArtifact,
  type ProjectLink,
  type ProjectMedia,
  type ProjectMetrics,
  type ProjectThread,
  type ProjectTurn,
  type TokenUsage,
} from '../projects'
import { getDatabase } from './db'

export type { ProjectArtifact } from '../projects'

type Json =
  | null
  | boolean
  | number
  | string
  | Array<Json>
  | { [key: string]: Json }

export type ProjectPage = {
  projects: Array<Project>
  nextCursor: string | null
}

const statusFromDatabase = {
  featured: 'Featured',
  popular: 'Popular',
  new: 'New',
} as const

export async function listProjects(
  queryText?: string,
): Promise<Array<Project>> {
  const page = await listProjectsPage({ limit: 100, queryText })
  return page.projects
}

export async function listProjectsPage({
  cursor,
  limit = appConfig.gallery.pageSize,
  queryText,
}: {
  cursor?: string | null
  limit?: number
  queryText?: string
} = {}): Promise<ProjectPage> {
  const safeLimit = Math.max(1, Math.min(limit, 100))
  const decoded = decodeCursor(cursor)
  const db = getDatabase()
  const cursorFilter = decoded
    ? or(
        lt(projectsTable.publishedAt, decoded.publishedAt),
        and(
          eq(projectsTable.publishedAt, decoded.publishedAt),
          lt(projectsTable.id, decoded.id),
        ),
      )
    : undefined
  const rows = await db
    .select({
      id: projectsTable.id,
      slug: projectsTable.slug,
      title: projectsTable.title,
      description: projectsTable.description,
      author: projectsTable.author,
      maker: projectsTable.maker,
      category: projectsTable.category,
      cardAnimation: projectsTable.cardAnimation,
      status: projectsTable.status,
      stack: projectsTable.stack,
      links: projectsTable.links,
      media: projectsTable.media,
      heroImageUrl: projectsTable.heroImageUrl,
      metrics: projectsTable.metrics,
      storyThreadCount: projectsTable.storyThreadCount,
      storyTurnCount: projectsTable.storyTurnCount,
      storyExcerpt: projectsTable.storyExcerpt,
      published: projectsTable.published,
      publishedAt: projectsTable.publishedAt,
      createdAt: projectsTable.createdAt,
      updatedAt: projectsTable.updatedAt,
      ownerClerkId: projectsTable.ownerClerkId,
      ownerName: projectsTable.ownerName,
      ownerEmail: projectsTable.ownerEmail,
    })
    .from(projectsTable)
    .where(and(eq(projectsTable.published, true), cursorFilter))
    .orderBy(desc(projectsTable.publishedAt), desc(projectsTable.id))
    .limit(safeLimit + 1)

  if (rows.length === 0 && !cursor && appConfig.fallbackToSampleData) {
    return {
      projects: filterProjects(sampleProjects, queryText),
      nextCursor: null,
    }
  }

  const hasMore = rows.length > safeLimit
  const pageRows = rows.slice(0, safeLimit)
  const projects = filterProjects(pageRows.map(projectFromRow), queryText)
  const last = pageRows.at(-1)

  return {
    projects,
    nextCursor:
      hasMore && last
        ? encodeCursor({
            publishedAt: last.publishedAt ?? last.createdAt,
            id: last.id,
          })
        : null,
  }
}

export async function getProject(slug: string): Promise<Project | null> {
  const row = await getDatabase().query.projects.findFirst({
    where: and(eq(projectsTable.slug, slug), eq(projectsTable.published, true)),
  })

  if (!row) {
    return appConfig.fallbackToSampleData
      ? (sampleProjects.find((project) => project.slug === slug) ?? null)
      : null
  }

  const project = projectFromRow(row)
  const artifact = row.artifact
    ? normalizeArtifact(row.artifact as ProjectArtifact)
    : null

  if (!artifact) {
    return project
  }

  return {
    ...project,
    body: artifact.post.body,
    history: artifact.threads.flatMap((thread) => thread.turns),
    threads: artifact.threads,
  }
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

export async function publishAmbassadorProject({
  artifact,
  projectMarkdown,
  media,
  privacyConfirmed,
  ownerName,
  ownerEmail,
  clerkUserId,
}: {
  artifact: ProjectArtifact
  projectMarkdown: string
  media: Array<ProjectMedia>
  privacyConfirmed: boolean
  ownerName?: string | null
  ownerEmail: string
  clerkUserId: string
}) {
  if (!privacyConfirmed) {
    throw new Error(
      'Confirm that you reviewed the full redacted history before publishing.',
    )
  }

  if (media.length === 0) {
    throw new Error('Upload at least one image or video for the project.')
  }

  const cover = media.find((item) => item.cover)
  if (!cover) {
    throw new Error('Choose a cover image or video.')
  }

  const normalized = normalizeArtifact({
    ...artifact,
    project: {
      ...artifact.project,
      media,
      heroImageUrl: cover.kind === 'image' ? cover.url : undefined,
    },
    privacyReview: {
      required: true,
      confirmedAt: new Date().toISOString(),
    },
  })
  const project = projectFromArtifact(normalized)
  project.published = true
  project.projectMarkdown = projectMarkdown
  const markdown = projectMarkdown

  if (!markdown.trim()) {
    throw new Error('Missing project.md content.')
  }

  const db = getDatabase()
  const existing = await db.query.projects.findFirst({
    columns: { id: true, ownerClerkId: true },
    where: eq(projectsTable.slug, project.slug),
  })
  if (existing && existing.ownerClerkId !== clerkUserId) {
    throw new Error(
      'That project slug belongs to another ambassador. Choose a different project title.',
    )
  }

  const now = new Date().toISOString()
  const projectId = existing?.id ?? crypto.randomUUID()
  const values: typeof projectsTable.$inferInsert = {
    id: projectId,
    slug: project.slug,
    title: project.title,
    description: project.description,
    author: project.author,
    maker: project.maker,
    category: project.category,
    cardAnimation: project.cardAnimation,
    status: 'new',
    stack: project.stack,
    links: project.links,
    media: project.media,
    heroImageUrl: project.heroImageUrl,
    metrics: project.metrics,
    artifact: normalized,
    projectMarkdown: markdown,
    storyThreadCount: normalized.threads.length,
    storyTurnCount: normalized.threads.reduce(
      (total, thread) => total + thread.turns.length,
      0,
    ),
    storyExcerpt: storyExcerpt(normalized),
    published: true,
    publishedAt: now,
    ownerClerkId: clerkUserId,
    ownerName,
    ownerEmail,
    createdAt: now,
    updatedAt: now,
  }

  await db
    .insert(projectsTable)
    .values(values)
    .onConflictDoUpdate({
      target: projectsTable.slug,
      set: {
        title: values.title,
        description: values.description,
        author: values.author,
        maker: values.maker,
        category: values.category,
        cardAnimation: values.cardAnimation,
        status: 'new',
        stack: values.stack,
        links: values.links,
        media: values.media,
        heroImageUrl: values.heroImageUrl,
        metrics: values.metrics,
        artifact: values.artifact,
        projectMarkdown: values.projectMarkdown,
        storyThreadCount: values.storyThreadCount,
        storyTurnCount: values.storyTurnCount,
        storyExcerpt: values.storyExcerpt,
        published: true,
        publishedAt: now,
        ownerName: values.ownerName,
        ownerEmail: values.ownerEmail,
        updatedAt: now,
      },
      setWhere: eq(projectsTable.ownerClerkId, clerkUserId),
    })

  await db.delete(projectMedia).where(eq(projectMedia.projectId, projectId))
  await db.insert(projectMedia).values(
    media.map((item) => ({
      objectKey: item.objectKey,
      projectId,
    })),
  )

  return {
    id: projectId,
    project,
  }
}

export async function listProjectsForOwner(clerkUserId: string) {
  noStore()
  const rows = await getDatabase().query.projects.findMany({
    where: eq(projectsTable.ownerClerkId, clerkUserId),
    orderBy: desc(projectsTable.updatedAt),
  })
  return rows.map(projectFromRow)
}

export async function setProjectPublished({
  clerkUserId,
  slug,
  published,
}: {
  clerkUserId: string
  slug: string
  published: boolean
}) {
  const existing = await getDatabase().query.projects.findFirst({
    where: and(
      eq(projectsTable.slug, slug),
      eq(projectsTable.ownerClerkId, clerkUserId),
    ),
  })
  if (!existing) {
    throw new Error('Project not found or you do not own it.')
  }

  const rows = await getDatabase()
    .update(projectsTable)
    .set({
      published,
      publishedAt:
        published && !existing.publishedAt
          ? new Date().toISOString()
          : existing.publishedAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projectsTable.id, existing.id))
    .returning()
  const row = rows[0]
  if (!row) {
    throw new Error('Project not found or you do not own it.')
  }

  return projectFromRow(row)
}

export type AmbassadorProjectUpdate = {
  title: string
  description: string
  maker: string
  category: string
  cardAnimation: CardAnimation
  stack: Array<string>
  links: Array<ProjectLink>
  projectMarkdown: string
  media: Array<ProjectMedia>
}

export async function updateAmbassadorProject({
  clerkUserId,
  slug,
  update,
}: {
  clerkUserId: string
  slug: string
  update: AmbassadorProjectUpdate
}) {
  const db = getDatabase()
  const existing = await db.query.projects.findFirst({
    where: and(
      eq(projectsTable.slug, slug),
      eq(projectsTable.ownerClerkId, clerkUserId),
    ),
  })
  if (!existing) {
    throw new Error('Project not found or you do not own it.')
  }
  if (!existing.artifact) {
    throw new Error('This project does not have an editable artifact.')
  }

  const title = requiredEditText(update.title, 'title', 120)
  const description = requiredEditText(update.description, 'description', 1_000)
  const maker = requiredEditText(update.maker, 'maker', 120)
  const category = requiredEditText(update.category, 'category', 80)
  const projectMarkdown = requiredEditText(
    update.projectMarkdown,
    'project write-up',
    200_000,
  )
  if (!Array.isArray(update.stack)) {
    throw new Error('Send the complete project stack.')
  }
  const stack = update.stack
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20)
  if (stack.some((item) => item.length > 60)) {
    throw new Error('Stack labels must be 60 characters or fewer.')
  }
  const links = normalizeEditLinks(update.links)

  const media = coerceMedia(update.media)
  if (media.length !== update.media.length || media.length === 0) {
    throw new Error('Keep at least one valid project image or video.')
  }
  const cover = media.find((item) => item.cover)
  if (!cover || media.filter((item) => item.cover).length !== 1) {
    throw new Error('Choose exactly one cover image or video.')
  }

  const previousArtifact = normalizeArtifact(
    existing.artifact as ProjectArtifact,
  )
  const artifact = normalizeArtifact({
    ...previousArtifact,
    project: {
      ...previousArtifact.project,
      title,
      description,
      maker,
      category,
      cardAnimation: normalizeCardAnimation(update.cardAnimation),
      stack,
      links,
      media,
      heroImageUrl: cover.kind === 'image' ? cover.url : undefined,
    },
    post: {
      ...previousArtifact.post,
      title,
    },
  })
  const previousMedia = coerceMedia(existing.media)
  const retainedKeys = new Set(media.map((item) => item.objectKey))
  const removedObjectKeys = previousMedia
    .filter((item) => !retainedKeys.has(item.objectKey))
    .map((item) => item.objectKey)
  const now = new Date().toISOString()

  const updateStatement = db
    .update(projectsTable)
    .set({
      title,
      description,
      maker,
      category,
      cardAnimation: normalizeCardAnimation(update.cardAnimation),
      stack,
      links,
      media,
      heroImageUrl: cover.kind === 'image' ? cover.url : null,
      artifact,
      projectMarkdown,
      updatedAt: now,
    })
    .where(
      and(
        eq(projectsTable.id, existing.id),
        eq(projectsTable.ownerClerkId, clerkUserId),
      ),
    )
    .returning()
  const deleteMediaStatement = db
    .delete(projectMedia)
    .where(eq(projectMedia.projectId, existing.id))
  const insertMediaStatement = db.insert(projectMedia).values(
    media.map((item) => ({
      objectKey: item.objectKey,
      projectId: existing.id,
    })),
  )
  const [rows] = await db.batch([
    updateStatement,
    deleteMediaStatement,
    insertMediaStatement,
  ])
  const row = rows[0]
  if (!row) {
    throw new Error('Project not found or you do not own it.')
  }
  return { project: projectFromRow(row), removedObjectKeys }
}

export async function isPublishedMediaObject(objectKey: string) {
  const rows = await getDatabase()
    .select({ objectKey: projectMedia.objectKey })
    .from(projectMedia)
    .innerJoin(projectsTable, eq(projectMedia.projectId, projectsTable.id))
    .where(
      and(
        eq(projectMedia.objectKey, objectKey),
        eq(projectsTable.published, true),
      ),
    )
    .limit(1)

  return rows.length > 0
}

export async function isOwnedMediaObject({
  clerkUserId,
  objectKey,
}: {
  clerkUserId: string
  objectKey: string
}) {
  const rows = await getDatabase()
    .select({ objectKey: projectMedia.objectKey })
    .from(projectMedia)
    .innerJoin(projectsTable, eq(projectMedia.projectId, projectsTable.id))
    .where(
      and(
        eq(projectMedia.objectKey, objectKey),
        eq(projectsTable.ownerClerkId, clerkUserId),
      ),
    )
    .limit(1)

  return rows.length > 0
}

type DisplayProjectRow = Omit<ProjectRow, 'artifact' | 'projectMarkdown'> & {
  artifact?: ProjectRow['artifact']
  projectMarkdown?: ProjectRow['projectMarkdown']
}

function projectFromRow(row: DisplayProjectRow): Project {
  const threads = coerceThreads(row.storyExcerpt)
  const history = threads.flatMap((thread) => thread.turns)

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    author: row.author,
    maker: row.maker,
    category: row.category,
    cardAnimation: normalizeCardAnimation(row.cardAnimation),
    status: statusFromDatabase[row.status] ?? 'New',
    body: [],
    projectMarkdown: row.projectMarkdown
      ? publicMarkdown(row.projectMarkdown, row.description)
      : undefined,
    stack: row.stack,
    links: coerceLinks(row.links),
    media: coerceMedia(row.media),
    updated: relativeTime(row.updatedAt),
    createdAt: row.createdAt,
    heroImageUrl: row.heroImageUrl,
    metrics: coerceMetrics(row.metrics, threads),
    published: row.published,
    storyThreadCount: row.storyThreadCount,
    storyTurnCount: row.storyTurnCount,
    artifactPath: null,
    history,
    threads,
  }
}

function projectFromArtifact(artifact: ProjectArtifact): Project {
  const project = sampleProjectFromArtifact(normalizeArtifact(artifact))

  return {
    ...project,
    status: 'New',
  }
}

function normalizeCardAnimation(value: unknown): CardAnimation {
  return (
    appConfig.gallery.cardAnimations.find((option) => option.id === value)
      ?.id ?? appConfig.gallery.defaultCardAnimation
  )
}

function normalizeArtifact(artifact: ProjectArtifact): ProjectArtifact {
  if (artifact.schema !== appConfig.projectArtifactSchema) {
    throw new Error(
      `Unsupported artifact schema: ${artifact.schema ?? 'missing'}`,
    )
  }

  if (!artifact.project?.title?.trim()) {
    throw new Error('Missing required artifact field: project.title')
  }

  if (!artifact.project.description?.trim()) {
    throw new Error('Missing required artifact field: project.description')
  }

  if (!artifact.project.author?.trim()) {
    throw new Error('Missing required artifact field: project.author')
  }

  if (!Array.isArray(artifact.post?.body)) {
    throw new Error('Missing required artifact field: post.body')
  }

  if (!Array.isArray(artifact.threads)) {
    throw new Error('Missing required artifact field: threads')
  }

  if (artifact.threads.length === 0) {
    throw new Error('The artifact does not contain any Codex threads.')
  }

  if (artifact.threads.length > 1_000) {
    throw new Error('The artifact contains too many threads.')
  }

  const threads = artifact.threads.map(normalizeThread)

  return {
    ...artifact,
    project: {
      ...artifact.project,
      title: artifact.project.title.trim(),
      description: artifact.project.description.trim(),
      author: artifact.project.author.trim(),
      maker: artifact.project.maker?.trim() || artifact.project.author.trim(),
      category: artifact.project.category?.trim() || 'Project',
      cardAnimation: normalizeCardAnimation(artifact.project.cardAnimation),
      stack: artifact.project.stack?.filter(Boolean) ?? [],
      links: coerceLinks(artifact.project.links ?? []),
      media: coerceMedia(artifact.project.media ?? []),
    },
    post: {
      title: artifact.post.title?.trim() || artifact.project.title.trim(),
      body: artifact.post.body.map(String).filter(Boolean),
    },
    threads,
    metrics: coerceMetrics(artifact.metrics, threads),
  }
}

function normalizeThread(thread: ProjectThread, index: number): ProjectThread {
  return {
    id: thread.id || `thread-${index + 1}`,
    title: thread.title || `Thread ${index + 1}`,
    startedAt: thread.startedAt,
    sourceCwd: thread.sourceCwd,
    turns: (thread.turns ?? []).map((turn, turnIndex) => {
      const durationMs = optionalPositiveNumber(turn.durationMs)
      return {
        id: turn.id || `turn-${index + 1}-${turnIndex + 1}`,
        user: requiredString(turn.user, 'turn.user'),
        codex: requiredString(turn.codex, 'turn.codex'),
        workedFor:
          turn.workedFor ||
          (durationMs
            ? `worked for ${formatDuration(durationMs)}`
            : 'worked for a bit'),
        requestedAt: optionalIsoDate(turn.requestedAt),
        completedAt: optionalIsoDate(turn.completedAt),
        durationMs,
        tokens: coerceTokenUsage(turn.tokens),
      }
    }),
    metrics: thread.metrics,
  }
}

function storyExcerpt(artifact: ProjectArtifact) {
  return artifact.threads.slice(0, 2).map((thread) => ({
    id: thread.id,
    title: thread.title,
    turns: thread.turns.slice(0, 2),
  }))
}

function filterProjects(pool: Array<Project>, queryText?: string) {
  const terms = queryText?.toLowerCase().split(/\s+/).filter(Boolean) ?? []

  if (!terms.length) {
    return pool
  }

  return pool.filter((project) => {
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

    return terms.every((term) => searchable.includes(term))
  })
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

function normalizeEditLinks(value: unknown): Array<ProjectLink> {
  if (!Array.isArray(value) || value.length > 20) {
    throw new Error('Add at most 20 valid project links.')
  }

  return value.map((item, index) => {
    const link = coerceLinks([item])[0]
    if (!link || link.label.length > 120 || link.url.length > 2_000) {
      throw new Error(`Project link ${index + 1} is invalid.`)
    }
    let parsed: URL
    try {
      parsed = new URL(link.url)
    } catch {
      throw new Error(`Project link ${index + 1} has an invalid URL.`)
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Project link ${index + 1} must use http or https.`)
    }
    return { ...link, url: parsed.toString() }
  })
}

function coerceMedia(value: Json | Array<Partial<ProjectMedia>>) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item): ProjectMedia | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null
      }

      const kind = item.kind === 'video' ? 'video' : 'image'
      const id = typeof item.id === 'string' ? item.id : null
      const name = typeof item.name === 'string' ? item.name : null
      const contentType =
        typeof item.contentType === 'string' ? item.contentType : null
      const objectKey =
        typeof item.objectKey === 'string' ? item.objectKey : null
      const url = typeof item.url === 'string' ? item.url : null
      const size = optionalPositiveNumber(item.size)

      if (!id || !name || !contentType || !objectKey || !url || !size) {
        return null
      }

      return {
        id,
        name,
        contentType,
        objectKey,
        url,
        size,
        kind,
        cover: item.cover === true,
      }
    })
    .filter((item): item is ProjectMedia => Boolean(item))
}

function coerceThreads(value: Json) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index): ProjectThread | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null
      }

      return {
        id: typeof item.id === 'string' ? item.id : `thread-${index + 1}`,
        title:
          typeof item.title === 'string' ? item.title : `Thread ${index + 1}`,
        turns: coerceTurns(item.turns),
      }
    })
    .filter((thread): thread is ProjectThread => Boolean(thread))
}

function coerceTurns(value: unknown) {
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
        requestedAt:
          typeof item.requestedAt === 'string' ? item.requestedAt : undefined,
        completedAt:
          typeof item.completedAt === 'string' ? item.completedAt : undefined,
        durationMs: optionalPositiveNumber(item.durationMs),
        tokens: coerceTokenUsage(item.tokens),
      }
    })
    .filter((turn): turn is ProjectTurn => Boolean(turn))
}

function coerceMetrics(
  value: unknown,
  threads: Array<ProjectThread>,
): ProjectMetrics {
  const fallback = summarizeMetrics(threads)
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback
  }

  const candidate = value as Partial<ProjectMetrics>
  return {
    threadCount: threads.length,
    turnCount: threads.reduce(
      (total, thread) => total + thread.turns.length,
      0,
    ),
    firstPromptAt: optionalIsoDate(candidate.firstPromptAt),
    lastResponseAt: optionalIsoDate(candidate.lastResponseAt),
    wallClockDurationMs:
      optionalPositiveNumber(candidate.wallClockDurationMs) ??
      fallback.wallClockDurationMs,
    activeDurationMs:
      optionalPositiveNumber(candidate.activeDurationMs) ??
      fallback.activeDurationMs,
    tokens: coerceTokenUsage(candidate.tokens) ?? fallback.tokens,
    tokenCountSource:
      candidate.tokenCountSource === 'recorded' ||
      candidate.tokenCountSource === 'partial' ||
      candidate.tokenCountSource === 'unavailable'
        ? candidate.tokenCountSource
        : fallback.tokenCountSource,
  }
}

function coerceTokenUsage(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const item = value as Partial<Record<keyof TokenUsage, unknown>>
  const usage = {
    inputTokens: nonNegativeNumber(item.inputTokens),
    cachedInputTokens: nonNegativeNumber(item.cachedInputTokens),
    outputTokens: nonNegativeNumber(item.outputTokens),
    reasoningOutputTokens: nonNegativeNumber(item.reasoningOutputTokens),
    totalTokens: nonNegativeNumber(item.totalTokens),
  }

  return Object.values(usage).every((entry) => entry !== undefined)
    ? (usage as NonNullable<ProjectMetrics['tokens']>)
    : undefined
}

function optionalPositiveNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

function requiredEditText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Enter a project ${label}.`)
  }
  const normalized = value.trim()
  if (normalized.length > maxLength) {
    throw new Error(
      `Project ${label} must be ${maxLength.toLocaleString()} characters or fewer.`,
    )
  }
  return normalized
}

function nonNegativeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}

function optionalIsoDate(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? value
    : undefined
}

function formatDuration(durationMs: number) {
  const seconds = Math.max(1, Math.round(durationMs / 1_000))
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`
  }
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }
  const hours = Math.round((minutes / 60) * 10) / 10
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

function encodeCursor(value: { publishedAt: string; id: string }) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function decodeCursor(value?: string | null) {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (
      typeof parsed.publishedAt !== 'string' ||
      !Number.isFinite(Date.parse(parsed.publishedAt)) ||
      typeof parsed.id !== 'string'
    ) {
      return null
    }
    return parsed as { publishedAt: string; id: string }
  } catch {
    return null
  }
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

function publicMarkdown(value: string | null, description: string) {
  if (!value?.trim()) {
    return undefined
  }

  let markdown = value
    .replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
    .replace(/^#\s+[^\n]+\n+/, '')
    .trim()

  if (markdown.startsWith(description)) {
    markdown = markdown.slice(description.length).trim()
  }

  return markdown || undefined
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

export function sampleProjectArtifact(slug: string) {
  return sampleArtifacts.find(
    (artifact) => slugify(artifact.project.title) === slug,
  )
}

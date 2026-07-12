import type { CardAnimation } from './config/app'

export type ProjectLink = {
  label: string
  url: string
  kind: 'demo' | 'repo' | 'video' | 'image' | 'article'
}

export type ProjectMedia = {
  id: string
  name: string
  kind: 'image' | 'video'
  contentType: string
  size: number
  objectKey: string
  url: string
  cover?: boolean
}

export type TokenUsage = {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningOutputTokens: number
  totalTokens: number
}

export type ProjectMetrics = {
  threadCount: number
  turnCount: number
  firstPromptAt?: string
  lastResponseAt?: string
  wallClockDurationMs?: number
  activeDurationMs?: number
  tokens?: TokenUsage
  tokenCountSource: 'recorded' | 'partial' | 'unavailable'
}

export type ProjectTurn = {
  id: string
  user: string
  codex: string
  workedFor: string
  requestedAt?: string
  completedAt?: string
  durationMs?: number
  tokens?: TokenUsage
}

export type ProjectThread = {
  id: string
  title: string
  startedAt?: string
  sourceCwd?: string
  turns: Array<ProjectTurn>
  metrics?: ProjectMetrics
}

export type ProjectArtifact = {
  schema: 'codex-showcase-project'
  exportedAt?: string
  source?: {
    projectDir?: string
    threadCount?: number
  }
  metrics?: ProjectMetrics
  redaction?: {
    totalMatches: number
    rules: Array<{ name: string; matches: number }>
    warnings: Array<string>
  }
  privacyReview?: {
    required: boolean
    confirmedAt?: string
  }
  project: {
    title: string
    description: string
    author: string
    maker?: string
    category?: string
    cardAnimation?: CardAnimation
    stack?: Array<string>
    links?: Array<ProjectLink>
    media?: Array<ProjectMedia>
    heroImageUrl?: string
    createdAt?: string
  }
  post: {
    title?: string
    body: Array<string>
  }
  threads: Array<ProjectThread>
}

export type Project = {
  id?: string
  slug: string
  title: string
  author: string
  maker: string
  description: string
  body: Array<string>
  projectMarkdown?: string
  category: string
  cardAnimation: CardAnimation
  stack: Array<string>
  links: Array<ProjectLink>
  media: Array<ProjectMedia>
  status: 'Featured' | 'Popular' | 'New'
  updated: string
  createdAt: string
  heroImageUrl: string | null
  metrics: ProjectMetrics
  published: boolean
  storyThreadCount: number
  storyTurnCount: number
  artifactPath?: string | null
  history: Array<ProjectTurn>
  threads?: Array<ProjectThread>
}

const now = new Date('2026-06-28T00:00:00.000Z').toISOString()

export const sampleArtifacts: Array<ProjectArtifact> = [
  {
    schema: 'codex-showcase-project',
    exportedAt: now,
    project: {
      title: 'Realtime Volatility Research Lab',
      description:
        'A research console that turns market data, Codex-generated Rust experiments, and report snapshots into a repeatable backtesting workflow.',
      author: 'Mira Chen',
      maker: 'Mira Chen',
      category: 'Research',
      cardAnimation: 'liquid',
      stack: ['Rust', 'Next.js', 'Hyperliquid'],
      links: [
        {
          label: 'Live demo',
          url: 'https://demo.codex.show/volatility-lab',
          kind: 'demo',
        },
        {
          label: 'Repository',
          url: 'https://github.com/mirachen/volatility-lab',
          kind: 'repo',
        },
      ],
      createdAt: now,
    },
    post: {
      body: [
        'The project started as a messy folder of market notes, simulation snippets, and screenshots from failed backtests.',
        'Codex helped turn that pile into a repeatable lab: a Rust engine, a Next.js interface, a report surface, and a review loop for comparing strategy changes.',
      ],
    },
    threads: [
      {
        id: 'thread-research-lab',
        title: 'Turn research notes into a repeatable lab',
        startedAt: now,
        turns: [
          {
            id: 'turn-1',
            user: 'Turn my backtesting notes into a real research app with a dashboard and repeatable runs.',
            codex:
              'Created the app shell, wired the strategy runner, added a route for run comparison, and documented the expected research loop.',
            workedFor: 'worked for 18 minutes',
          },
          {
            id: 'turn-2',
            user: 'The report page is too hard to compare. Make the winning and losing runs obvious.',
            codex:
              'Reworked the visual report with run cards, deltas, drawdown badges, and a compact table for fast comparison.',
            workedFor: 'worked for 11 minutes',
          },
        ],
      },
    ],
  },
  {
    schema: 'codex-showcase-project',
    exportedAt: now,
    project: {
      title: 'Recipe Import Recovery',
      description:
        'A production debugging story where Codex traced failed recipe saves through deployment logs, route handlers, and database writes.',
      author: 'Nadia Vale',
      maker: 'Nadia Vale',
      category: 'Debugging',
      cardAnimation: 'terrain',
      stack: ['Next.js', 'Clerk', 'Cloudflare'],
      links: [
        {
          label: 'Live app',
          url: 'https://orangecard.justus.sh',
          kind: 'demo',
        },
        {
          label: 'Repository',
          url: 'https://github.com/nadiavale/orange-card',
          kind: 'repo',
        },
      ],
      createdAt: new Date('2026-06-27T00:00:00.000Z').toISOString(),
    },
    post: {
      body: [
        'This project is useful because the build history is the product proof: a visible runtime failure became a traced fix rather than a guess.',
        'The showcase artifact preserves the prompt, the final Codex summaries, and the polished write-up without publishing raw tool-call logs.',
      ],
    },
    threads: [
      {
        id: 'thread-debugging',
        title: 'Trace a production import failure',
        startedAt: new Date('2026-06-27T00:00:00.000Z').toISOString(),
        turns: [
          {
            id: 'turn-1',
            user: 'Recipe imports are hallucinating and sometimes failing to save. Trace the real path and fix it.',
            codex:
              'Checked live logs, found the save failure path, tightened source-faithful extraction, and added duplicate-safe imported slugs.',
            workedFor: 'worked for 31 minutes',
          },
          {
            id: 'turn-2',
            user: 'Commit and push this cleanly without including unrelated package-manager files.',
            codex:
              'Verified the build, kept unrelated files out of the commit, configured GitHub auth, pushed to main, and confirmed the branch matched origin.',
            workedFor: 'worked for 9 minutes',
          },
        ],
      },
    ],
  },
]

export const projects: Array<Project> = sampleArtifacts.map((artifact, index) =>
  projectFromArtifact(artifact, index === 0 ? 'Featured' : 'New'),
)

export const projectArtifactExample = sampleArtifacts[0]

export function projectFromArtifact(
  artifact: ProjectArtifact,
  status: Project['status'] = 'New',
): Project {
  const turns = artifact.threads.flatMap((thread) => thread.turns)
  const createdAt =
    artifact.project.createdAt ??
    artifact.exportedAt ??
    new Date().toISOString()

  return {
    slug: slugify(artifact.project.title),
    title: artifact.project.title,
    description: artifact.project.description,
    author: artifact.project.author,
    maker: artifact.project.maker || artifact.project.author,
    category: artifact.project.category || 'Project',
    cardAnimation: artifact.project.cardAnimation ?? 'liquid',
    status,
    body: artifact.post.body,
    stack: artifact.project.stack ?? [],
    links: artifact.project.links ?? [],
    media: artifact.project.media ?? [],
    updated: relativeTime(createdAt),
    createdAt,
    heroImageUrl: artifact.project.heroImageUrl ?? null,
    metrics: artifact.metrics ?? summarizeMetrics(artifact.threads),
    published: true,
    storyThreadCount: artifact.threads.length,
    storyTurnCount: turns.length,
    history: turns,
    threads: artifact.threads,
  }
}

export function summarizeMetrics(
  threads: Array<ProjectThread>,
): ProjectMetrics {
  const turns = threads.flatMap((thread) => thread.turns)
  const requestedAt = turns
    .map((turn) => turn.requestedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
  const completedAt = turns
    .map((turn) => turn.completedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
  const tokens = turns.reduce<TokenUsage | undefined>((total, turn) => {
    if (!turn.tokens) {
      return total
    }

    const current = total ?? emptyTokenUsage()
    return addTokenUsage(current, turn.tokens)
  }, undefined)
  const activeDurationMs = turns.reduce(
    (total, turn) =>
      total + (turn.durationMs ?? durationFromLabel(turn.workedFor)),
    0,
  )
  const firstPromptAt = requestedAt[0]
  const lastResponseAt = completedAt.at(-1)

  return {
    threadCount: threads.length,
    turnCount: turns.length,
    firstPromptAt,
    lastResponseAt,
    wallClockDurationMs:
      firstPromptAt && lastResponseAt
        ? Math.max(0, Date.parse(lastResponseAt) - Date.parse(firstPromptAt))
        : undefined,
    activeDurationMs: activeDurationMs || undefined,
    tokens,
    tokenCountSource: tokens ? 'partial' : 'unavailable',
  }
}

function emptyTokenUsage(): TokenUsage {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  }
}

function addTokenUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    reasoningOutputTokens: a.reasoningOutputTokens + b.reasoningOutputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  }
}

function durationFromLabel(value: string) {
  const match = value.match(/([\d.]+)\s+(second|minute|hour)/i)
  if (!match) {
    return 0
  }

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  return (
    amount *
    (unit.startsWith('hour')
      ? 3_600_000
      : unit.startsWith('minute')
        ? 60_000
        : 1_000)
  )
}

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug)
}

export function relatedProjects(slug: string, count = 2): Array<Project> {
  const current = getProject(slug)
  const rest = projects.filter((project) => project.slug !== slug)

  if (!current) {
    return rest.slice(0, count)
  }

  const sameCategory = rest.filter(
    (project) => project.category === current.category,
  )
  const others = rest.filter((project) => project.category !== current.category)

  return [...sameCategory, ...others].slice(0, count)
}

export function searchProjects(
  query: string,
  pool: Array<Project> = projects,
): Array<Project> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)

  if (!terms.length) {
    return pool
  }

  return pool.filter((project) => {
    const haystack = [
      project.title,
      project.author,
      project.description,
      project.category,
      project.status,
      ...project.stack,
      ...project.links.map((link) => link.url),
      ...project.history.flatMap((turn) => [turn.user, turn.codex]),
    ]
      .join(' ')
      .toLowerCase()

    return terms.every((term) => haystack.includes(term))
  })
}

export function slugify(value: string) {
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

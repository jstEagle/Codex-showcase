import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const configPath = path.join(root, 'codex-showcase.config.json')

export async function runCli(argv) {
  const args = parseArgs(argv)
  const command = args._[0] ?? 'export'

  if (command === 'help' || args.help) {
    printHelp()
    return
  }
  if (command !== 'export') {
    throw new Error(`Unknown command: ${command}`)
  }

  const result = await exportProject({ args })
  console.log(`Wrote ${path.join(result.outputDir, 'project.json')}`)
  console.log(`Wrote ${path.join(result.outputDir, 'project.md')}`)
  console.log(
    `Included ${result.artifact.threads.length} Codex thread${result.artifact.threads.length === 1 ? '' : 's'} and ${result.artifact.metrics.turnCount} prompt${result.artifact.metrics.turnCount === 1 ? '' : 's'}`,
  )
  console.log(
    result.artifact.metrics.tokens
      ? `Recorded ${result.artifact.metrics.tokens.totalTokens.toLocaleString()} tokens`
      : 'Token usage was unavailable in the matched session files',
  )
  console.log(
    `Applied ${result.artifact.redaction.totalMatches} redaction${result.artifact.redaction.totalMatches === 1 ? '' : 's'}. Review both files before uploading.`,
  )
}

export async function exportProject({ args, config: suppliedConfig }) {
  const config = suppliedConfig ?? (await readJson(configPath))
  const projectDir = path.resolve(String(args.projectDir ?? process.cwd()))
  const codexHome = path.resolve(
    expandHome(String(args.codexHome ?? path.join(homedir(), '.codex'))),
  )
  const outputDir = path.resolve(
    String(args.output ?? path.join(projectDir, config.defaultOutputDir)),
  )
  const packageJson = await readOptionalJson(
    path.join(projectDir, 'package.json'),
  )
  const cardAnimation = String(
    args.cardAnimation ?? config.defaultCardAnimation ?? 'liquid',
  )
  if (!config.cardAnimations?.includes(cardAnimation)) {
    throw new Error(
      `Unknown card animation: ${cardAnimation}. Choose one of: ${config.cardAnimations.join(', ')}`,
    )
  }
  const project = {
    title: String(args.title ?? packageJson?.name ?? path.basename(projectDir)),
    description: String(args.description ?? ''),
    author: String(args.author ?? ''),
    maker: String(args.maker ?? args.author ?? ''),
    category: String(args.category ?? 'Project'),
    cardAnimation,
    stack: parseList(args.stack),
    links: parseLinks(args.link),
    createdAt: new Date().toISOString(),
  }

  const sessionFiles = await findSessionFiles(
    codexHome,
    args.archived !== false,
  )
  const parsedThreads = []
  for (const file of sessionFiles) {
    const thread = await parseSessionFile(file, projectDir)
    if (thread) {
      parsedThreads.push(thread)
    }
  }

  const threads = deduplicateThreads(parsedThreads).sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  )
  if (threads.length === 0) {
    throw new Error(
      `No Codex threads were associated with ${projectDir}. Point --project-dir at the project directory recorded by Codex.`,
    )
  }

  const redactor = createRedactor(config.redactionPatterns)
  const cleanThreads = threads.map((thread) => redactThread(thread, redactor))
  const cleanProject = redactProject(project, redactor)
  const post = {
    title: redactor.scrub(String(args.postTitle ?? cleanProject.title)),
    body: parseBody(args.body, cleanProject).map(redactor.scrub),
  }
  const cleanProjectDir = redactor.scrub(projectDir)
  const metrics = summarizeThreads(cleanThreads)
  const redaction = redactor.report()
  redaction.warnings = scanForPrivacyWarnings({
    project: cleanProject,
    post,
    threads: cleanThreads,
  })

  const artifact = {
    schema: config.artifactSchema,
    exportedAt: new Date().toISOString(),
    source: {
      projectDir: cleanProjectDir,
      threadCount: cleanThreads.length,
    },
    project: cleanProject,
    post,
    metrics,
    redaction,
    privacyReview: { required: true },
    threads: cleanThreads,
  }

  await mkdir(outputDir, { recursive: true })
  await writeFile(
    path.join(outputDir, 'project.json'),
    `${JSON.stringify(artifact, null, 2)}\n`,
  )
  await writeFile(path.join(outputDir, 'project.md'), renderMarkdown(artifact))
  return { artifact, outputDir }
}

export async function parseSessionFile(file, projectDir) {
  const lines = (await readFile(file, 'utf8')).split('\n').filter(Boolean)
  let metadata = null
  const workspaceRoots = new Set()
  const turns = []
  let current = null
  let previousUsage = emptyUsage()

  for (const line of lines) {
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    if (entry.type === 'session_meta') {
      metadata = { ...(metadata ?? {}), ...entry.payload }
      continue
    }
    if (entry.type === 'turn_context') {
      for (const rootValue of normalizeWorkspaceRoots(
        entry.payload?.workspace_roots,
      )) {
        workspaceRoots.add(rootValue)
      }
      continue
    }
    if (entry.type === 'event_msg' && entry.payload?.type === 'task_started') {
      current = {
        id: entry.payload.turn_id ?? `turn-${turns.length + 1}`,
        user: '',
        codex: '',
        requestedAt:
          timestampFromSeconds(entry.payload.started_at) ?? entry.timestamp,
        completedAt: '',
        durationMs: undefined,
        usageBefore: previousUsage,
        latestUsage: previousUsage,
      }
      continue
    }
    if (entry.type === 'event_msg' && entry.payload?.type === 'user_message') {
      if (current && typeof entry.payload.message === 'string') {
        current.user = entry.payload.message.trim()
      }
      continue
    }
    if (entry.type === 'event_msg' && entry.payload?.type === 'token_count') {
      const usage = normalizeUsage(entry.payload.info?.total_token_usage)
      if (usage) {
        previousUsage = usage
        if (current) {
          current.latestUsage = usage
        }
      }
      continue
    }
    if (entry.type === 'event_msg' && entry.payload?.type === 'task_complete') {
      if (current) {
        current.codex = String(entry.payload.last_agent_message ?? '').trim()
        current.completedAt =
          timestampFromSeconds(entry.payload.completed_at) ?? entry.timestamp
        current.durationMs = positiveNumber(entry.payload.duration_ms)
        pushTurn(turns, current)
        current = null
      }
      continue
    }

    if (entry.type === 'response_item' && entry.payload?.type === 'message') {
      const content = messageText(entry.payload.content)
      if (!content || isInternalContextMessage(content)) {
        continue
      }
      if (entry.payload.role === 'user' && current && !current.user) {
        current.user = content
      }
      if (
        entry.payload.role === 'assistant' &&
        entry.payload.phase === 'final_answer' &&
        current &&
        !current.codex
      ) {
        current.codex = content
        current.completedAt = entry.timestamp
      }
    }
  }

  if (current?.user && current?.codex) {
    pushTurn(turns, current)
  }
  if (!metadata || turns.length === 0) {
    return null
  }

  const candidateRoots = [metadata.cwd, ...workspaceRoots]
    .filter((value) => typeof value === 'string' && value)
    .map((value) => path.resolve(value))
  if (
    !candidateRoots.some((candidate) => isSameOrChild(candidate, projectDir))
  ) {
    return null
  }

  const startedAt =
    turns[0]?.requestedAt ?? metadata.timestamp ?? new Date(0).toISOString()
  const normalizedTurns = turns.map((turn) => ({
    id: turn.id,
    user: turn.user,
    codex: turn.codex,
    workedFor: `worked for ${formatDuration(turn.durationMs)}`,
    requestedAt: turn.requestedAt,
    completedAt: turn.completedAt,
    durationMs: turn.durationMs,
    tokens: turn.tokens,
  }))

  return {
    id: metadata.id ?? metadata.session_id ?? path.basename(file, '.jsonl'),
    title: deriveThreadTitle(normalizedTurns),
    startedAt,
    sourceCwd: metadata.cwd ?? candidateRoots[0],
    turns: normalizedTurns,
    metrics: summarizeThreads([{ turns: normalizedTurns }]),
  }
}

function pushTurn(turns, current) {
  if (!current.user || !current.codex) {
    return
  }
  const durationMs =
    current.durationMs ??
    durationBetween(current.requestedAt, current.completedAt)
  const tokens = subtractUsage(current.latestUsage, current.usageBefore)
  turns.push({
    ...current,
    durationMs,
    tokens: tokens.totalTokens > 0 ? tokens : undefined,
  })
}

export function summarizeThreads(threads) {
  const turns = threads.flatMap((thread) => thread.turns)
  const firstPromptAt = turns
    .map((turn) => turn.requestedAt)
    .filter(Boolean)
    .sort()[0]
  const lastResponseAt = turns
    .map((turn) => turn.completedAt)
    .filter(Boolean)
    .sort()
    .at(-1)
  const turnsWithTokens = turns.filter((turn) => turn.tokens)
  const tokens = turnsWithTokens.reduce(
    (total, turn) => addUsage(total, turn.tokens),
    emptyUsage(),
  )
  return {
    threadCount: threads.length,
    turnCount: turns.length,
    firstPromptAt,
    lastResponseAt,
    wallClockDurationMs:
      firstPromptAt && lastResponseAt
        ? Math.max(0, Date.parse(lastResponseAt) - Date.parse(firstPromptAt))
        : undefined,
    activeDurationMs: turns.reduce(
      (total, turn) => total + (turn.durationMs ?? 0),
      0,
    ),
    tokens: turnsWithTokens.length ? tokens : undefined,
    tokenCountSource:
      turnsWithTokens.length === turns.length
        ? 'recorded'
        : turnsWithTokens.length
          ? 'partial'
          : 'unavailable',
  }
}

export function createRedactor(patterns) {
  const counts = new Map(patterns.map((pattern) => [pattern.name, 0]))
  const scrub = (value) =>
    patterns.reduce((text, pattern) => {
      const regex = new RegExp(pattern.pattern, pattern.flags)
      return text.replace(regex, () => {
        counts.set(pattern.name, (counts.get(pattern.name) ?? 0) + 1)
        return pattern.replacement
      })
    }, String(value))

  return {
    scrub,
    report() {
      const rules = patterns.map((pattern) => ({
        name: pattern.name,
        matches: counts.get(pattern.name) ?? 0,
      }))
      return {
        totalMatches: rules.reduce((total, rule) => total + rule.matches, 0),
        rules,
        warnings: [],
      }
    },
  }
}

function redactProject(project, redactor) {
  return {
    ...project,
    title: redactor.scrub(project.title),
    description: redactor.scrub(project.description),
    author: redactor.scrub(project.author),
    maker: redactor.scrub(project.maker),
    category: redactor.scrub(project.category),
    stack: project.stack.map(redactor.scrub),
    links: project.links.map((link) => ({
      ...link,
      label: redactor.scrub(link.label),
      url: redactor.scrub(link.url),
    })),
  }
}

function redactThread(thread, redactor) {
  return {
    ...thread,
    title: redactor.scrub(thread.title),
    sourceCwd: redactor.scrub(thread.sourceCwd ?? ''),
    turns: thread.turns.map((turn) => ({
      ...turn,
      user: redactor.scrub(turn.user),
      codex: redactor.scrub(turn.codex),
    })),
  }
}

function scanForPrivacyWarnings(value) {
  const serialized = JSON.stringify(value)
  const warnings = []
  if (/\b(?:password|secret|private key)\b\s*[:=]/i.test(serialized)) {
    warnings.push(
      'Possible secret-like language remains. Inspect every match before publishing.',
    )
  }
  warnings.push(
    'Regex cannot identify contextual private information such as client names, unreleased products, or proprietary text. Human review is required.',
  )
  return warnings
}

function deduplicateThreads(threads) {
  const byId = new Map()
  for (const thread of threads) {
    const existing = byId.get(thread.id)
    if (!existing || existing.turns.length < thread.turns.length) {
      byId.set(thread.id, thread)
    }
  }
  return [...byId.values()]
}

async function findSessionFiles(codexHome, includeArchived) {
  const roots = [path.join(codexHome, 'sessions')]
  if (includeArchived) {
    roots.push(path.join(codexHome, 'archived_sessions'))
  }
  const files = []
  for (const sessionRoot of roots) {
    if (existsSync(sessionRoot)) {
      files.push(...(await walkJsonl(sessionRoot)))
    }
  }
  return files
}

async function walkJsonl(directory) {
  const entries = await readdir(directory)
  const files = []
  for (const entry of entries) {
    const entryPath = path.join(directory, entry)
    const entryStat = await stat(entryPath)
    if (entryStat.isDirectory()) {
      files.push(...(await walkJsonl(entryPath)))
    } else if (entry.endsWith('.jsonl')) {
      files.push(entryPath)
    }
  }
  return files
}

function renderMarkdown(artifact) {
  const links = artifact.project.links.length
    ? [
        '## Links',
        '',
        ...artifact.project.links.map(
          (link) => `- [${link.label}](${link.url})`,
        ),
        '',
      ]
    : []
  return [
    '---',
    `title: ${JSON.stringify(artifact.project.title)}`,
    `description: ${JSON.stringify(artifact.project.description)}`,
    `author: ${JSON.stringify(artifact.project.author)}`,
    `schema: ${JSON.stringify(artifact.schema)}`,
    '---',
    '',
    `# ${artifact.project.title}`,
    '',
    artifact.project.description,
    '',
    ...artifact.post.body.flatMap((paragraph) => [paragraph, '']),
    ...links,
  ].join('\n')
}

function parseArgs(argv) {
  const args = { _: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) {
      args._.push(arg)
      continue
    }
    const [rawKey, inlineValue] = arg.slice(2).split('=')
    const normalizedKey = rawKey.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    )
    const negated = normalizedKey.startsWith('no')
    const key = negated
      ? normalizedKey.slice(2, 3).toLowerCase() + normalizedKey.slice(3)
      : normalizedKey
    const next = argv[index + 1]
    const value =
      inlineValue ?? (!next || next.startsWith('--') ? !negated : next)
    assignArg(args, key, negated ? false : value)
    if (inlineValue === undefined && next && !next.startsWith('--')) {
      index += 1
    }
  }
  return args
}

function assignArg(args, key, value) {
  if (['body', 'link'].includes(key) && args[key]) {
    args[key] = Array.isArray(args[key])
      ? [...args[key], value]
      : [args[key], value]
  } else {
    args[key] = value
  }
}

function printHelp() {
  console.log(`codex-showcase export

Usage:
  codex-showcase export [options]

Options:
  --project-dir <path>   Project directory recorded by Codex
  --codex-home <path>    Codex home directory, defaults to ~/.codex
  --output <path>        Output directory
  --title <text>         Public project title
  --description <text>   Short public description
  --author <text>        Ambassador name
  --maker <text>         Person or team who built the project
  --category <text>      Project category
  --card-animation <id>  Card art: liquid, flow, terrain, orbit, or rain
  --stack <a,b,c>        Comma-separated stack tags
  --post-title <text>    Write-up title
  --body <text>          Repeatable write-up paragraph
  --link <label=url>     Repeatable project link
  --no-archived          Skip archived Codex sessions
`)
}

function parseLinks(rawLinks) {
  const links = Array.isArray(rawLinks) ? rawLinks : rawLinks ? [rawLinks] : []
  return links.map((rawLink) => {
    const [label, ...urlParts] = String(rawLink).split('=')
    const url = urlParts.join('=') || label
    return { label: label || url, url, kind: kindForLink({ label, url }) }
  })
}

function kindForLink(link) {
  const value = `${link.label} ${link.url}`.toLowerCase()
  if (value.includes('github.com') || value.includes('repo')) return 'repo'
  if (/video|youtube|vimeo/.test(value)) return 'video'
  if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/.test(value)) return 'image'
  if (/demo|app/.test(value)) return 'demo'
  return 'article'
}

function parseList(value) {
  return value
    ? String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

function parseBody(rawBody, project) {
  const body = Array.isArray(rawBody) ? rawBody : rawBody ? [rawBody] : []
  return body.length
    ? body
    : [
        project.description ||
          'This project was built with Codex and exported for ambassador review.',
      ]
}

function normalizeWorkspaceRoots(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item : item?.path))
    .filter((item) => typeof item === 'string')
}

function messageText(content) {
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => part?.text ?? part?.input_text ?? part?.output_text ?? '')
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

function isInternalContextMessage(text) {
  return (
    text.startsWith('<environment_context>') ||
    text.startsWith('<app-context>') ||
    text.startsWith('<permissions instructions>') ||
    text.startsWith('# AGENTS.md instructions')
  )
}

function isSameOrChild(candidate, parent) {
  const comparableCandidate = comparablePath(candidate)
  const comparableParent = comparablePath(parent)
  const relative = path.relative(comparableParent, comparableCandidate)
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
}

function comparablePath(value) {
  const resolved = path.resolve(value)
  return process.platform === 'darwin' ? resolved.toLowerCase() : resolved
}

function deriveThreadTitle(turns) {
  const first = turns[0]?.user ?? 'Codex thread'
  const sentence = first.split(/[.!?\n]/)[0]?.trim() || first
  return sentence.length > 80 ? `${sentence.slice(0, 77).trim()}...` : sentence
}

function normalizeUsage(value) {
  if (!value || typeof value !== 'object') return null
  const usage = {
    inputTokens: numberOrZero(value.input_tokens),
    cachedInputTokens: numberOrZero(value.cached_input_tokens),
    outputTokens: numberOrZero(value.output_tokens),
    reasoningOutputTokens: numberOrZero(value.reasoning_output_tokens),
    totalTokens: numberOrZero(value.total_tokens),
  }
  return usage.totalTokens > 0 ? usage : null
}

function emptyUsage() {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  }
}

function addUsage(a, b) {
  return Object.fromEntries(
    Object.keys(a).map((key) => [key, a[key] + (b?.[key] ?? 0)]),
  )
}

function subtractUsage(a, b) {
  const reset = a.totalTokens < b.totalTokens
  return Object.fromEntries(
    Object.keys(a).map((key) => [
      key,
      Math.max(0, a[key] - (reset ? 0 : b[key])),
    ]),
  )
}

function numberOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function positiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

function durationBetween(start, end) {
  const duration = Date.parse(end) - Date.parse(start)
  return Number.isFinite(duration) && duration > 0 ? duration : 1_000
}

function formatDuration(value = 1_000) {
  const seconds = Math.max(1, Math.round(value / 1_000))
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.round((minutes / 60) * 10) / 10
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

function timestampFromSeconds(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Date(value * 1_000).toISOString()
    : undefined
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function readOptionalJson(file) {
  return existsSync(file) ? readJson(file) : null
}

function expandHome(value) {
  if (value === '~') return homedir()
  return value.startsWith('~/') ? path.join(homedir(), value.slice(2)) : value
}

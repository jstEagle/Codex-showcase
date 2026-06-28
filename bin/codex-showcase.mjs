#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const configPath = path.join(root, 'codex-showcase.config.json')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const command = args._[0] ?? 'export'

  if (command === 'help' || args.help) {
    printHelp()
    return
  }

  if (command !== 'export') {
    throw new Error(`Unknown command: ${command}`)
  }

  const config = await readJson(configPath)
  const projectDir = path.resolve(String(args.projectDir ?? process.cwd()))
  const codexHome = path.resolve(
    expandHome(String(args.codexHome ?? path.join(homedir(), '.codex'))),
  )
  const outputDir = path.resolve(
    String(args.output ?? path.join(projectDir, config.defaultOutputDir)),
  )
  const includeArchived = args.archived !== false
  const allThreads = Boolean(args.all)

  const packageJson = await readOptionalJson(
    path.join(projectDir, 'package.json'),
  )
  const project = {
    title: String(args.title ?? packageJson?.name ?? path.basename(projectDir)),
    description: String(args.description ?? ''),
    author: String(args.author ?? ''),
    maker: String(args.maker ?? args.author ?? ''),
    links: parseLinks(args.link),
  }

  const sessionFiles = await findSessionFiles(codexHome, includeArchived)
  const threads = []

  for (const file of sessionFiles) {
    const thread = await parseSessionFile(file, projectDir, allThreads)

    if (thread) {
      threads.push(redactThread(thread, config.redactionPatterns))
    }
  }

  threads.sort((a, b) => a.startedAt.localeCompare(b.startedAt))

  const artifact = {
    schemaVersion: config.artifactVersion,
    exportedAt: new Date().toISOString(),
    source: {
      projectDir: scrubText(projectDir, config.redactionPatterns),
      codexHome: scrubText(codexHome, config.redactionPatterns),
      threadCount: threads.length,
    },
    project: redactProject(project, config.redactionPatterns),
    codexHistory: threads,
  }

  await mkdir(outputDir, { recursive: true })
  await writeFile(
    path.join(outputDir, 'project.json'),
    `${JSON.stringify(artifact, null, 2)}\n`,
  )
  await writeFile(path.join(outputDir, 'project.md'), renderMarkdown(artifact))

  console.log(`Wrote ${path.join(outputDir, 'project.json')}`)
  console.log(`Wrote ${path.join(outputDir, 'project.md')}`)
  console.log(
    `Included ${threads.length} Codex thread${threads.length === 1 ? '' : 's'}`,
  )
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

    if (negated && inlineValue === undefined) {
      assignArg(args, key, false)
      continue
    }

    const value = negated ? false : inlineValue

    if (inlineValue !== undefined) {
      assignArg(args, key, value)
      continue
    }

    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      assignArg(args, key, true)
      continue
    }

    assignArg(args, key, next)
    index += 1
  }

  return args
}

function assignArg(args, key, value) {
  if (key === 'link' && args.link) {
    args.link = Array.isArray(args.link)
      ? [...args.link, value]
      : [args.link, value]
    return
  }

  args[key] = value
}

function printHelp() {
  console.log(`codex-showcase export

Usage:
  codex-showcase export [options]

Options:
  --project-dir <path>   Project directory to match against Codex sessions
  --codex-home <path>    Codex home directory, defaults to ~/.codex
  --output <path>        Output directory, defaults to ./codex-showcase-export
  --title <text>         Project title for the Markdown and JSON artifact
  --description <text>   Project description
  --author <text>        Post author
  --maker <text>         Person or team who built the project
  --link <label=url>     Repeatable project link
  --all                  Include all Codex sessions instead of cwd matches only
  --no-archived          Skip ~/.codex/archived_sessions
`)
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function readOptionalJson(filePath) {
  if (!existsSync(filePath)) {
    return null
  }

  return readJson(filePath)
}

function expandHome(value) {
  if (value === '~') {
    return homedir()
  }

  if (value.startsWith('~/')) {
    return path.join(homedir(), value.slice(2))
  }

  return value
}

function parseLinks(rawLinks) {
  const links = Array.isArray(rawLinks) ? rawLinks : rawLinks ? [rawLinks] : []

  return links.map((rawLink) => {
    const [label, ...urlParts] = String(rawLink).split('=')
    const url = urlParts.join('=')

    return {
      label: label || url,
      url: url || label,
    }
  })
}

async function findSessionFiles(codexHome, includeArchived) {
  const roots = [path.join(codexHome, 'sessions')]

  if (includeArchived) {
    roots.push(path.join(codexHome, 'archived_sessions'))
  }

  const files = []

  for (const sessionRoot of roots) {
    if (!existsSync(sessionRoot)) {
      continue
    }

    files.push(...(await walkJsonl(sessionRoot)))
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
      continue
    }

    if (entry.endsWith('.jsonl')) {
      files.push(entryPath)
    }
  }

  return files
}

async function parseSessionFile(file, projectDir, allThreads) {
  const text = await readFile(file, 'utf8')
  const lines = text.split('\n').filter(Boolean)
  let metadata = null
  const turns = []
  let currentTurn = null

  for (const line of lines) {
    let entry

    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    if (entry.type === 'session_meta') {
      metadata = entry.payload
      continue
    }

    if (entry.type !== 'response_item' || entry.payload?.type !== 'message') {
      continue
    }

    const role = entry.payload.role
    const content = messageText(entry.payload.content)

    if (!content || isInternalContextMessage(content)) {
      continue
    }

    if (role === 'user') {
      if (currentTurn?.codex) {
        turns.push(currentTurn)
      }

      currentTurn = {
        id: `turn-${turns.length + 1}`,
        user: content,
        codex: '',
        workedFor: '',
        requestedAt: entry.timestamp,
        completedAt: '',
      }
      continue
    }

    if (
      role === 'assistant' &&
      entry.payload.phase !== 'commentary' &&
      currentTurn
    ) {
      currentTurn.codex = content
      currentTurn.completedAt = entry.timestamp
      currentTurn.workedFor = formatDuration(
        currentTurn.requestedAt,
        currentTurn.completedAt,
      )
    }
  }

  if (currentTurn?.codex) {
    turns.push(currentTurn)
  }

  if (!metadata || turns.length === 0) {
    return null
  }

  const cwd = metadata.cwd ? path.resolve(metadata.cwd) : ''

  if (!allThreads && !isSameOrChild(cwd, projectDir)) {
    return null
  }

  return {
    threadId: metadata.id ?? path.basename(file, '.jsonl'),
    sourceFile: file,
    cwd,
    startedAt: metadata.timestamp ?? '',
    title: deriveThreadTitle(turns),
    turns: turns.map(({ id, user, codex, workedFor }) => ({
      id,
      user,
      codex,
      workedFor,
    })),
  }
}

function messageText(content) {
  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .map((part) => {
      if (typeof part?.text === 'string') {
        return part.text
      }

      if (typeof part?.input_text === 'string') {
        return part.input_text
      }

      if (typeof part?.output_text === 'string') {
        return part.output_text
      }

      return ''
    })
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
  const relative = path.relative(parent, candidate)

  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
}

function formatDuration(start, end) {
  const startedAt = Date.parse(start)
  const endedAt = Date.parse(end)

  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) {
    return 'worked for a bit'
  }

  const seconds = Math.max(1, Math.round((endedAt - startedAt) / 1000))

  if (seconds < 60) {
    return `worked for ${seconds} seconds`
  }

  const minutes = Math.round(seconds / 60)

  return `worked for ${minutes} minute${minutes === 1 ? '' : 's'}`
}

function deriveThreadTitle(turns) {
  const firstRequest = turns[0]?.user ?? 'Codex thread'
  const firstSentence = firstRequest.split(/[.!?\n]/)[0]?.trim()

  return truncate(firstSentence || firstRequest, 80)
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1).trim()}...`
}

function redactProject(project, patterns) {
  return {
    ...project,
    title: scrubText(project.title, patterns),
    description: scrubText(project.description, patterns),
    author: scrubText(project.author, patterns),
    maker: scrubText(project.maker, patterns),
    links: project.links.map((link) => ({
      label: scrubText(link.label, patterns),
      url: scrubText(link.url, patterns),
    })),
  }
}

function redactThread(thread, patterns) {
  return {
    ...thread,
    sourceFile: scrubText(thread.sourceFile, patterns),
    cwd: scrubText(thread.cwd, patterns),
    title: scrubText(thread.title, patterns),
    turns: thread.turns.map((turn) => ({
      ...turn,
      user: scrubText(turn.user, patterns),
      codex: scrubText(turn.codex, patterns),
    })),
  }
}

function scrubText(value, patternConfigs) {
  return patternConfigs.reduce((text, patternConfig) => {
    const regex = new RegExp(patternConfig.pattern, patternConfig.flags)

    return text.replace(regex, patternConfig.replacement)
  }, String(value))
}

function renderMarkdown(artifact) {
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(artifact.project.title)}`,
    `description: ${JSON.stringify(artifact.project.description)}`,
    `author: ${JSON.stringify(artifact.project.author)}`,
    `maker: ${JSON.stringify(artifact.project.maker)}`,
    `schemaVersion: ${JSON.stringify(artifact.schemaVersion)}`,
    '---',
    '',
  ].join('\n')

  const links = artifact.project.links.length
    ? [
        '## Links',
        '',
        ...artifact.project.links.map(
          (link) => `- [${link.label}](${link.url})`,
        ),
        '',
      ].join('\n')
    : ''

  const history = artifact.codexHistory.flatMap((thread) => [
    `## ${thread.title}`,
    '',
    `Thread: ${thread.threadId}`,
    '',
    ...thread.turns.flatMap((turn) => [
      `### ${turn.workedFor}`,
      '',
      `**User**`,
      '',
      turn.user,
      '',
      `**Codex**`,
      '',
      turn.codex,
      '',
    ]),
  ])

  return [
    frontmatter,
    `# ${artifact.project.title}`,
    '',
    artifact.project.description,
    '',
    links,
    '## Codex History',
    '',
    history.join('\n'),
    '',
  ].join('\n')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

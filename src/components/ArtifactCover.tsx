import type { Project } from '../projects'

/* ----------------------------------------------------------------------------
   ArtifactCover — a procedural, deterministic "build artifact" preview.
   Each project renders as a small framed piece of real-feeling product UI
   (editor, terminal, diff, chart, wireframe, or phone) instead of a stock
   image. Themed per project from a hash of its slug, using a single accent.
---------------------------------------------------------------------------- */

type Kind = 'editor' | 'terminal' | 'diff' | 'chart' | 'wireframe' | 'phone'

const ACCENTS = [
  '#5dd135', // codex green
  '#62a8ff', // blue
  '#b48cff', // violet
  '#ffb454', // amber
  '#3fd0c9', // teal
  '#ff7a90', // rose
]

const KIND_BY_CATEGORY: Record<string, Kind> = {
  Research: 'chart',
  Automation: 'terminal',
  Design: 'wireframe',
  Debugging: 'diff',
  Mobile: 'phone',
  Devtools: 'terminal',
}

function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic 0..1 generator seeded from a string. */
function seeded(seed: string) {
  let state = hash(seed) || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 4294967296
  }
}

function accentFor(slug: string) {
  return ACCENTS[hash(slug) % ACCENTS.length]
}

function kindFor(project: Project): Kind {
  return KIND_BY_CATEGORY[project.category] ?? 'editor'
}

function fileBase(project: Project) {
  return project.slug.split('-').slice(0, 2).join('-')
}

function Bar({ name, tag }: { name: string; tag: string }) {
  return (
    <div className="art-bar">
      <i />
      <i />
      <i />
      <span className="art-name">{name}</span>
      <span className="art-tag">{tag}</span>
    </div>
  )
}

function CodeBody({ project }: { project: Project }) {
  const [a, b] = project.stack
  const fn = fileBase(project).replace(/-/g, '_')
  const lines: Array<Array<[string, string]>> = [
    [
      ['tok-key', 'export async function '],
      ['tok-fn', `${fn}`],
      ['tok-dim', '() {'],
    ],
    [
      ['tok-dim', '  const ctx = await '],
      ['tok-fn', 'codex'],
      ['tok-dim', '.session()'],
    ],
    [
      ['tok-key', '  const '],
      ['tok-dim', `data = ${a.toLowerCase()}.load(`],
      ['tok-str', `"${fileBase(project)}"`],
      ['tok-dim', ')'],
    ],
    [['tok-com', `  // ${b} → review → ship`]],
    [
      ['tok-key', '  return '],
      ['tok-fn', 'render'],
      ['tok-dim', '(data)'],
    ],
    [['tok-dim', '}']],
  ]
  return (
    <div className="art-body art-code">
      {lines.map((tokens, i) => (
        <div className="ln" key={i}>
          <span className="gut">{i + 1}</span>
          <span>
            {tokens.map(([cls, text], j) => (
              <span className={cls} key={j}>
                {text}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}

function TerminalBody({ project }: { project: Project }) {
  const base = fileBase(project)
  return (
    <div className="art-body art-term">
      <div className="row">
        <span className="prompt">❯</span>
        <span>codex run {base}</span>
      </div>
      <div className="row">
        <span className="out"> reading {project.stack.length} sources…</span>
      </div>
      <div className="row">
        <span className="out"> applied 14 edits across 6 files</span>
      </div>
      <div className="row">
        <span className="ok">✓</span>
        <span className="out">checks passed · {project.updated} ago</span>
      </div>
      <div className="row">
        <span className="prompt">❯</span>
        <span style={{ opacity: 0.5 }}>▌</span>
      </div>
    </div>
  )
}

function DiffBody({ project }: { project: Project }) {
  return (
    <div className="art-body art-diff">
      <div className="row ctx">
        <span className="sign"> </span>
        <span>@@ {fileBase(project)} @@</span>
      </div>
      <div className="row del">
        <span className="sign">-</span>
        <span>const save = guess(payload)</span>
      </div>
      <div className="row add">
        <span className="sign">+</span>
        <span>const save = await verify(payload)</span>
      </div>
      <div className="row add">
        <span className="sign">+</span>
        <span>logger.trace(save.id, route)</span>
      </div>
      <div className="row ctx">
        <span className="sign"> </span>
        <span>return save</span>
      </div>
    </div>
  )
}

function ChartBody({ project }: { project: Project }) {
  const rand = seeded(project.slug)
  const bars = Array.from({ length: 11 }, () => 0.22 + rand() * 0.78)
  return (
    <div className="art-chart">
      <div className="art-bars">
        {bars.map((h, i) => (
          <span
            key={i}
            style={{
              height: `${Math.round(h * 100)}%`,
              animationDelay: `${i * 45}ms`,
            }}
          />
        ))}
      </div>
      <div className="art-legend">
        <span>
          {fileBase(project)} · <b>+{Math.round(18 + rand() * 60)}%</b>
        </span>
        <span>{project.stack[0] ?? 'run'}</span>
      </div>
    </div>
  )
}

function WireframeBody() {
  return (
    <div className="art-wire">
      <div className="col">
        <div className="blk h20 accent" />
        <div className="blk h12" />
        <div className="blk h12" />
        <div className="blk h12" />
        <div className="blk grow" />
      </div>
      <div className="col">
        <div className="blk h40 accent" />
        <div className="blk h20" />
        <div className="blk grow" />
      </div>
    </div>
  )
}

function PhoneBody() {
  return (
    <div className="art-phone">
      <div className="frame">
        <div className="notch" />
        <div className="screen">
          <div className="bar tall accent" />
          <div className="bar" />
          <div className="bar" style={{ width: '70%' }} />
          <div className="bar" />
          <div className="bar accent" style={{ width: '55%' }} />
          <div className="bar" style={{ width: '80%' }} />
        </div>
      </div>
    </div>
  )
}

export function ArtifactCover({
  project,
  size = 'card',
}: {
  project: Project
  size?: 'card' | 'lg'
}) {
  const kind = kindFor(project)
  const accent = accentFor(project.slug)
  const base = fileBase(project)

  const framed = kind === 'editor' || kind === 'terminal' || kind === 'diff'

  const names: Record<Kind, string> = {
    editor: `src/${base}.ts`,
    terminal: `~/${base} — zsh`,
    diff: `app/${base}.ts`,
    chart: '',
    wireframe: '',
    phone: '',
  }

  const tags: Record<Kind, string> = {
    editor: project.stack[0] ?? 'ts',
    terminal: 'shell',
    diff: 'diff',
    chart: 'report',
    wireframe: 'ui',
    phone: 'mobile',
  }

  return (
    <div
      className={`artifact ${size}`}
      style={{ '--art-accent': accent } as React.CSSProperties}
      aria-hidden="true"
    >
      {framed && <Bar name={names[kind]} tag={tags[kind]} />}
      {kind === 'editor' && <CodeBody project={project} />}
      {kind === 'terminal' && <TerminalBody project={project} />}
      {kind === 'diff' && <DiffBody project={project} />}
      {kind === 'chart' && <ChartBody project={project} />}
      {kind === 'wireframe' && <WireframeBody />}
      {kind === 'phone' && <PhoneBody />}
    </div>
  )
}

export { accentFor }

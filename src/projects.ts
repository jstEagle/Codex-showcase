export type ProjectLink = {
  label: string
  url: string
  kind: 'demo' | 'repo' | 'video' | 'image' | 'article'
}

export type ProjectTurn = {
  id: string
  user: string
  codex: string
  workedFor: string
}

export type Project = {
  slug: string
  title: string
  author: string
  maker: string
  description: string
  body: Array<string>
  category: string
  stack: Array<string>
  links: Array<ProjectLink>
  status: 'Featured' | 'Popular' | 'New'
  updated: string
  history: Array<ProjectTurn>
}

export const projects: Array<Project> = [
  {
    slug: 'realtime-volatility-research-lab',
    title: 'Realtime Volatility Research Lab',
    author: 'Mira Chen',
    maker: 'Mira Chen',
    description:
      'A research console that turns market data, Codex-generated Rust experiments, and report snapshots into a repeatable backtesting workflow.',
    body: [
      'The project started as a messy folder of market notes, simulation snippets, and screenshots from failed backtests.',
      'Codex helped turn that pile into a repeatable lab: a Rust engine, a TanStack interface, a report surface, and a review loop for comparing strategy changes.',
    ],
    category: 'Research',
    stack: ['Rust', 'TanStack', 'Hyperliquid'],
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
      {
        label: 'Report video',
        url: 'https://video.codex.show/volatility-lab',
        kind: 'video',
      },
    ],
    status: 'Featured',
    updated: '12m',
    history: [
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
  {
    slug: 'pocket-crm-from-slack-threads',
    title: 'Pocket CRM From Slack Threads',
    author: 'Theo Ramirez',
    maker: 'Theo Ramirez',
    description:
      'Codex converted support conversations into a small CRM with follow-ups, account notes, and Linear-ready task extraction.',
    body: [
      'The app treats scattered Slack context as the source material for account follow-up work.',
      'The published project includes the user-facing app, the extraction rules, and the build history that explains why the data model stayed small.',
    ],
    category: 'Automation',
    stack: ['Slack', 'Postgres', 'React'],
    links: [
      {
        label: 'Live demo',
        url: 'https://demo.codex.show/pocket-crm',
        kind: 'demo',
      },
      {
        label: 'Repository',
        url: 'https://github.com/theor/pocket-crm',
        kind: 'repo',
      },
    ],
    status: 'Popular',
    updated: '48m',
    history: [
      {
        id: 'turn-1',
        user: 'Build a tiny CRM from these Slack support threads. Keep it operational, not salesy.',
        codex:
          'Modeled accounts, notes, follow-ups, and source links, then built the first searchable workspace view.',
        workedFor: 'worked for 24 minutes',
      },
      {
        id: 'turn-2',
        user: 'Add a way to turn important support asks into Linear-ready tasks.',
        codex:
          'Added task extraction, confidence labels, editable summaries, and a review queue before handoff.',
        workedFor: 'worked for 15 minutes',
      },
    ],
  },
  {
    slug: 'recipe-import-recovery',
    title: 'Recipe Import Recovery',
    author: 'Nadia Vale',
    maker: 'Nadia Vale',
    description:
      'A production debugging story where Codex traced failed recipe saves through deployment logs, route handlers, and database writes.',
    body: [
      'This project is useful because the build history is the product proof: a visible runtime failure became a traced fix rather than a guess.',
      'The showcase artifact preserves the prompt, the final Codex summaries, and the polished write-up without publishing raw tool-call logs.',
    ],
    category: 'Debugging',
    stack: ['Next.js', 'Supabase', 'Vercel'],
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
      {
        label: 'Source image',
        url: 'https://images.codex.show/orange-card/import-source.png',
        kind: 'image',
      },
    ],
    status: 'Featured',
    updated: '1d',
    history: [
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
  {
    slug: 'mobile-briefing-composer',
    title: 'Mobile Briefing Composer',
    author: 'Jon Bell',
    maker: 'Jon Bell',
    description:
      'A mobile article briefing app rebuilt with Codex across Expo, backend ingestion, realtime updates, audio, and source management.',
    body: [
      'The finished project is a mobile-first briefing workspace for collecting sources and generating deeper article reads.',
      'Its Codex history shows the useful part: production backend triage, UI rebuilds, mobile auth fixes, and iterative polish across multiple services.',
    ],
    category: 'Mobile',
    stack: ['Expo', 'Railway', 'Supabase'],
    links: [
      {
        label: 'Live demo',
        url: 'https://demo.codex.show/mobile-briefing',
        kind: 'demo',
      },
      {
        label: 'Repository',
        url: 'https://github.com/jonbell/mobile-briefing',
        kind: 'repo',
      },
    ],
    status: 'New',
    updated: '4d',
    history: [
      {
        id: 'turn-1',
        user: 'The mobile login loop is broken in Expo Go. Make the callback flow actually work.',
        codex:
          'Traced callback ownership, updated the auth redirect handling, and verified the Expo Go path with the correct deep link shape.',
        workedFor: 'worked for 22 minutes',
      },
      {
        id: 'turn-2',
        user: 'Make source editing feel like a real app, not a settings form.',
        codex:
          'Rebuilt source management with dense controls, better saved states, topic editing, and a cleaner custom select interaction.',
        workedFor: 'worked for 19 minutes',
      },
    ],
  },
]

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

  return pool
    .map((project) => {
      const haystack = [
        project.title,
        project.author,
        project.description,
        project.category,
        project.status,
        ...project.stack,
        ...project.links.map((link) => link.url),
      ]
        .join(' ')
        .toLowerCase()

      const score = terms.reduce(
        (sum, term) => sum + (haystack.includes(term) ? 1 : 0),
        0,
      )

      return { project, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.project)
}

export const projectArtifactExample = {
  schemaVersion: 'codex-showcase-project/v1',
  project: {
    title: 'Realtime Volatility Research Lab',
    description:
      'A polished project post plus its cleaned Codex build history.',
    author: 'Mira Chen',
    maker: 'Mira Chen',
    links: [
      {
        label: 'Repository',
        url: 'https://github.com/mirachen/volatility-lab',
      },
      { label: 'Demo', url: 'https://demo.codex.show/volatility-lab' },
    ],
  },
  codexHistory: [
    {
      threadId: '019e...',
      turns: [
        {
          user: 'Build the first research dashboard.',
          codex: 'Created the app shell, routes, and comparison view.',
          workedFor: 'worked for 18 minutes',
        },
      ],
    },
  ],
}

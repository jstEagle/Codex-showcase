import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowUp,
  Box,
  ChevronDown,
  Clock3,
  Code2,
  ExternalLink,
  Flame,
  Folder,
  GitBranch,
  Github,
  Laptop,
  MessageSquarePlus,
  Mic,
  Monitor,
  PanelRight,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

export const Route = createFileRoute('/')({ component: Home })

type Project = {
  title: string
  author: string
  summary: string
  category: string
  stack: Array<string>
  workflow: Array<string>
  status: 'Featured' | 'Popular' | 'New'
  demo: string
  repo: string
  updated: string
}

const projects: Array<Project> = [
  {
    title: 'Realtime Volatility Research Lab',
    author: 'Mira Chen',
    summary:
      'A research console that turns market data, Codex-generated Rust experiments, and report snapshots into a repeatable backtesting workflow.',
    category: 'Research',
    stack: ['Rust', 'TanStack', 'Hyperliquid'],
    workflow: ['Backtesting', 'Code review', 'Visual report'],
    status: 'Featured',
    demo: 'demo.codex.show/volatility-lab',
    repo: 'github.com/mirachen/volatility-lab',
    updated: '12m',
  },
  {
    title: 'Pocket CRM From Slack Threads',
    author: 'Theo Ramirez',
    summary:
      'Codex converted support conversations into a small CRM with follow-ups, account notes, and Linear-ready task extraction.',
    category: 'Automation',
    stack: ['Slack', 'Postgres', 'React'],
    workflow: ['Internal tool', 'Data extraction', 'Workflow automation'],
    status: 'Popular',
    demo: 'demo.codex.show/pocket-crm',
    repo: 'github.com/theor/pocket-crm',
    updated: '48m',
  },
  {
    title: 'Launch Page Builder',
    author: 'Avery Brooks',
    summary:
      'A prompt-to-launch workflow that generates copy, layout, component polish, accessibility passes, and deployment notes.',
    category: 'Design',
    stack: ['Next.js', 'Tailwind', 'Vercel'],
    workflow: ['Full app build', 'Design implementation', 'Deployment'],
    status: 'Featured',
    demo: 'demo.codex.show/launch-builder',
    repo: 'github.com/averyb/launch-builder',
    updated: '2h',
  },
  {
    title: 'Recipe Import Recovery',
    author: 'Nadia Vale',
    summary:
      'A production debugging story where Codex traced failed recipe saves through Vercel logs, route handlers, and Supabase writes.',
    category: 'Debugging',
    stack: ['Next.js', 'Supabase', 'Vercel'],
    workflow: ['Debugging', 'Logging', 'Production fix'],
    status: 'Popular',
    demo: 'orangecard.justus.sh',
    repo: 'github.com/nadiavale/orange-card',
    updated: '1d',
  },
  {
    title: 'Browser Extension Release Desk',
    author: 'Iris Kim',
    summary:
      'A local-first extension release workflow with Codex-generated packaging, GitHub release automation, and conservative tab actions.',
    category: 'Devtools',
    stack: ['MV3', 'TypeScript', 'GitHub Actions'],
    workflow: ['Release automation', 'Code review', 'Packaging'],
    status: 'New',
    demo: 'demo.codex.show/release-desk',
    repo: 'github.com/irisk/release-desk',
    updated: '3d',
  },
  {
    title: 'Mobile Briefing Composer',
    author: 'Jon Bell',
    summary:
      'A mobile article briefing app that uses Codex to rebuild audio, source management, and image workflows across Expo and backend services.',
    category: 'Mobile',
    stack: ['Expo', 'Railway', 'Supabase'],
    workflow: ['Mobile app', 'Backend ingestion', 'Realtime'],
    status: 'New',
    demo: 'demo.codex.show/mobile-briefing',
    repo: 'github.com/jonbell/mobile-briefing',
    updated: '4d',
  },
]

const discoverySections = [
  {
    name: 'Featured',
    icon: <Star size={17} />,
    items: projects.filter((project) => project.status === 'Featured'),
  },
  {
    name: 'Popular',
    icon: <Flame size={17} />,
    items: projects.filter((project) => project.status === 'Popular'),
  },
  {
    name: 'New',
    icon: <Clock3 size={17} />,
    items: projects.filter((project) => project.status === 'New'),
  },
]

const suggestions = [
  'Show me Codex projects with demos',
  'Find debugging stories using Supabase',
  'What are the best full app builds?',
]

function Home() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const results = useMemo(
    () => searchProjects(submittedQuery, projects),
    [submittedQuery],
  )

  function submitSearch(nextQuery = query) {
    const trimmed = nextQuery.trim()

    if (!trimmed) {
      return
    }

    setSubmittedQuery(trimmed)
    setQuery('')
  }

  return (
    <main className="codex-shell">
      <Sidebar />
      <section className="codex-main" aria-label="Codex Showcase">
        <TopControls />
        {submittedQuery ? (
          <SearchThread
            query={submittedQuery}
            results={results}
            queryInput={query}
            setQuery={setQuery}
            submitSearch={submitSearch}
          />
        ) : (
          <section className="empty-thread">
            <h1>What should we find in codex-showcase?</h1>
            <Composer
              query={query}
              setQuery={setQuery}
              submitSearch={submitSearch}
            />
            <div className="connect-grid">
              {suggestions.map((suggestion) => (
                <button
                  className="connect-card suggestion-card"
                  key={suggestion}
                  onClick={() => submitSearch(suggestion)}
                  type="button"
                >
                  <span>
                    <Search size={20} strokeWidth={2.4} />
                  </span>
                  <h2>{suggestion}</h2>
                  <p>Search showcase projects</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

function Sidebar() {
  return (
    <aside className="codex-sidebar" aria-label="Sidebar">
      <div className="window-chrome" aria-hidden="true">
        <span className="traffic red" />
        <span className="traffic yellow" />
        <span className="traffic green" />
        <span className="mini-panel" />
        <span className="history-arrow">‹</span>
        <span className="history-arrow disabled">›</span>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        <a href="#new">
          <MessageSquarePlus size={17} />
          <span>New search</span>
        </a>
        <a href="#featured">
          <Star size={17} />
          <span>Featured</span>
        </a>
        <a href="#popular">
          <TrendingUp size={17} />
          <span>Popular</span>
        </a>
        <a href="#new-projects">
          <Sparkles size={17} />
          <span>New</span>
        </a>
      </nav>

      <div className="project-list">
        <p className="sidebar-kicker">Discover</p>
        {discoverySections.map((section) => (
          <section
            className="project-section"
            id={section.name.toLowerCase()}
            key={section.name}
          >
            <div className="project-heading">
              <span>
                {section.icon}
                {section.name}
              </span>
            </div>
            <div className="history-list">
              {section.items.map((item) => (
                <a className="history-item" href="#thread" key={item.title}>
                  <span>{item.title}</span>
                  <small>{item.updated}</small>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="sidebar-bottom">
        <a href="#settings">
          <Settings size={17} />
          <span>Settings</span>
        </a>
        <span className="phone-mark" aria-hidden="true" />
      </div>
    </aside>
  )
}

function TopControls() {
  return (
    <header className="top-controls">
      <button className="open-menu" type="button">
        <Box size={14} />
        <span>Open in</span>
        <ChevronDown size={14} />
      </button>
      <button className="top-icon" aria-label="Toggle monitor" type="button">
        <Monitor size={15} />
      </button>
      <button className="top-icon" aria-label="Toggle panel" type="button">
        <PanelRight size={16} />
      </button>
    </header>
  )
}

function SearchThread({
  query,
  results,
  queryInput,
  setQuery,
  submitSearch,
}: {
  query: string
  results: Array<Project>
  queryInput: string
  setQuery: (query: string) => void
  submitSearch: (query?: string) => void
}) {
  return (
    <section className="thread-view" id="thread">
      <div className="thread-scroll">
        <div className="user-bubble">{query}</div>
        <div className="assistant-block">
          <div className="worked-line">
            <span>Found {results.length} projects</span>
            <ChevronDown size={16} />
          </div>
          <div className="assistant-copy">
            <p>
              Here are the strongest Codex Showcase matches. Results prioritize
              demos, repositories, concrete workflow notes, and recent updates.
            </p>
          </div>
          <div className="result-list">
            {results.map((project) => (
              <ProjectResult project={project} key={project.title} />
            ))}
          </div>
        </div>
      </div>
      <div className="thread-composer">
        <Composer
          query={queryInput}
          setQuery={setQuery}
          submitSearch={submitSearch}
        />
      </div>
    </section>
  )
}

function ProjectResult({ project }: { project: Project }) {
  return (
    <article className="result-card">
      <div className="result-icon">
        <Code2 size={21} />
      </div>
      <div className="result-content">
        <div className="result-heading">
          <h2>{project.title}</h2>
          <span>{project.status}</span>
        </div>
        <p>{project.summary}</p>
        <div className="tag-row">
          {[
            project.category,
            ...project.stack,
            ...project.workflow.slice(0, 2),
          ].map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="result-links">
          <a href={`https://${project.demo}`}>
            <ExternalLink size={15} />
            {project.demo}
          </a>
          <a href={`https://${project.repo}`}>
            <Github size={15} />
            {project.repo}
          </a>
        </div>
      </div>
    </article>
  )
}

function Composer({
  query,
  setQuery,
  submitSearch,
}: {
  query: string
  setQuery: (query: string) => void
  submitSearch: (query?: string) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitSearch()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitSearch()
    }
  }

  return (
    <form className="codex-composer" onSubmit={handleSubmit}>
      <label htmlFor="prompt">Search projects</label>
      <textarea
        id="prompt"
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search for apps, agents, demos, workflows..."
        rows={2}
        value={query}
      />
      <div className="composer-actions">
        <button className="bare-icon" aria-label="Add filter" type="button">
          <Plus size={21} />
        </button>
        <button className="access-pill" type="button">
          <Shield size={16} />
          <span>Public showcase</span>
          <ChevronDown size={14} />
        </button>
        <span className="composer-fill" />
        <button className="model-pill" type="button">
          <Zap size={15} />
          <span>Semantic search</span>
          <ChevronDown size={14} />
        </button>
        <button className="bare-icon" aria-label="Voice input" type="button">
          <Mic size={17} />
        </button>
        <button className="submit-button" aria-label="Search" type="submit">
          <ArrowUp size={20} />
        </button>
      </div>
      <div className="context-strip">
        <button type="button">
          <Folder size={15} />
          <span>all projects</span>
          <ChevronDown size={14} />
        </button>
        <button type="button">
          <Laptop size={15} />
          <span>with demos</span>
          <ChevronDown size={14} />
        </button>
        <button type="button">
          <GitBranch size={15} />
          <span>latest</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </form>
  )
}

function searchProjects(query: string, allProjects: Array<Project>) {
  if (!query.trim()) {
    return allProjects.slice(0, 3)
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const scored = allProjects
    .map((project) => {
      const searchable = [
        project.title,
        project.author,
        project.summary,
        project.category,
        project.demo,
        project.repo,
        ...project.stack,
        ...project.workflow,
        project.status,
      ]
        .join(' ')
        .toLowerCase()
      const score = terms.reduce(
        (sum, term) => sum + (searchable.includes(term) ? 1 : 0),
        0,
      )

      return { project, score }
    })
    .sort((a, b) => b.score - a.score)

  const matches = scored
    .filter((item) => item.score > 0)
    .map((item) => item.project)

  return matches.length ? matches : allProjects.slice(0, 3)
}

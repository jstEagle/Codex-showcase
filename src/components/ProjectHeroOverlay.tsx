'use client'

import { gsap } from 'gsap'
import { ArrowLeft, Plug, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import {
  formatConversationTitle,
  parsePromptMentions,
} from '../lib/codex-mentions'
import type { Project } from '../projects'
import { HeroAsciiTrail } from './HeroAsciiTrail'

const SCRAMBLE_CHARACTERS = '!<>-_\\/[]{}=+*^?#01'

const responseMarkdownComponents: Components = {
  a({ href, children }) {
    if (!href || !/^https?:\/\//i.test(href)) {
      return <span className="chat-markdown__path">{children}</span>
    }

    return (
      <a href={href} rel="noreferrer" target="_blank">
        {children}
      </a>
    )
  },
}

export function ProjectHeroOverlay({
  project,
  onClose,
  onScroll,
}: {
  project: Project
  onClose: () => void
  onScroll: (scrollTop: number) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const closeRef = useRef(onClose)
  const scrollRef = useRef(onScroll)
  const closingRef = useRef(false)
  const [detailProject, setDetailProject] = useState(project)

  useEffect(() => {
    closeRef.current = onClose
    scrollRef.current = onScroll
  }, [onClose, onScroll])

  useEffect(() => {
    const hasCompleteHistory =
      (project.threads?.length ?? 0) >= project.storyThreadCount &&
      project.history.length >= project.storyTurnCount
    if (hasCompleteHistory) return

    const controller = new AbortController()

    void fetch(`/api/projects/${project.slug}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return
        const body = (await response.json()) as { project?: Project }
        if (body.project) setDetailProject(body.project)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
      })

    return () => controller.abort()
  }, [project])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useLayoutEffect(() => {
    const root = rootRef.current
    const title = titleRef.current
    if (!root || !title) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const reveals = root.querySelectorAll<HTMLElement>(
      '.project-hero__chrome, .project-hero__trace, .project-hero__stats, .project-hero__stat, .project-hero__brief > *, .project-hero__actions',
    )

    if (reducedMotion) {
      title.textContent = project.title
      gsap.set(reveals, { autoAlpha: 1, clearProps: 'transform,clipPath' })
      return
    }

    const context = gsap.context(() => {
      const scramble = { progress: 0 }
      const timeline = gsap.timeline({ delay: 0.08 })

      timeline
        .fromTo(
          '.project-hero__chrome',
          { autoAlpha: 0, y: -12 },
          { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power3.out' },
        )
        .fromTo(
          '.project-hero__trace',
          { autoAlpha: 0, clipPath: 'inset(0 100% 0 0)' },
          {
            autoAlpha: 1,
            clipPath: 'inset(0 0% 0 0)',
            duration: 0.58,
            ease: 'steps(12)',
          },
          0.38,
        )
        .to(
          scramble,
          {
            progress: 1,
            duration: 0.82,
            ease: 'power3.inOut',
            onUpdate: () => {
              title.textContent = scrambledTitle(
                project.title,
                scramble.progress,
              )
            },
            onComplete: () => {
              title.textContent = project.title
            },
          },
          0.48,
        )
        .fromTo(
          '.project-hero__title-wrap',
          { autoAlpha: 0, y: 26, clipPath: 'inset(0 0 100% 0)' },
          {
            autoAlpha: 1,
            y: 0,
            clipPath: 'inset(0 0 0% 0)',
            duration: 0.72,
            ease: 'expo.out',
          },
          0.48,
        )
        .fromTo(
          '.project-hero__stats',
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.34, ease: 'power2.out' },
          0.88,
        )
        .fromTo(
          '.project-hero__stat',
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: 'power3.out',
          },
          0.88,
        )
        .fromTo(
          '.project-hero__brief > *',
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.62,
            stagger: 0.09,
            ease: 'power3.out',
          },
          1.02,
        )
        .fromTo(
          '.project-hero__actions',
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' },
          1.24,
        )
    }, root)

    return () => context.revert()
  }, [project.slug, project.title])

  function dismiss() {
    if (closingRef.current) return
    closingRef.current = true
    const root = rootRef.current
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!root || reducedMotion) {
      closeRef.current()
      return
    }

    gsap.to(root.querySelectorAll('[data-hero-content]'), {
      autoAlpha: 0,
      y: 12,
      duration: 0.24,
      stagger: 0.018,
      ease: 'power2.in',
      onComplete: () => closeRef.current(),
    })
  }

  return (
    <div
      ref={rootRef}
      className="project-hero"
      aria-label={`${project.title} overview`}
      aria-modal="true"
      onScroll={(event) => scrollRef.current(event.currentTarget.scrollTop)}
      role="dialog"
    >
      <div className="project-hero__chrome" data-hero-content>
        <button autoFocus type="button" onClick={dismiss}>
          <ArrowLeft size={15} /> All projects
        </button>
        <span>{project.category}</span>
      </div>

      <HeroAsciiTrail
        animation={project.cardAnimation}
        imageUrl={projectCoverImage(detailProject)}
      />

      <div className="project-hero__visual-copy" data-hero-content>
        <span className="project-hero__trace">
          &gt; FOCUS / {project.cardAnimation.toUpperCase()} /{' '}
          {project.slug.slice(0, 26)}
        </span>
        <div className="project-hero__title-wrap">
          <h1 ref={titleRef}>{project.title}</h1>
          <p>{project.maker}</p>
        </div>
      </div>

      <main className="project-hero__content">
        <div
          className="project-hero__stats"
          aria-label="Project statistics"
          data-hero-content
        >
          <HeroStat label="Active Codex time">
            {formatDurationMs(detailProject.metrics.activeDurationMs)}
          </HeroStat>
          <HeroStat label="Tokens used">
            {formatTokens(detailProject.metrics.tokens?.totalTokens)}
          </HeroStat>
          <HeroStat label="Build record">
            {detailProject.storyThreadCount} threads ·{' '}
            {detailProject.storyTurnCount} prompts
          </HeroStat>
          <HeroStat label="Stack">
            {detailProject.stack.slice(0, 3).join(' · ') || 'Not specified'}
          </HeroStat>
        </div>

        <section className="project-hero__brief" data-hero-content>
          <p className="project-hero__eyebrow">
            Brief / {detailProject.category}
          </p>
          <h2>{detailProject.description}</h2>
          <p>
            Built by {detailProject.maker} with Codex. The cleaned conversation
            below preserves the prompts and final responses behind the project.
          </p>
        </section>

        <ProjectWriteup project={detailProject} />
        <ProjectHistory project={detailProject} />

        <div className="project-hero__actions" data-hero-content>
          <button type="button" onClick={dismiss}>
            Return to canvas
          </button>
        </div>
      </main>
    </div>
  )
}

function ProjectWriteup({ project }: { project: Project }) {
  if (
    project.body.length === 0 &&
    project.media.length === 0 &&
    project.links.length === 0
  ) {
    return null
  }

  return (
    <section className="project-hero__writeup" data-hero-content>
      <div className="project-hero__writeup-copy">
        <p className="project-hero__eyebrow">Project notes</p>
        <div>
          {project.body.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          ))}
        </div>
      </div>

      {project.media.length > 0 ? (
        <div className="project-hero__media" aria-label="Project media">
          {project.media.map((item) =>
            item.kind === 'video' ? (
              <video controls key={item.id} playsInline preload="metadata">
                <source src={item.url} type={item.contentType} />
              </video>
            ) : (
              <a
                aria-label={`Open ${item.name}`}
                href={item.url}
                key={item.id}
                rel="noreferrer"
                target="_blank"
              >
                <span style={{ backgroundImage: `url(${item.url})` }} />
              </a>
            ),
          )}
        </div>
      ) : null}

      {project.links.length > 0 ? (
        <nav className="project-hero__links" aria-label="Project links">
          {project.links.map((link) => (
            <a
              href={link.url}
              key={`${link.kind}-${link.url}`}
              rel="noreferrer"
              target="_blank"
            >
              <span>{link.kind}</span>
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </section>
  )
}

function ProjectHistory({ project }: { project: Project }) {
  const threads = project.threads?.length
    ? project.threads
    : [{ id: 'history', title: 'Build history', turns: project.history }]

  return (
    <section className="project-hero__history" data-hero-content>
      <header>
        <p className="project-hero__eyebrow">Codex conversation</p>
        <h2>How this project was built</h2>
        <p>
          User prompts and final Codex responses only. Tool output and private
          working context are intentionally omitted.
        </p>
      </header>

      <div className="project-hero__threads">
        {threads.map((thread) => (
          <article className="project-hero__thread" key={thread.id}>
            <div className="project-hero__thread-title">
              <span>{thread.turns.length} turns</span>
              <h3>
                {formatConversationTitle(
                  thread.title,
                  thread.turns[0]?.user ?? '',
                )}
              </h3>
            </div>
            {thread.turns.map((turn, index) => {
              const prompt = parsePromptMentions(turn.user)

              return (
                <div className="project-hero__turn" key={turn.id}>
                  <div className="project-hero__prompt">
                    {prompt.mentions.length > 0 ? (
                      <div className="project-hero__mentions">
                        {prompt.mentions.map((mention) => (
                          <span
                            className={`project-hero__mention project-hero__mention--${mention.type}`}
                            key={`${mention.type}-${mention.name}`}
                          >
                            {mention.type === 'skill' ? (
                              <Sparkles aria-hidden="true" size={11} />
                            ) : (
                              <Plug aria-hidden="true" size={11} />
                            )}
                            <span className="project-hero__mention-kind">
                              {mention.type}
                            </span>
                            <span>{mention.name}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {prompt.text ? <p>{prompt.text}</p> : null}
                  </div>
                  <div className="project-hero__turn-meta">
                    <span>{turn.workedFor.replace(/^worked/, 'Worked')}</span>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="project-hero__response">
                    <strong>Codex</strong>
                    <div className="chat-markdown">
                      <ReactMarkdown
                        components={responseMarkdownComponents}
                        remarkPlugins={[remarkGfm]}
                        skipHtml
                      >
                        {turn.codex}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )
            })}
          </article>
        ))}
      </div>
    </section>
  )
}

function HeroStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="project-hero__stat">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  )
}

function scrambledTitle(title: string, progress: number) {
  const characters = Array.from(title)
  const settled = Math.floor(characters.length * progress)
  const frame = Math.floor(progress * 31)

  return characters
    .map((character, index) => {
      if (character === ' ' || index < settled) return character
      return SCRAMBLE_CHARACTERS[
        (index * 17 + frame * 13) % SCRAMBLE_CHARACTERS.length
      ]
    })
    .join('')
}

function formatDurationMs(value?: number) {
  if (!value) return 'Unavailable'
  const minutes = Math.round(value / 60_000)
  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}

function formatTokens(value?: number) {
  return value === undefined
    ? 'Unavailable'
    : new Intl.NumberFormat().format(value)
}

function projectCoverImage(project: Project) {
  return (
    project.media.find((item) => item.cover && item.kind === 'image')?.url ??
    project.media.find((item) => item.kind === 'image')?.url ??
    project.heroImageUrl ??
    undefined
  )
}

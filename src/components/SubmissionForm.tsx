'use client'

import { UserButton } from '@clerk/nextjs'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileJson,
  FileText,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Play,
  Save,
  Send,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import Link from 'next/link'
import type { DragEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { appConfig, type CardAnimation } from '../config/app'
import type {
  Project,
  ProjectArtifact,
  ProjectLink,
  ProjectMedia,
} from '../projects'

type SubmitState =
  | { type: 'idle' }
  | { type: 'loading'; message: string }
  | { type: 'success'; project: Project; message?: string }
  | { type: 'error'; message: string }

type UploadResponse = {
  media?: ProjectMedia
  error?: string
}

type PendingEditMedia = {
  id: string
  file: File
}

const MEDIA_DRAG_TYPE = 'application/x-codex-showcase-media-key'

export function SubmissionForm({
  initialProjects,
}: {
  initialProjects: Array<Project>
}) {
  const isClerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  )
  const [projectJson, setProjectJson] = useState<File | null>(null)
  const [projectMarkdown, setProjectMarkdown] = useState<File | null>(null)
  const [artifact, setArtifact] = useState<ProjectArtifact | null>(null)
  const [projectName, setProjectName] = useState('')
  const [cardAnimation, setCardAnimation] = useState<CardAnimation>(
    appConfig.gallery.defaultCardAnimation,
  )
  const [mediaFiles, setMediaFiles] = useState<Array<File>>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [mediaDropActive, setMediaDropActive] = useState(false)
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false)
  const [projects, setProjects] = useState(initialProjects)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [state, setState] = useState<SubmitState>({ type: 'idle' })

  const turnCount = useMemo(
    () =>
      artifact?.threads.reduce(
        (total, thread) => total + thread.turns.length,
        0,
      ) ?? 0,
    [artifact],
  )

  async function chooseJson(file: File | null) {
    setProjectJson(file)
    setPrivacyConfirmed(false)
    if (!file) {
      setArtifact(null)
      setProjectName('')
      setCardAnimation(appConfig.gallery.defaultCardAnimation)
      return
    }

    try {
      const parsed = JSON.parse(await file.text()) as ProjectArtifact
      if (!parsed.project?.title || !Array.isArray(parsed.threads)) {
        throw new Error('This is not a Codex Showcase project artifact.')
      }
      setArtifact(parsed)
      setProjectName(parsed.project.title)
      setCardAnimation(
        appConfig.gallery.cardAnimations.find(
          (option) => option.id === parsed.project.cardAnimation,
        )?.id ?? appConfig.gallery.defaultCardAnimation,
      )
      setState({ type: 'idle' })
    } catch (error) {
      setArtifact(null)
      setState({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Could not read project.json',
      })
    }
  }

  function chooseMedia(files: FileList | Array<File> | null) {
    if (!files) {
      return
    }
    const incoming = Array.from(files)
    const known = new Set(mediaFiles.map(fileIdentity))
    const unique = incoming.filter((file) => !known.has(fileIdentity(file)))
    const available = appConfig.media.maxFilesPerProject - mediaFiles.length
    const next = unique.slice(0, Math.max(0, available))
    if (next.length !== unique.length) {
      setState({
        type: 'error',
        message: `Choose at most ${appConfig.media.maxFilesPerProject} media files.`,
      })
      return
    }
    setMediaFiles((current) => [...current, ...next])
    setState({ type: 'idle' })
  }

  async function submit() {
    const uploaded: Array<ProjectMedia> = []
    setState({ type: 'loading', message: 'Validating project…' })

    try {
      if (!projectJson || !projectMarkdown || !artifact) {
        throw new Error('Upload project.json and project.md.')
      }
      if (!projectName.trim()) {
        throw new Error('Enter a project name.')
      }
      if (mediaFiles.length === 0) {
        throw new Error('Add at least one image or video.')
      }
      if (!privacyConfirmed) {
        throw new Error('Confirm the privacy review before publishing.')
      }

      for (const [index, file] of mediaFiles.entries()) {
        setState({
          type: 'loading',
          message: `Uploading media ${index + 1} of ${mediaFiles.length}…`,
        })
        const response = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Content-Type': file.type,
            'X-File-Name': encodeURIComponent(file.name),
            'X-File-Size': String(file.size),
            'X-File-Cover': String(index === coverIndex),
          },
          body: file,
        })
        const body = (await response.json()) as UploadResponse
        if (!response.ok || !body.media) {
          throw new Error(body.error ?? `Could not upload ${file.name}.`)
        }
        uploaded.push(body.media)
      }

      setState({ type: 'loading', message: 'Publishing project…' })
      const updatedArtifact: ProjectArtifact = {
        ...artifact,
        project: {
          ...artifact.project,
          title: projectName.trim(),
          cardAnimation,
        },
      }
      const formData = new FormData()
      formData.append(
        'projectJson',
        new File([JSON.stringify(updatedArtifact, null, 2)], 'project.json', {
          type: 'application/json',
        }),
      )
      formData.append('projectMarkdown', projectMarkdown)
      formData.append('media', JSON.stringify(uploaded))
      formData.append('privacyConfirmed', 'true')

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      })
      const body = (await response.json()) as {
        project?: Project
        error?: string
      }
      if (!response.ok || !body.project) {
        throw new Error(body.error ?? 'Publication failed')
      }

      setProjects((current) => [
        body.project!,
        ...current.filter((item) => item.slug !== body.project!.slug),
      ])
      setState({ type: 'success', project: body.project })
    } catch (error) {
      if (uploaded.length > 0) {
        void fetch('/api/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectKeys: uploaded.map((item) => item.objectKey),
          }),
        })
      }
      setState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not publish',
      })
    }
  }

  async function setPublished(project: Project, published: boolean) {
    setState({
      type: 'loading',
      message: published ? 'Publishing project…' : 'Unpublishing project…',
    })
    try {
      const response = await fetch(`/api/projects/${project.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published }),
      })
      const body = (await response.json()) as {
        project?: Project
        error?: string
      }
      if (!response.ok || !body.project) {
        throw new Error(body.error ?? 'Could not update project.')
      }
      setProjects((current) =>
        current.map((item) =>
          item.slug === body.project!.slug ? body.project! : item,
        ),
      )
      setState({ type: 'idle' })
    } catch (error) {
      setState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Update failed',
      })
    }
  }

  return (
    <div className="ambassador-workspace">
      <section className="submit-panel">
        <div className="submit-head">
          <span className="submit-icon">
            <FileJson size={19} />
          </span>
          <div>
            <h1>Publish a Codex project</h1>
            <p>
              Upload the exporter files, review every included thread, and add
              the images or videos that should represent the project.
            </p>
          </div>
          {isClerkConfigured ? (
            <div className="submit-user">
              <UserButton />
            </div>
          ) : null}
        </div>

        {!isClerkConfigured ? (
          <div className="auth-strip">
            Clerk is not configured locally. Add the Clerk secrets to use
            ambassador publishing.
          </div>
        ) : null}

        {!appConfig.media.r2.accountId ? (
          <div className="auth-strip">
            Add the R2 account and bucket in the checked-in app configuration
            before publishing media.
          </div>
        ) : null}

        <div className="file-upload-grid">
          <ArtifactInput
            accept="application/json,.json"
            icon={<FileJson size={22} />}
            label="project.json"
            value={projectJson?.name}
            onChange={(file) => void chooseJson(file)}
          />
          <ArtifactInput
            accept="text/markdown,.md"
            icon={<FileText size={22} />}
            label="project.md"
            value={projectMarkdown?.name}
            onChange={setProjectMarkdown}
          />
        </div>

        {artifact ? (
          <section className="artifact-preview" aria-label="Artifact preview">
            <div>
              <span>Project name</span>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </div>
            <label className="artifact-preview__visual">
              <span>Card animation</span>
              <select
                value={cardAnimation}
                onChange={(event) =>
                  setCardAnimation(event.target.value as CardAnimation)
                }
              >
                {appConfig.gallery.cardAnimations.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} — {option.description}
                  </option>
                ))}
              </select>
            </label>
            <div className="artifact-preview__stats">
              <span>{artifact.threads.length} threads</span>
              <span>{turnCount} prompts</span>
              <span>
                {formatTokens(artifact.metrics?.tokens?.totalTokens)} tokens
              </span>
              <span>
                {artifact.redaction?.totalMatches ?? 0} redactions applied
              </span>
            </div>
            {artifact.redaction?.warnings.map((warning) => (
              <p className="privacy-warning" key={warning}>
                {warning}
              </p>
            ))}
          </section>
        ) : null}

        <section
          className={`media-upload${mediaDropActive ? ' is-file-dragging' : ''}`}
          onDragEnter={(event) => {
            if (hasFiles(event)) setMediaDropActive(true)
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setMediaDropActive(false)
            }
          }}
          onDragOver={(event) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
            setMediaDropActive(true)
          }}
          onDrop={(event) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            setMediaDropActive(false)
            chooseMedia(event.dataTransfer.files)
          }}
        >
          <div className="media-upload__head">
            <div>
              <h2>Project media</h2>
              <p>Images and video are securely streamed through the website.</p>
            </div>
            <span className="media-count">
              {mediaFiles.length}/{appConfig.media.maxFilesPerProject}
            </span>
          </div>
          <MediaDropzone
            active={mediaDropActive}
            disabled={state.type === 'loading'}
            onFiles={chooseMedia}
          />
          {mediaFiles.length > 0 ? (
            <div className="media-preview-grid">
              {mediaFiles.map((file, index) => (
                <MediaPreview
                  cover={index === coverIndex}
                  file={file}
                  key={`${file.name}-${file.lastModified}`}
                  mediaKey={`create:${fileIdentity(file)}`}
                  onCover={() => setCoverIndex(index)}
                  onRemove={() => {
                    setMediaFiles((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                    setCoverIndex((current) => {
                      if (current === index) return 0
                      return current > index ? current - 1 : current
                    })
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="media-empty">Add at least one image or video.</p>
          )}
        </section>

        <label className="privacy-confirmation">
          <input
            checked={privacyConfirmed}
            onChange={(event) => setPrivacyConfirmed(event.target.checked)}
            type="checkbox"
          />
          <ShieldCheck size={18} />
          <span>
            I reviewed the complete exported history—including every project
            thread—and confirm it is safe to publish immediately.
          </span>
        </label>

        <div className="submit-actions">
          <button
            className="btn btn-primary"
            disabled={state.type === 'loading'}
            onClick={submit}
            type="button"
          >
            {state.type === 'loading' ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Send size={16} />
            )}
            Publish now
          </button>
          {state.type === 'loading' ? (
            <span className="submit-state">{state.message}</span>
          ) : null}
          {state.type === 'success' ? (
            <span className="submit-state ok">
              <Check size={15} /> {state.message ?? 'Published'}{' '}
              {state.project.published ? (
                <Link href={`/projects/${state.project.slug}`}>
                  View project
                </Link>
              ) : null}
            </span>
          ) : null}
          {state.type === 'error' ? (
            <span className="submit-state error">{state.message}</span>
          ) : null}
        </div>
      </section>

      <section className="owned-projects">
        <div>
          <p className="article-kicker">Your projects</p>
          <h2>Manage work</h2>
        </div>
        {projects.length === 0 ? (
          <p>No projects published yet.</p>
        ) : (
          <div className="owned-project-list">
            {projects.map((project) => (
              <article key={project.slug}>
                <div>
                  <span>{project.published ? 'Public' : 'Unpublished'}</span>
                  <h3>{project.title}</h3>
                </div>
                <div>
                  {project.published ? (
                    <Link href={`/projects/${project.slug}`}>View</Link>
                  ) : null}
                  <button
                    onClick={() => setEditingSlug(project.slug)}
                    type="button"
                  >
                    <Pencil size={15} /> Edit
                  </button>
                  <button
                    onClick={() =>
                      void setPublished(project, !project.published)
                    }
                    type="button"
                  >
                    {project.published ? (
                      <>
                        <EyeOff size={15} /> Unpublish
                      </>
                    ) : (
                      <>
                        <Eye size={15} /> Publish
                      </>
                    )}
                  </button>
                </div>
                {editingSlug === project.slug ? (
                  <ProjectEditor
                    onCancel={() => setEditingSlug(null)}
                    onSave={(updated) => {
                      setProjects((current) =>
                        current.map((item) =>
                          item.slug === updated.slug ? updated : item,
                        ),
                      )
                      setEditingSlug(null)
                      setState({
                        type: 'success',
                        project: updated,
                        message: 'Saved',
                      })
                    }}
                    project={project}
                  />
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ProjectEditor({
  project,
  onCancel,
  onSave,
}: {
  project: Project
  onCancel: () => void
  onSave: (project: Project) => void
}) {
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description)
  const [maker, setMaker] = useState(project.maker)
  const [category, setCategory] = useState(project.category)
  const [stack, setStack] = useState(project.stack.join(', '))
  const [links, setLinks] = useState(
    project.links
      .map((link) => `${link.label} | ${link.url} | ${link.kind}`)
      .join('\n'),
  )
  const [cardAnimation, setCardAnimation] = useState(project.cardAnimation)
  const [projectMarkdown, setProjectMarkdown] = useState(
    project.projectMarkdown ?? project.description,
  )
  const [existingMedia, setExistingMedia] = useState(project.media)
  const [pendingMedia, setPendingMedia] = useState<Array<PendingEditMedia>>([])
  const [mediaOrder, setMediaOrder] = useState(
    project.media.map((item) => `existing:${item.id}`),
  )
  const [coverKey, setCoverKey] = useState(
    project.media.find((item) => item.cover)
      ? `existing:${project.media.find((item) => item.cover)!.id}`
      : project.media[0]
        ? `existing:${project.media[0].id}`
        : '',
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [mediaDropActive, setMediaDropActive] = useState(false)
  const [draggedMediaKey, setDraggedMediaKey] = useState<string | null>(null)
  const [mediaDropTarget, setMediaDropTarget] = useState<string | null>(null)

  const availableMediaKeys = new Set([
    ...existingMedia.map((item) => `existing:${item.id}`),
    ...pendingMedia.map((item) => `pending:${item.id}`),
  ])
  const mediaKeys = mediaOrder.filter((key) => availableMediaKeys.has(key))
  const effectiveCoverKey = mediaKeys.includes(coverKey)
    ? coverKey
    : (mediaKeys[0] ?? '')

  function chooseAdditionalMedia(files: FileList | null) {
    if (!files) return
    const available =
      appConfig.media.maxFilesPerProject -
      existingMedia.length -
      pendingMedia.length
    const selected = Array.from(files).slice(0, Math.max(0, available))
    if (selected.length !== files.length) {
      setMessage(
        `A project can contain at most ${appConfig.media.maxFilesPerProject} media files.`,
      )
    } else {
      setMessage(null)
    }
    const additions = selected.map((file) => ({
      id: crypto.randomUUID(),
      file,
    }))
    setPendingMedia((current) => [...current, ...additions])
    setMediaOrder((current) => [
      ...current,
      ...additions.map((item) => `pending:${item.id}`),
    ])
  }

  function removeMedia(mediaKey: string) {
    if (mediaKey.startsWith('existing:')) {
      const mediaId = mediaKey.slice('existing:'.length)
      setExistingMedia((current) =>
        current.filter((item) => item.id !== mediaId),
      )
    } else {
      const pendingId = mediaKey.slice('pending:'.length)
      setPendingMedia((current) =>
        current.filter((item) => item.id !== pendingId),
      )
    }
    setMediaOrder((current) => current.filter((key) => key !== mediaKey))
  }

  function moveMedia(mediaKey: string, targetKey: string) {
    if (mediaKey === targetKey) return
    setMediaOrder((current) => {
      const fromIndex = current.indexOf(mediaKey)
      const targetIndex = current.indexOf(targetKey)
      if (fromIndex < 0 || targetIndex < 0) return current
      const next = [...current]
      next.splice(fromIndex, 1)
      next.splice(targetIndex, 0, mediaKey)
      return next
    })
  }

  function moveMediaBy(mediaKey: string, offset: number) {
    setMediaOrder((current) => {
      const fromIndex = current.indexOf(mediaKey)
      const targetIndex = Math.min(
        current.length - 1,
        Math.max(0, fromIndex + offset),
      )
      if (fromIndex < 0 || fromIndex === targetIndex) return current
      const next = [...current]
      next.splice(fromIndex, 1)
      next.splice(targetIndex, 0, mediaKey)
      return next
    })
  }

  async function save() {
    const uploaded: Array<ProjectMedia> = []
    setSaving(true)
    setMessage('Saving project…')

    try {
      if (!title.trim()) throw new Error('Enter a project title.')
      if (!description.trim()) throw new Error('Enter a short description.')
      if (!maker.trim()) throw new Error('Enter the project maker.')
      if (!category.trim()) throw new Error('Enter a category.')
      if (!projectMarkdown.trim()) throw new Error('Enter a project write-up.')
      if (
        !effectiveCoverKey ||
        existingMedia.length + pendingMedia.length === 0
      ) {
        throw new Error('Keep at least one image or video and choose a cover.')
      }

      for (const [index, pending] of pendingMedia.entries()) {
        setMessage(
          `Uploading new media ${index + 1} of ${pendingMedia.length}…`,
        )
        const response = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Content-Type': pending.file.type,
            'X-File-Name': encodeURIComponent(pending.file.name),
            'X-File-Size': String(pending.file.size),
            'X-File-Cover': String(
              effectiveCoverKey === `pending:${pending.id}`,
            ),
          },
          body: pending.file,
        })
        const body = (await response.json()) as UploadResponse
        if (!response.ok || !body.media) {
          throw new Error(
            body.error ?? `Could not upload ${pending.file.name}.`,
          )
        }
        uploaded.push(body.media)
      }

      const existingByKey = new Map(
        existingMedia.map((item) => [`existing:${item.id}`, item]),
      )
      const uploadedByKey = new Map(
        pendingMedia.map((item, index) => [
          `pending:${item.id}`,
          uploaded[index],
        ]),
      )
      const media = mediaKeys.flatMap((key) => {
        const item = existingByKey.get(key) ?? uploadedByKey.get(key)
        return item ? [{ ...item, cover: key === effectiveCoverKey }] : []
      })
      const response = await fetch(`/api/projects/${project.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          maker: maker.trim(),
          category: category.trim(),
          stack: stack
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          links: parseProjectLinks(links),
          cardAnimation,
          projectMarkdown: projectMarkdown.trim(),
          media,
        }),
      })
      const body = (await response.json()) as {
        project?: Project
        error?: string
      }
      if (!response.ok || !body.project) {
        throw new Error(body.error ?? 'Could not save the project.')
      }

      onSave(body.project)
    } catch (error) {
      if (uploaded.length > 0) {
        void fetch('/api/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectKeys: uploaded.map((item) => item.objectKey),
          }),
        })
      }
      setMessage(error instanceof Error ? error.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="project-editor" aria-label={`Edit ${project.title}`}>
      <header>
        <div>
          <span>Edit project</span>
          <strong>The public URL stays /projects/{project.slug}</strong>
        </div>
        <button
          aria-label="Close editor"
          disabled={saving}
          onClick={onCancel}
          type="button"
        >
          <X size={16} />
        </button>
      </header>

      <div className="project-editor__grid">
        <label>
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          <span>Maker</span>
          <input
            value={maker}
            onChange={(event) => setMaker(event.target.value)}
          />
        </label>
        <label>
          <span>Category</span>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </label>
        <label>
          <span>Stack, comma separated</span>
          <input
            value={stack}
            onChange={(event) => setStack(event.target.value)}
          />
        </label>
      </div>

      <label className="project-editor__field">
        <span>Short description</span>
        <textarea
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <div className="project-editor__grid">
        <label>
          <span>Card animation</span>
          <select
            value={cardAnimation}
            onChange={(event) =>
              setCardAnimation(event.target.value as CardAnimation)
            }
          >
            {appConfig.gallery.cardAnimations.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Links, one per line: label | URL | kind</span>
          <textarea
            rows={3}
            value={links}
            onChange={(event) => setLinks(event.target.value)}
          />
        </label>
      </div>

      <label className="project-editor__field">
        <span>Project write-up (Markdown)</span>
        <textarea
          className="project-editor__markdown"
          rows={12}
          value={projectMarkdown}
          onChange={(event) => setProjectMarkdown(event.target.value)}
        />
      </label>

      <section
        className={`project-editor__media${mediaDropActive ? ' is-file-dragging' : ''}`}
        onDragEnter={(event) => {
          if (hasFiles(event)) setMediaDropActive(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setMediaDropActive(false)
          }
        }}
        onDragOver={(event) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setMediaDropActive(true)
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          setMediaDropActive(false)
          chooseAdditionalMedia(event.dataTransfer.files)
        }}
      >
        <header>
          <div>
            <strong>Images and video</strong>
            <span>
              Drag to reorder. The selected cover appears on the canvas and
              project hero.
            </span>
          </div>
          <span className="media-count">
            {mediaKeys.length}/{appConfig.media.maxFilesPerProject}
          </span>
        </header>
        <MediaDropzone
          active={mediaDropActive}
          disabled={
            saving || mediaKeys.length >= appConfig.media.maxFilesPerProject
          }
          onFiles={chooseAdditionalMedia}
        />
        {mediaKeys.length > 0 ? (
          <div className="media-preview-grid media-preview-grid--editor">
            {mediaKeys.map((mediaKey, index) => {
              const sharedProps = {
                cover: effectiveCoverKey === mediaKey,
                disabled: saving,
                dragging: draggedMediaKey === mediaKey,
                dropTarget: mediaDropTarget === mediaKey,
                index,
                mediaKey,
                onCover: () => setCoverKey(mediaKey),
                onDragEnd: () => {
                  setDraggedMediaKey(null)
                  setMediaDropTarget(null)
                },
                onDragStart: (event: DragEvent<HTMLElement>) => {
                  setDraggedMediaKey(mediaKey)
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData(MEDIA_DRAG_TYPE, mediaKey)
                },
                onDragOver: (event: DragEvent<HTMLElement>) => {
                  if (!draggedMediaKey) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setMediaDropTarget(mediaKey)
                },
                onDrop: (event: DragEvent<HTMLElement>) => {
                  const sourceKey =
                    event.dataTransfer.getData(MEDIA_DRAG_TYPE) ||
                    draggedMediaKey
                  if (!sourceKey) return
                  event.preventDefault()
                  event.stopPropagation()
                  moveMedia(sourceKey, mediaKey)
                  setDraggedMediaKey(null)
                  setMediaDropTarget(null)
                },
                onMoveBackward: () => moveMediaBy(mediaKey, -1),
                onMoveForward: () => moveMediaBy(mediaKey, 1),
                onRemove: () => removeMedia(mediaKey),
                total: mediaKeys.length,
              }

              if (mediaKey.startsWith('existing:')) {
                const media = existingMedia.find(
                  (item) => `existing:${item.id}` === mediaKey,
                )
                return media ? (
                  <ExistingMediaPreview
                    {...sharedProps}
                    key={mediaKey}
                    media={media}
                  />
                ) : null
              }

              const pending = pendingMedia.find(
                (item) => `pending:${item.id}` === mediaKey,
              )
              return pending ? (
                <MediaPreview
                  {...sharedProps}
                  file={pending.file}
                  key={mediaKey}
                />
              ) : null
            })}
          </div>
        ) : (
          <p className="media-empty">Add at least one image or video.</p>
        )}
      </section>

      <footer>
        <button
          className="btn btn-secondary"
          disabled={saving}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={saving}
          onClick={() => void save()}
          type="button"
        >
          {saving ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Save size={15} />
          )}
          Save changes
        </button>
        {message ? <span className="submit-state">{message}</span> : null}
      </footer>
    </section>
  )
}

type MediaCardInteractionProps = {
  cover: boolean
  disabled?: boolean
  dragging?: boolean
  dropTarget?: boolean
  index?: number
  mediaKey: string
  onCover: () => void
  onDragEnd?: () => void
  onDragOver?: (event: DragEvent<HTMLElement>) => void
  onDragStart?: (event: DragEvent<HTMLElement>) => void
  onDrop?: (event: DragEvent<HTMLElement>) => void
  onMoveBackward?: () => void
  onMoveForward?: () => void
  onRemove: () => void
  total?: number
}

function ExistingMediaPreview({
  media,
  ...cardProps
}: MediaCardInteractionProps & {
  media: ProjectMedia
}) {
  return (
    <MediaCard
      {...cardProps}
      kind={media.kind}
      name={media.name}
      src={media.url}
    />
  )
}

function MediaDropzone({
  active,
  disabled,
  onFiles,
}: {
  active: boolean
  disabled: boolean
  onFiles: (files: FileList | null) => void
}) {
  return (
    <label
      className={`media-dropzone${active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <span className="media-dropzone__icon">
        {active ? <Upload size={20} /> : <ImagePlus size={20} />}
      </span>
      <span className="media-dropzone__copy">
        <strong>
          {active ? 'Drop to add media' : 'Drop images or video here'}
        </strong>
        <span>
          {disabled
            ? 'Media limit reached'
            : `or browse files · up to ${appConfig.media.maxFilesPerProject} per project`}
        </span>
      </span>
      <span className="media-dropzone__action">Browse</span>
      <input
        accept={appConfig.media.allowedContentTypes.join(',')}
        disabled={disabled}
        multiple
        onChange={(event) => {
          onFiles(event.currentTarget.files)
          event.currentTarget.value = ''
        }}
        type="file"
      />
    </label>
  )
}

function ArtifactInput({
  accept,
  icon,
  label,
  value,
  onChange,
}: {
  accept: string
  icon: ReactNode
  label: string
  value?: string
  onChange: (file: File | null) => void
}) {
  return (
    <label className="file-upload">
      <span className="file-upload-icon">{icon}</span>
      <span className="file-upload-copy">
        <strong>{label}</strong>
        <span>{value ?? `Choose generated ${label}`}</span>
      </span>
      <input
        accept={accept}
        onChange={(event) => onChange(event.currentTarget.files?.[0] ?? null)}
        type="file"
      />
    </label>
  )
}

function parseProjectLinks(value: string): Array<ProjectLink> {
  const kinds = new Set<ProjectLink['kind']>([
    'demo',
    'repo',
    'video',
    'image',
    'article',
  ])

  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [label, url, rawKind = 'article'] = line
        .split('|')
        .map((item) => item.trim())
      if (!label || !url) {
        throw new Error(`Link ${index + 1} needs a label and URL.`)
      }
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        throw new Error(`Link ${index + 1} has an invalid URL.`)
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Link ${index + 1} must use http or https.`)
      }
      const kind = rawKind.toLowerCase() as ProjectLink['kind']
      if (!kinds.has(kind)) {
        throw new Error(
          `Link ${index + 1} kind must be demo, repo, video, image, or article.`,
        )
      }
      return { label, url: parsed.toString(), kind }
    })
}

function MediaPreview({
  file,
  ...cardProps
}: MediaCardInteractionProps & {
  file: File
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => {
    return () => URL.revokeObjectURL(url)
  }, [url])

  return (
    <MediaCard
      {...cardProps}
      kind={file.type.startsWith('video/') ? 'video' : 'image'}
      name={file.name}
      src={url}
    />
  )
}

function MediaCard({
  cover,
  disabled = false,
  dragging = false,
  dropTarget = false,
  index,
  kind,
  mediaKey,
  name,
  onCover,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onMoveBackward,
  onMoveForward,
  onRemove,
  src,
  total,
}: MediaCardInteractionProps & {
  kind: ProjectMedia['kind']
  name: string
  src: string
}) {
  const reorderable = index !== undefined && total !== undefined
  const classes = [
    'media-preview-card',
    cover ? 'is-cover' : '',
    dragging ? 'is-dragging' : '',
    dropTarget ? 'is-drop-target' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      aria-label={`${name}${cover ? ', project cover' : ''}`}
      className={classes}
      data-media-key={mediaKey}
      draggable={Boolean(onDragStart) && !disabled}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div className="media-preview-card__visual">
        {kind === 'video' ? (
          <video muted playsInline src={src} />
        ) : (
          // These previews can be blob URLs as well as authenticated Worker
          // routes, so render the source directly instead of asking a CSS
          // background to size an otherwise empty grid item.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" draggable={false} loading="lazy" src={src} />
        )}
      </div>

      <div className="media-preview-card__toolbar">
        {reorderable ? (
          <>
            <span aria-hidden="true" className="media-drag-handle">
              <GripVertical size={15} />
            </span>
            <button
              aria-label={`Move ${name} backward`}
              disabled={disabled || index === 0}
              onClick={onMoveBackward}
              type="button"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              aria-label={`Move ${name} forward`}
              disabled={disabled || index === total - 1}
              onClick={onMoveForward}
              type="button"
            >
              <ArrowRight size={14} />
            </button>
          </>
        ) : null}
        <button
          aria-label={`Remove ${name}`}
          className="media-remove"
          disabled={disabled}
          onClick={onRemove}
          type="button"
        >
          <X size={14} />
        </button>
      </div>

      <div className="media-preview-card__footer">
        <span className="media-name" title={name}>
          {kind === 'video' ? <Play size={12} /> : null}
          {name}
        </span>
        <button
          className="media-cover"
          disabled={disabled}
          onClick={onCover}
          type="button"
        >
          {cover ? <Check size={13} /> : null}
          {cover ? 'Cover' : 'Set cover'}
        </button>
      </div>
    </article>
  )
}

function hasFiles(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes('Files')
}

function fileIdentity(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function formatTokens(value?: number) {
  return value === undefined
    ? 'Unavailable'
    : new Intl.NumberFormat().format(value)
}

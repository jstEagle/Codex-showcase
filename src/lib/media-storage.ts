import { getCloudflareContext } from '@opennextjs/cloudflare'
import { inArray } from 'drizzle-orm'

import { appConfig } from '../config/app'
import { projectMedia } from '../db/schema'
import type { ProjectMedia } from '../projects'
import { getDatabase } from './db'

export type PendingMediaFile = {
  name: string
  contentType: string
  size: number
  cover?: boolean
}

export function validatePendingMedia(
  files: Array<PendingMediaFile>,
  { requireCover = true }: { requireCover?: boolean } = {},
) {
  if (files.length > appConfig.media.maxFilesPerProject) {
    throw new Error(
      `Upload at most ${appConfig.media.maxFilesPerProject} media files.`,
    )
  }

  let coverCount = 0
  for (const file of files) {
    if (!appConfig.media.allowedContentTypes.includes(file.contentType)) {
      throw new Error(`Unsupported media type: ${file.contentType}`)
    }

    const limit = file.contentType.startsWith('video/')
      ? appConfig.media.maxVideoBytes
      : appConfig.media.maxImageBytes

    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > limit) {
      throw new Error(
        `${file.name} exceeds the ${formatBytes(limit)} upload limit.`,
      )
    }

    if (file.cover) coverCount += 1
  }

  if (requireCover && files.length > 0 && coverCount !== 1) {
    throw new Error('Choose exactly one cover image or video.')
  }
}

export async function uploadMediaObject({
  clerkUserId,
  file,
  body,
}: {
  clerkUserId: string
  file: PendingMediaFile
  body: ReadableStream
}) {
  validatePendingMedia([file], { requireCover: false })
  const id = crypto.randomUUID()
  const objectKey = `projects/${safeSegment(clerkUserId)}/${crypto.randomUUID()}/${id}-${safeFilename(file.name)}`
  const bytes = await new Response(body).arrayBuffer()
  if (bytes.byteLength !== file.size) {
    throw new Error(`${file.name} did not match its declared upload size.`)
  }
  await getMediaBucket().put(objectKey, bytes, {
    httpMetadata: { contentType: file.contentType },
    customMetadata: {
      owner: safeSegment(clerkUserId),
      originalName: file.name.slice(0, 512),
    },
  })

  return {
    id,
    objectKey,
    url: privateMediaUrl(objectKey),
    name: file.name,
    contentType: file.contentType,
    size: file.size,
    kind: file.contentType.startsWith('video/')
      ? ('video' as const)
      : ('image' as const),
    cover: Boolean(file.cover),
  }
}

export async function verifyUploadedMedia({
  clerkUserId,
  media,
}: {
  clerkUserId: string
  media: Array<ProjectMedia>
}) {
  if (media.length === 0) return []

  validatePendingMedia(media)
  const expectedPrefix = `projects/${safeSegment(clerkUserId)}/`

  return Promise.all(
    media.map(async (item) => {
      if (!item.objectKey.startsWith(expectedPrefix)) {
        throw new Error('A media object is not owned by this ambassador.')
      }

      const object = await getMediaBucket().head(item.objectKey)
      if (
        !object ||
        object.size !== item.size ||
        object.httpMetadata?.contentType !== item.contentType
      ) {
        throw new Error(`${item.name} did not match its upload manifest.`)
      }

      return { ...item, url: privateMediaUrl(item.objectKey) }
    }),
  )
}

export function getMediaBucket() {
  return getCloudflareContext().env.MEDIA_BUCKET
}

export async function deleteOwnedMedia({
  clerkUserId,
  objectKeys,
}: {
  clerkUserId: string
  objectKeys: Array<string>
}) {
  const prefix = `projects/${safeSegment(clerkUserId)}/`
  const ownedKeys = [...new Set(objectKeys)].filter((key) =>
    key.startsWith(prefix),
  )
  if (ownedKeys.length === 0) return

  const linkedRows = await getDatabase()
    .select({ objectKey: projectMedia.objectKey })
    .from(projectMedia)
    .where(inArray(projectMedia.objectKey, ownedKeys))
  const linkedKeys = new Set(linkedRows.map((row) => row.objectKey))
  const unlinkedKeys = ownedKeys.filter((key) => !linkedKeys.has(key))
  if (unlinkedKeys.length > 0) await getMediaBucket().delete(unlinkedKeys)
}

function privateMediaUrl(objectKey: string) {
  return `/api/media?key=${encodeURIComponent(objectKey)}`
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function safeFilename(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
  return normalized || 'media'
}

function formatBytes(value: number) {
  return `${Math.round(value / 1024 / 1024)} MB`
}

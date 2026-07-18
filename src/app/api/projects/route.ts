import { NextResponse } from 'next/server'

import { getAmbassadorIdentity } from '../../../lib/ambassador-auth'
import { verifyUploadedMedia } from '../../../lib/media-storage'
import {
  listProjectsPage,
  publishAmbassadorProject,
  type ProjectArtifact,
} from '../../../lib/project-data'
import type { ProjectMedia } from '../../../projects'

type PublishPayload = {
  artifact: ProjectArtifact
  projectMarkdown: string
  media: Array<ProjectMedia>
  privacyConfirmed: boolean
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Number(url.searchParams.get('limit'))
  const page = await listProjectsPage({
    cursor: url.searchParams.get('cursor'),
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    queryText: url.searchParams.get('q') ?? undefined,
  })

  return NextResponse.json(page, {
    headers: {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
      'Cloudflare-CDN-Cache-Control':
        'public, max-age=60, stale-while-revalidate=300',
    },
  })
}

export async function POST(request: Request) {
  try {
    const ambassador = await getAmbassadorIdentity()
    if (!ambassador.identity) {
      return NextResponse.json(
        { error: ambassador.error },
        { status: ambassador.status },
      )
    }

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Upload project.json and project.md.' },
        { status: 400 },
      )
    }

    const payload = await payloadFromFiles(request)
    const media = await verifyUploadedMedia({
      clerkUserId: ambassador.identity.clerkUserId,
      media: payload.media,
    })
    const result = await publishAmbassadorProject({
      artifact: payload.artifact,
      projectMarkdown: payload.projectMarkdown,
      media,
      privacyConfirmed: payload.privacyConfirmed,
      ownerName: ambassador.identity.name,
      ownerEmail: ambassador.identity.email,
      clerkUserId: ambassador.identity.clerkUserId,
    })

    return NextResponse.json(
      { id: result.id, project: result.project, published: true },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publication failed' },
      { status: 400 },
    )
  }
}

async function payloadFromFiles(request: Request): Promise<PublishPayload> {
  const formData = await request.formData()
  const projectJson = formData.get('projectJson')
  const projectMarkdown = formData.get('projectMarkdown')
  const mediaManifest = formData.get('media')
  const privacyConfirmed = formData.get('privacyConfirmed') === 'true'

  if (!(projectJson instanceof File) || !(projectMarkdown instanceof File)) {
    throw new Error('Upload project.json and project.md.')
  }
  if (projectJson.name !== 'project.json') {
    throw new Error('The JSON artifact must be named project.json.')
  }
  if (projectMarkdown.name !== 'project.md') {
    throw new Error('The Markdown draft must be named project.md.')
  }
  if (projectJson.size > 50 * 1024 * 1024) {
    throw new Error('project.json exceeds the 50 MB limit.')
  }
  if (projectMarkdown.size > 10 * 1024 * 1024) {
    throw new Error('project.md exceeds the 10 MB limit.')
  }
  if (typeof mediaManifest !== 'string') {
    throw new Error('Missing uploaded media manifest.')
  }

  const artifact = JSON.parse(await projectJson.text()) as ProjectArtifact
  const media = JSON.parse(mediaManifest) as Array<ProjectMedia>
  if (!Array.isArray(media)) {
    throw new Error('Invalid uploaded media manifest.')
  }

  return {
    artifact,
    projectMarkdown: await projectMarkdown.text(),
    media,
    privacyConfirmed,
  }
}

import { NextResponse } from 'next/server'

import { getAmbassadorIdentity } from '../../../../lib/ambassador-auth'
import {
  deleteOwnedMedia,
  verifyUploadedMedia,
} from '../../../../lib/media-storage'
import {
  getProject,
  setProjectPublished,
  updateAmbassadorProject,
  type AmbassadorProjectUpdate,
} from '../../../../lib/project-data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const project = await getProject(slug)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ project })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const ambassador = await getAmbassadorIdentity()
    if (!ambassador.identity) {
      return NextResponse.json(
        { error: ambassador.error },
        { status: ambassador.status },
      )
    }

    const { slug } = await params
    const body = (await request.json()) as Partial<AmbassadorProjectUpdate> & {
      published?: unknown
    }

    if (Object.hasOwn(body, 'published')) {
      if (typeof body.published !== 'boolean') {
        return NextResponse.json(
          { error: 'published must be a boolean.' },
          { status: 400 },
        )
      }
      const project = await setProjectPublished({
        clerkUserId: ambassador.identity.clerkUserId,
        slug,
        published: body.published,
      })
      return NextResponse.json({ project })
    }

    if (!Array.isArray(body.media)) {
      return NextResponse.json(
        { error: 'Send the complete project media manifest.' },
        { status: 400 },
      )
    }
    const update = body as AmbassadorProjectUpdate
    const media = await verifyUploadedMedia({
      clerkUserId: ambassador.identity.clerkUserId,
      media: update.media,
    })
    const result = await updateAmbassadorProject({
      clerkUserId: ambassador.identity.clerkUserId,
      slug,
      update: { ...update, media },
    })
    try {
      await deleteOwnedMedia({
        clerkUserId: ambassador.identity.clerkUserId,
        objectKeys: result.removedObjectKeys,
      })
    } catch (error) {
      console.error('[project-edit] stale media cleanup failed', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return NextResponse.json({ project: result.project })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 400 },
    )
  }
}

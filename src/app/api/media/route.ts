import { NextResponse } from 'next/server'

import { appConfig } from '../../../config/app'
import { getAmbassadorIdentity } from '../../../lib/ambassador-auth'
import {
  deleteOwnedMedia,
  getMediaBucket,
  uploadMediaObject,
} from '../../../lib/media-storage'
import {
  isOwnedMediaObject,
  isPublishedMediaObject,
} from '../../../lib/project-data'

export async function GET(request: Request) {
  const objectKey = new URL(request.url).searchParams.get('key')
  if (!objectKey) {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
  }

  let canRead = await isPublishedMediaObject(objectKey)
  if (!canRead) {
    const ambassador = await getAmbassadorIdentity()
    canRead = Boolean(
      ambassador.identity &&
      (await isOwnedMediaObject({
        clerkUserId: ambassador.identity.clerkUserId,
        objectKey,
      })),
    )
  }
  if (!canRead) {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
  }

  const localDevelopmentResponse = await proxyPublishedMediaInDevelopment({
    request,
    objectKey,
  })
  if (localDevelopmentResponse) return localDevelopmentResponse

  const bucket = getMediaBucket()
  const metadata = await bucket.head(objectKey)
  if (!metadata) {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
  }

  const rangeHeader = request.headers.get('range')
  const range = rangeHeader ? parseRange(rangeHeader, metadata.size) : null
  if (rangeHeader && !range) return new NextResponse(null, { status: 416 })

  const object = await bucket.get(
    objectKey,
    range ? { range: { offset: range.start, length: range.length } } : {},
  )
  if (!object) {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
  }

  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    ETag: object.httpEtag,
  })
  object.writeHttpMetadata(headers)

  if (range) {
    headers.set('Content-Length', String(range.length))
    headers.set(
      'Content-Range',
      `bytes ${range.start}-${range.end}/${metadata.size}`,
    )
  } else {
    headers.set('Content-Length', String(metadata.size))
  }

  return new Response(object.body, {
    status: range ? 206 : 200,
    headers,
  })
}

async function proxyPublishedMediaInDevelopment({
  request,
  objectKey,
}: {
  request: Request
  objectKey: string
}) {
  const requestUrl = new URL(request.url)
  if (!['localhost', '127.0.0.1'].includes(requestUrl.hostname)) return null

  const upstreamUrl = new URL('/api/media', appConfig.baseUrl)
  upstreamUrl.searchParams.set('key', objectKey)
  const range = request.headers.get('range')
  const upstream = await fetch(upstreamUrl, {
    cache: 'no-store',
    headers: range ? { Range: range } : undefined,
  })
  const headers = new Headers(upstream.headers)
  headers.delete('set-cookie')
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
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

    const encodedName = request.headers.get('x-file-name')
    const contentType = request.headers.get('content-type') ?? ''
    const size = Number(request.headers.get('x-file-size'))
    if (!encodedName || !request.body) {
      return NextResponse.json(
        { error: 'Send a media file body and metadata.' },
        { status: 400 },
      )
    }

    const media = await uploadMediaObject({
      clerkUserId: ambassador.identity.clerkUserId,
      file: {
        name: decodeURIComponent(encodedName),
        contentType,
        size,
        cover: request.headers.get('x-file-cover') === 'true',
      },
      body: request.body,
    })
    return NextResponse.json({ media }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const ambassador = await getAmbassadorIdentity()
    if (!ambassador.identity) {
      return NextResponse.json(
        { error: ambassador.error },
        { status: ambassador.status },
      )
    }

    const body = (await request.json()) as { objectKeys?: Array<string> }
    if (!Array.isArray(body.objectKeys)) {
      return NextResponse.json(
        { error: 'Send objectKeys to remove.' },
        { status: 400 },
      )
    }

    await deleteOwnedMedia({
      clerkUserId: ambassador.identity.clerkUserId,
      objectKeys: body.objectKeys,
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 400 },
    )
  }
}

function parseRange(value: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value)
  if (!match || (!match[1] && !match[2])) return null

  let start = match[1] ? Number(match[1]) : NaN
  let end = match[2] ? Number(match[2]) : size - 1
  if (Number.isNaN(start)) {
    const suffixLength = Number(match[2])
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null
    start = Math.max(0, size - suffixLength)
    end = size - 1
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (start < 0 || start >= size || end < start) return null
  end = Math.min(end, size - 1)

  return { start, end, length: end - start + 1 }
}

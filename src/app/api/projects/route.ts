import { NextResponse } from 'next/server'

import {
  listProjects,
  publishProjectArtifact,
  type ProjectArtifact,
} from '../../../lib/project-data'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const projects = await listProjects(url.searchParams.get('q') ?? undefined)

  return NextResponse.json({ projects })
}

export async function POST(request: Request) {
  const adminToken = process.env.CODEX_SHOWCASE_ADMIN_TOKEN
  const suppliedToken = request.headers.get('x-codex-showcase-admin-token')

  if (!adminToken || suppliedToken !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const artifact = (await request.json()) as ProjectArtifact
    const project = await publishProjectArtifact(artifact)

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 400 },
    )
  }
}

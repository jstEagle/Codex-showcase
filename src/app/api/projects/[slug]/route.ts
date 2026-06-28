import { NextResponse } from 'next/server'

import { getProject } from '../../../../lib/project-data'

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

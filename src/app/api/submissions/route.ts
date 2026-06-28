import { NextResponse } from 'next/server'

import {
  submitProjectArtifact,
  type ProjectArtifact,
} from '../../../lib/project-data'

type SubmissionPayload = {
  artifact?: ProjectArtifact
  submitterName?: string
  submitterContact?: string
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SubmissionPayload

    if (!payload.artifact) {
      return NextResponse.json(
        { error: 'Missing artifact payload' },
        { status: 400 },
      )
    }

    const id = await submitProjectArtifact({
      artifact: payload.artifact,
      submitterName: payload.submitterName,
      submitterContact: payload.submitterContact,
    })

    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Submission failed' },
      { status: 400 },
    )
  }
}

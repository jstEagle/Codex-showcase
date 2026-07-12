import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createRedactor,
  parseSessionFile,
  summarizeThreads,
} from '../lib/codex-exporter.mjs'

test('extracts task prompts, final responses, duration, and token deltas', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'codex-showcase-'))
  const projectDir = path.join(directory, 'project')
  const file = path.join(directory, 'session.jsonl')
  const entries = [
    {
      timestamp: '2026-07-11T00:00:00.000Z',
      type: 'session_meta',
      payload: { id: 'thread-1', cwd: projectDir },
    },
    {
      timestamp: '2026-07-11T00:00:00.000Z',
      type: 'event_msg',
      payload: {
        type: 'task_started',
        turn_id: 'turn-1',
        started_at: 1_783_728_000,
      },
    },
    {
      timestamp: '2026-07-11T00:00:01.000Z',
      type: 'event_msg',
      payload: { type: 'user_message', message: 'Build the project.' },
    },
    {
      timestamp: '2026-07-11T00:00:20.000Z',
      type: 'event_msg',
      payload: {
        type: 'token_count',
        info: {
          total_token_usage: {
            input_tokens: 120,
            cached_input_tokens: 40,
            output_tokens: 30,
            reasoning_output_tokens: 10,
            total_tokens: 150,
          },
        },
      },
    },
    {
      timestamp: '2026-07-11T00:00:30.000Z',
      type: 'event_msg',
      payload: {
        type: 'task_complete',
        turn_id: 'turn-1',
        last_agent_message: 'Built and verified it.',
        completed_at: 1_783_728_030,
        duration_ms: 30_000,
      },
    },
  ]
  await writeFile(
    file,
    entries.map((entry) => JSON.stringify(entry)).join('\n'),
  )

  try {
    const thread = await parseSessionFile(file, projectDir)
    assert.ok(thread)
    assert.equal(thread.turns.length, 1)
    assert.equal(thread.turns[0].user, 'Build the project.')
    assert.equal(thread.turns[0].codex, 'Built and verified it.')
    assert.equal(thread.turns[0].durationMs, 30_000)
    assert.equal(thread.turns[0].tokens.totalTokens, 150)
    const metrics = summarizeThreads([thread])
    assert.equal(metrics.activeDurationMs, 30_000)
    assert.equal(metrics.tokens.totalTokens, 150)
    assert.equal(metrics.tokenCountSource, 'recorded')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('counts redactions without exposing matched values', () => {
  const redactor = createRedactor([
    {
      name: 'email',
      pattern: '\\b[^\\s@]+@[^\\s@]+\\.[^\\s@]+\\b',
      flags: 'g',
      replacement: '[redacted-email]',
    },
  ])

  assert.equal(
    redactor.scrub('Email private@example.com'),
    'Email [redacted-email]',
  )
  assert.deepEqual(redactor.report().rules, [{ name: 'email', matches: 1 }])
})

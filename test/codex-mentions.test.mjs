import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatConversationTitle,
  parsePromptMentions,
} from '../src/lib/codex-mentions.ts'

test('extracts a leading skill mention and cleans the remaining prompt', () => {
  const raw =
    '[$quiz-me](/Users/[redacted-user]/.codex/skills/quiz-me/SKILL.md) \nI want to create in this Monero repo a full backtesting engine.'

  const { text, mentions } = parsePromptMentions(raw)

  assert.deepEqual(mentions, [{ type: 'skill', name: 'quiz-me' }])
  assert.equal(
    text,
    'I want to create in this Monero repo a full backtesting engine.',
  )
})

test('extracts an inline skill mention without leaving double spaces', () => {
  const raw =
    'Use [$brand](/Users/[redacted-user]/.codex/skills/brand/SKILL.md) and craete me a claude design prompt.'

  const { text, mentions } = parsePromptMentions(raw)

  assert.deepEqual(mentions, [{ type: 'skill', name: 'brand' }])
  assert.equal(text, 'Use brand and craete me a claude design prompt.')
})

test('extracts a plugin mention', () => {
  const raw =
    'Use [@Helium](plugin://computer-use@openai-bundled?app=net.imput.helium) to inspect the dashboard.'

  const { text, mentions } = parsePromptMentions(raw)

  assert.deepEqual(mentions, [{ type: 'plugin', name: 'Helium' }])
  assert.equal(text, 'Use Helium to inspect the dashboard.')
})

test('extracts both a skill and a plugin mention from the same prompt', () => {
  const raw =
    'Use [@gmail](plugin://gmail@openai-curated-remote) to send the [$brand](/Users/[redacted-user]/.codex/skills/brand/SKILL.md) skill to a teammate.'

  const { text, mentions } = parsePromptMentions(raw)

  assert.deepEqual(mentions, [
    { type: 'plugin', name: 'gmail' },
    { type: 'skill', name: 'brand' },
  ])
  assert.equal(text, 'Use gmail to send the brand skill to a teammate.')
})

test('deduplicates repeated mentions of the same skill', () => {
  const raw =
    '[$brand](/Users/[redacted-user]/.codex/skills/brand/SKILL.md) use [$brand](/Users/[redacted-user]/.codex/skills/brand/SKILL.md) again.'

  const { mentions } = parsePromptMentions(raw)

  assert.deepEqual(mentions, [{ type: 'skill', name: 'brand' }])
})

test('supports plugin-provided skills with namespaced names', () => {
  const raw =
    '[$browser:browser](/Users/[redacted-user]/.codex/plugins/cache/openai-bundled/browser/0.1.0-alpha2/skills/browser/SKILL.md) open the app.'

  const { text, mentions } = parsePromptMentions(raw)

  assert.deepEqual(mentions, [{ type: 'skill', name: 'browser:browser' }])
  assert.equal(text, 'open the app.')
})

test('leaves plain text without mention syntax untouched', () => {
  const raw = 'Ship the feature and open a PR.'

  const result = parsePromptMentions(raw)

  assert.deepEqual(result, { text: raw, mentions: [] })
})

test('ignores markdown links that are not skill or plugin mentions', () => {
  const raw = 'See [$not-a-skill](https://example.com/readme) for context.'

  const result = parsePromptMentions(raw)

  assert.deepEqual(result, { text: raw, mentions: [] })
})

test('uses the cleaned first prompt for legacy titles cut off inside a skill path', () => {
  const title = '[$quiz-me](/Users/[redacted-user]/'
  const prompt =
    '[$quiz-me](/Users/[redacted-user]/.codex/skills/quiz-me/SKILL.md) Build a modular backtesting engine. It should be fast.'

  assert.equal(
    formatConversationTitle(title, prompt),
    'Build a modular backtesting engine',
  )
})

test('leaves ordinary thread titles unchanged', () => {
  assert.equal(
    formatConversationTitle('Production launch', 'Ship it.'),
    'Production launch',
  )
})

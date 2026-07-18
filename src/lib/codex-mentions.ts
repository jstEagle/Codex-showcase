export type ConversationMentionType = 'skill' | 'plugin'

export type ConversationMention = {
  type: ConversationMentionType
  name: string
}

export type ParsedPrompt = {
  text: string
  mentions: Array<ConversationMention>
}

/**
 * Codex CLI expands `$skill-name` and `@plugin-name` mentions into markdown
 * links before they land in the transcript, e.g.
 * `[$quiz-me](/Users/me/.codex/skills/quiz-me/SKILL.md)` or
 * `[@gmail](plugin://gmail@openai-curated-remote)`. Exported prompts still
 * carry that raw syntax, so it needs to be recognized and rendered as a
 * mention chip instead of literal markdown.
 */
const MENTION_PATTERN = /\[(\$|@)([^\]]+)\]\(([^)]+)\)/g
const LEADING_MENTION_PATTERN = /^\s*\[(\$|@)([^\]]+)\]\(([^)]+)\)\s*/

export function parsePromptMentions(rawText: string): ParsedPrompt {
  const mentions: Array<ConversationMention> = []
  const seen = new Set<string>()

  for (const match of rawText.matchAll(MENTION_PATTERN)) {
    const [, sigil, name, ref] = match
    const type = classifyMention(sigil, ref)
    if (!type) continue

    const trimmedName = name.trim()
    const key = `${type}:${trimmedName}`
    if (!seen.has(key)) {
      seen.add(key)
      mentions.push({ type, name: trimmedName })
    }
  }

  if (mentions.length === 0) {
    return { text: rawText, mentions: [] }
  }

  let stripped = rawText
  while (true) {
    const match = stripped.match(LEADING_MENTION_PATTERN)
    if (!match || !classifyMention(match[1], match[3])) break
    stripped = stripped.slice(match[0].length)
  }

  const text = stripped
    .replace(
      MENTION_PATTERN,
      (match, sigil: string, name: string, ref: string) =>
        classifyMention(sigil, ref) ? name.trim() : match,
    )
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { text, mentions }
}

export function formatConversationTitle(title: string, firstPrompt: string) {
  if (!/^\s*\[(?:\$|@)/.test(title)) return title

  const prompt = parsePromptMentions(firstPrompt)
  const source =
    prompt.text || prompt.mentions.map(({ name }) => name).join(' + ')
  const sentence = source.split(/[.!?\n]/)[0]?.trim() || source

  return sentence.length > 80 ? `${sentence.slice(0, 77).trim()}...` : sentence
}

function classifyMention(
  sigil: string,
  ref: string,
): ConversationMentionType | null {
  if (sigil === '$' && /SKILL\.md(?:[?#].*)?$/i.test(ref)) return 'skill'
  if (sigil === '@' && /^plugin:\/\//i.test(ref)) return 'plugin'
  return null
}

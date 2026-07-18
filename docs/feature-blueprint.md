# Codex Ambassador Showcase Feature Blueprint

## Product

Codex Ambassador Showcase makes projects built with Codex inspectable. An ambassador publishes a short project write-up and media, while visitors can optionally open the cleaned build conversation to study the prompts and final Codex responses.

The product is deliberately split into three surfaces:

1. A local exporter and Codex skill.
2. An allowlisted ambassador publishing portal.
3. A public infinite canvas and project reader.

The complete product decisions are maintained in [`../quiz-me-codex-ambassador-showcase.md`](../quiz-me-codex-ambassador-showcase.md).

## Exporter

The exporter is pointed at a local Codex project directory. It scans both active and archived Codex sessions and includes every session whose recorded `cwd` or workspace root belongs to that project.

For modern Codex session files, each published turn comes from:

- `task_started` for turn identity and start time.
- `user_message` for the ambassador prompt.
- `token_count` for cumulative recorded token usage.
- `task_complete` for exact duration and the final agent message.

Response messages provide a compatibility fallback for older sessions. Commentary, reasoning items, custom tool calls, tool output, and command logs are not copied into the artifact.

The exporter calculates:

- Per-turn active duration.
- Per-turn token delta.
- Thread and project totals.
- Project wall-clock span.
- Project summed active Codex time.
- Whether token coverage is recorded, partial, or unavailable.

Redaction rules run locally. The report records only rule names and match counts, never the matched secret value. Human review remains mandatory because regex cannot detect contextual private information.

## Artifact Contract

Exports use the single canonical `codex-showcase-project` schema.

```json
{
  "schema": "codex-showcase-project",
  "exportedAt": "2026-07-11T00:00:00.000Z",
  "source": {
    "projectDir": "/Users/[redacted-user]/project",
    "threadCount": 4
  },
  "project": {
    "title": "Project title",
    "description": "Short public description",
    "author": "Ambassador",
    "maker": "Ambassador",
    "category": "Web app",
    "cardAnimation": "liquid",
    "stack": ["Next.js"],
    "links": []
  },
  "post": {
    "title": "Project title",
    "body": ["Short public write-up paragraph."]
  },
  "metrics": {
    "threadCount": 4,
    "turnCount": 18,
    "wallClockDurationMs": 86400000,
    "activeDurationMs": 5400000,
    "tokens": {
      "inputTokens": 1200000,
      "cachedInputTokens": 900000,
      "outputTokens": 30000,
      "reasoningOutputTokens": 12000,
      "totalTokens": 1230000
    },
    "tokenCountSource": "recorded"
  },
  "redaction": {
    "totalMatches": 3,
    "rules": [{ "name": "email", "matches": 1 }],
    "warnings": ["Human review is required."]
  },
  "privacyReview": { "required": true },
  "threads": [
    {
      "id": "thread-id",
      "title": "Build the feature",
      "turns": [
        {
          "id": "turn-id",
          "user": "Build the feature.",
          "codex": "Built and verified the feature.",
          "requestedAt": "2026-07-11T00:00:00.000Z",
          "completedAt": "2026-07-11T00:03:00.000Z",
          "durationMs": 180000,
          "workedFor": "worked for 3 minutes",
          "tokens": { "totalTokens": 42000 }
        }
      ]
    }
  ]
}
```

`project.md` contains the write-up only. The complete conversation belongs in the structured JSON artifact.

## Ambassador Publishing

Clerk handles Google sign-in. A signed-in account must also have a matching primary email in the Cloudflare D1 `allowed_users` table. The dashboard and every project/media mutation query that table through Drizzle on the server; authorization is not delegated solely to the Next.js proxy.

Production uses `https://codexshowcase.dev` as the canonical application URL.

The portal requires:

- `project.json`.
- `project.md`.
- A project-specific generated cover image when the companion Codex skill is used.
- At least one image or video.
- Exactly one selected cover.
- Explicit confirmation that the ambassador reviewed every exported thread.

After validation, media is streamed through an authenticated same-origin Worker route into private Cloudflare R2. Before publication, the server verifies object existence, size, content type, and ownership prefix. Published media is read through the same Worker route, which checks through Drizzle that the object belongs to a published project before streaming it from R2; the bucket itself has no public URL.

The project publishes immediately. Its Clerk owner can later edit its metadata, write-up, cover, and media or unpublish and republish it. Editing preserves the canonical slug, verifies the complete media manifest against the owner, updates D1 through Drizzle, and removes only R2 objects no longer linked to a project. An ambassador cannot overwrite a slug owned by another ambassador.

## Data And Storage

Cloudflare D1, accessed exclusively through Drizzle ORM, stores:

- Public listing metadata.
- The Markdown write-up.
- The structured project artifact.
- Build statistics and story excerpts.
- Media manifests and public URLs.
- Clerk ownership and publication state.

Cloudflare R2 stores image and video binaries. A native Worker binding provides private access; no R2 custom domain, public development URL, CORS policy, or browser-facing R2 credential is used.

## Public Gallery

The gallery is a finite DOM tile pool over an unbounded logical coordinate space. Camera movement recycles visible cells instead of continuously adding nodes.

Project data is separate from tile recycling:

- The server returns opaque cursor pages.
- The first page is server-rendered.
- TanStack Query keeps all loaded pages in memory.
- The canvas calculates the highest logical project ordinal inside its overscan range.
- When that ordinal approaches the number of loaded projects, the next cursor page is requested.
- The prefetch distance is large enough that users continue seeing populated cards while the request resolves.
- Once the finite published catalog is exhausted, stable logical cells can reuse the loaded catalog without further requests.

Cards prefetch their canonical project URL on hover or focus and display the uploaded cover image. Gallery cards do not run shader or text-animation work in the background. Once a project is open, one hero-local WebGL2 layer samples the cover luminance into small white `-`, `>`, and `o` glyphs and reveals a short trail only while a mouse or pen is actively dragged across the image. The renderer sleeps when the trail is empty, ignores touch input so native scrolling remains stable, leaves the photograph intact after context loss, and is omitted for reduced-motion users.

Selecting a card updates the browser to `/projects/:slug` without discarding the canvas. The card interpolates from its canvas position into the responsive rounded hero rectangle while every other card fades away. A GSAP timeline reveals a deterministic ASCII-decoded title, four project statistics, and the short brief. The same scrollable surface contains the write-up, uploaded media, project links, and Codex chat history. Returning reverses the same spatial transition, restores focus to the original card, and returns the URL to `/`. A direct visit to the project URL opens this same focused view immediately. Reduced-motion users receive the same layout without tweened motion.

## Focused Project View

The overview includes:

- Uploaded images and playable video.
- Sanitized Markdown rendered without raw executable HTML.
- Repository, demo, and article links.
- Thread and prompt counts.
- Wall-clock build span.
- Summed active Codex time.
- Recorded token usage.

The build-history tab uses a familiar ChatGPT/Codex chat rhythm. Each thread remains separate and chronological. Every turn shows the user prompt, final Codex response, active duration, and token count when available.

## Security Invariants

- Public routes return published projects only.
- Protected mutations authenticate and authorize inside the route handler.
- Project updates require matching Clerk ownership.
- Allowlisted publishing does not weaken the explicit privacy-review requirement.
- The canonical artifact schema and required fields are validated server-side.
- Upload object keys are generated by the server.
- Presigned URLs are short-lived bearer credentials.
- Media size and content type are checked before and after the Worker-mediated upload.
- Markdown is rendered as Markdown, not trusted raw HTML.
- Secrets remain in Cloudflare Worker secrets; non-secret configuration remains checked in.

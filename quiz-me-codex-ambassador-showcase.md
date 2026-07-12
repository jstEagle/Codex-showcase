# Codex Ambassador Showcase

## Current Concept

Codex Ambassador Showcase is a public, visual gallery of real projects built with Codex. Ambassadors export a privacy-scrubbed record of a local Codex project, add a short editorial write-up and media, then publish it as an explorable project card. Visitors can read the project story and inspect the prompts and final Codex responses that produced it.

The product has three connected pieces:

1. A local CLI and Codex skill that turn a Codex project into portable showcase artifacts.
2. An authenticated ambassador upload flow for the artifacts and project media.
3. A public infinite-canvas gallery and project reader.

## Target Audience

- Codex ambassadors who want a polished way to show what they built and how they built it.
- Codex users looking for useful prompts, workflows, and realistic examples.
- People evaluating Codex who want inspectable evidence rather than generic testimonials.
- OpenAI/community teams looking for a curated body of ambassador work.

## Goals

- Make the build process as interesting and inspectable as the finished project.
- Let an ambassador produce a safe submission from any local Codex project with one guided command.
- Preserve project/thread boundaries and the chronological conversation structure.
- Publish user prompts and final Codex responses without raw tool calls, command output, hidden reasoning, or intermediate work.
- Automatically redact common sensitive values before anything leaves the ambassador's computer.
- Show build duration and token usage at project and thread level when the source data supports it.
- Make public discovery visual, fast, playful, and recognizably Codex-adjacent.

## Non-Goals

- Replaying every internal event from a Codex run.
- Publishing hidden reasoning, tool payloads, terminal output, or local workspace contents.
- Calculating or displaying monetary cost in the first version.
- Allowing public self-service publishing by arbitrary users.
- Replacing source control, project documentation, or a normal portfolio site.

## Key Decisions

- Public browsing is open; project creation and upload are auth-gated.
- Ambassador authentication uses Clerk with Google sign-in.
- Ambassador access is controlled by a manually maintained allowlist and enforced server-side.
- An allowlisted ambassador's confirmed upload publishes immediately; there is no mandatory editorial review queue in the MVP.
- The application is a Next.js App Router app hosted on Cloudflare Workers through OpenNext, backed by Cloudflare D1.
- Non-secret product configuration remains checked into the repository; only credentials and secrets use environment variables.
- An export contains two required files: `project.json` for structured history/metadata and `project.md` for the project write-up.
- Project media is uploaded separately in the ambassador flow and associated with the submitted project.
- Conversation exports keep user prompts and final assistant responses only.
- Regex redaction runs locally before upload. The ambassador must still preview and approve the scrubbed export because regex cannot guarantee complete privacy.
- The public detail experience has two layers: a concise project overview first, then an optional Codex-style build-history reader.
- Token usage is a count, not a cost estimate.
- Project metrics show both the wall-clock build span and the summed active Codex working time.
- The exporter includes every Codex thread associated with the selected project. Thread selection or omission is not part of the normal export flow.
- The public build-history reader is a conventional chat view inspired by ChatGPT and Codex, not a separate viewer format or external integration.
- The MVP accepts both images and video.
- Ambassadors can unpublish their own projects at any time.
- The application remains on Next.js App Router rather than migrating to TanStack Start. OpenNext deploys the existing App Router and Clerk integration to Cloudflare Workers.
- Clerk remains the authentication provider because the current application already uses it and its Google sign-in flow fits the allowlisted ambassador model.
- Project media is stored in private Cloudflare R2 through a native Worker binding. D1 stores metadata and ownership through Drizzle ORM; media requests always pass through the Worker and large binaries do not live in the database.

## Core User Journey

### Ambassador export

1. The ambassador opens the local project in Codex.
2. They run the Showcase CLI directly or ask Codex to run the companion skill.
3. The CLI identifies every Codex thread belonging to that Codex project, using the selected project directory and the project/thread association recorded by Codex.
4. It extracts each user prompt and the corresponding final assistant response.
5. It excludes commentary, tool calls, tool results, terminal dumps, and hidden reasoning.
6. It calculates the available duration and token statistics without inventing unavailable values.
7. It applies configurable local regex redactions for email addresses, credentials, tokens, secret assignments, local home paths, and related sensitive patterns.
8. The skill drafts a short Markdown write-up describing what the project is, why it was built, and what is notable about the process.
9. The ambassador reviews the complete redacted history and write-up. Because every associated thread is included and publication is immediate, the tool blocks continuation until the ambassador explicitly confirms that the export is safe to publish.
10. The tool writes `project.json` and `project.md`.

### Ambassador upload

1. The ambassador visits `/ambassador` and signs in with Google through Clerk.
2. The server verifies that their email is on the ambassador allowlist.
3. They choose **Create new project**.
4. They enter or confirm the project name.
5. They upload `project.json` and `project.md`.
6. They upload a cover image plus optional screenshots or other supported media.
7. The app validates the schema, shows the exact public preview, and flags suspicious unredacted content.
8. The ambassador confirms the submission.
9. The project publishes immediately and becomes available on the public canvas.

### Public discovery

1. A visitor lands on an infinite two-dimensional project canvas.
2. Each project appears as a media-led card with minimal identifying information.
3. Selecting a card expands it toward the viewport with a short ASCII/Codex-terminal-inspired transition.
4. The destination presents the cover media, title, short write-up, maker, stack, links, duration, and token count.
5. The visitor can open **Build history** to see threads in chronological order in a familiar chat interface.
6. Each turn shows the ambassador's prompt followed by the final Codex response, visually following the restrained conversation patterns of ChatGPT and Codex.

## Features And Scope

### MVP: local exporter

- Project-directory-based Codex session discovery.
- Mandatory inclusion of every thread associated with the selected Codex project.
- Thread grouping and chronological ordering.
- User prompt plus final assistant response extraction.
- Local configurable regex redaction.
- Redaction report with counts by rule, without echoing secret values.
- Manual preview/approval checkpoint.
- Duration statistics from timestamps.
- Token totals from recorded usage events where available; explicit `unavailable` state otherwise.
- One stable JSON schema shared by the exporter and server.
- Markdown write-up generation through a Codex skill.
- Deterministic output folder containing `project.json` and `project.md`.

### MVP: ambassador portal

- Clerk Google sign-in.
- Server-side ambassador allowlist.
- Create/upload project flow.
- JSON schema validation and Markdown parsing.
- Multiple image upload with one designated cover image.
- Image and video upload through short-lived, server-authorized R2 upload URLs.
- Public preview before submission.
- Immediate publication after allowlist verification, artifact validation, preview, and explicit ambassador confirmation.
- Ambassador-owned unpublish control with server-side ownership verification.

### MVP: public site

- Infinite project canvas with finite rendering/recycling for performance.
- Project cards driven by uploaded media.
- Animated card-to-detail navigation with a reduced-motion fallback.
- Project overview page.
- Codex-style thread/history reader.
- Project-level metrics: thread count, prompt count, elapsed build span, active duration if derivable, and tokens used.
- Responsive fallback that becomes a conventional feed/grid on small screens or unsupported devices.

## Artifact Contract Direction

`project.json` should contain:

- Schema and exporter versions.
- Project metadata.
- Sanitized source metadata that does not reveal local usernames or private paths.
- Aggregated project statistics.
- Ordered threads with per-thread statistics.
- Ordered turns containing the user prompt, final Codex response, timestamps/duration where available, and token usage where available.
- A redaction summary listing rules applied and match counts.
- Media metadata only after upload; local binary images should not be embedded in the JSON.

`project.md` should contain:

- Project title.
- Short blurb.
- What was built.
- Why it was built.
- What Codex contributed or what made the workflow interesting.
- Optional stack, repository, and live-demo links.

## Constraints

- Codex's local session format can evolve, so parsing must be isolated behind version-tolerant adapters and fixture tests.
- Token data may be cumulative, cached, absent, or recorded at a different granularity. The exporter must label exact versus derived values and never fabricate precision.
- Regex redaction is defense-in-depth, not a privacy guarantee. A human approval screen is mandatory before upload.
- Public history content must be treated as untrusted text and rendered without executable HTML.
- Uploaded media needs durable object storage; large binaries should not be stored directly in D1.
- The canvas animation must not block navigation, accessibility, keyboard use, reduced-motion preferences, or low-powered/mobile devices.

## Risks And Open Questions

- **Immediate-publication safety:** A false-negative redaction is public as soon as the ambassador confirms. Validation, prominent local preview, an explicit safety attestation, and a rapid unpublish mechanism are therefore MVP requirements.
- **Project association:** Codex project/thread metadata may differ across storage versions. The exporter needs tested adapters that reliably collect all threads associated with the selected project and report how many it found.
- **Privacy:** Regex will miss contextual secrets, private client names, proprietary code pasted into prompts, and unusual credential formats. Add local scanning warnings and explicit ambassador attestation.
- **Metrics:** Wall-clock span and summed active time can tell very different stories, so both must be visibly labelled rather than combined.
- **Storage:** Cloudflare R2 is the media object store. Upload authorization, object-key ownership, content-type restrictions, size limits, and orphan cleanup need explicit enforcement.

## Next Questions

No product decisions currently block implementation. Remaining details use the recommended defaults documented in the final specification and can be tuned through checked-in configuration.

## Final Spec Draft

Ready for implementation.

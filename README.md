# Codex Ambassador Showcase

[![CI](https://github.com/jstEagle/Codex-showcase/actions/workflows/ci.yml/badge.svg)](https://github.com/jstEagle/Codex-showcase/actions/workflows/ci.yml)

Turn the useful parts of a Codex-built project into a reviewable public showcase bundle. The included CLI finds Codex threads for a project, keeps only user prompts and final Codex responses, calculates recorded build metrics, redacts common secrets, and writes portable `project.json` and `project.md` artifacts.

The web app is the companion gallery: ambassadors can review and publish a bundle, then visitors can explore the project, media, write-up, and cleaned build story.

## Use it with Codex

From the project you want to showcase, paste this into Codex:

> Use the `codex-showcase-export` skill from https://github.com/jstEagle/Codex-showcase/tree/main/.agents/skills/codex-showcase-export to prepare a privacy-reviewed Codex Showcase bundle for this project. Run `npx --yes github:jstEagle/Codex-showcase export` from this project, infer public metadata where safe, ask only for missing public details, generate a cover image, and do not publish anything.

The repository exposes the skill at [`.agents/skills/codex-showcase-export`](.agents/skills/codex-showcase-export), the standard repository location Codex scans when it starts in a repository. To make it a standing workflow for a team repository, copy that directory to `.agents/skills/codex-showcase-export` in the target repository, then start a new Codex task there.

## Run the CLI directly

Node.js 20 or newer is recommended. No global install or clone is required:

```bash
cd /path/to/the/project-built-with-codex
npx --yes github:jstEagle/Codex-showcase export \
  --project-dir "$PWD" \
  --title "Project title" \
  --description "What the project does" \
  --author "Ambassador name" \
  --maker "Ambassador or team" \
  --category "Web app" \
  --stack "Next.js,Cloudflare" \
  --body "Why the project was built and what is notable about it." \
  --link "Repository=https://github.com/example/project" \
  --link "Demo=https://example.com"
```

For development in this repository, use the same command through npm:

```bash
npm install
npm run export:project -- --project-dir /path/to/project --title "Project title"
```

Run `npx --yes github:jstEagle/Codex-showcase help` for the complete option reference.

### What the exporter reads and writes

The exporter scans active and archived Codex session JSONL files under `~/.codex`. It includes every thread whose recorded project directory or workspace root belongs to `--project-dir`, and collects:

- User prompts and final Codex responses.
- Exact active task duration when it was recorded.
- Wall-clock span from the first prompt to the final response.
- Recorded input, cached-input, output, reasoning-output, and total token usage.

It deliberately excludes commentary, tool calls, tool results, terminal output, and hidden reasoning. It writes:

- `codex-showcase-export/project.json` — structured project, metrics, redaction report, and thread history.
- `codex-showcase-export/project.md` — portable public write-up.

The Codex skill also creates `codex-showcase-export/cover.png` after the artifact review.

Regex redaction rules live in [`codex-showcase.config.json`](codex-showcase.config.json). They handle common emails, keys, tokens, private keys, secret assignments, and local home paths. They cannot identify contextual private material, so review every exported thread before any upload or publication.

## Gallery application

The gallery is a Next.js App Router application hosted on Cloudflare Workers through OpenNext. Its main pieces are:

- Clerk with Google sign-in plus a Cloudflare D1 `allowed_users` table queried through Drizzle.
- Cloudflare D1 with Drizzle for metadata, ownership, publication state, Markdown, and structured artifacts.
- Private Cloudflare R2 for images and video, accessed only through same-origin Worker routes.
- TanStack Query cursor pagination for the public project canvas.

The public gallery falls back to seeded samples when D1 is empty. Publishing requires Clerk and the configured D1/R2 bindings.

## Local development

```bash
npm install
npm run dev
```

Non-secret application settings belong in [`src/config/app.ts`](src/config/app.ts). Clerk credentials are the only values that belong in local environment files or Cloudflare Worker secrets:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

Enable Google in Clerk. Clerk can authenticate any user, while the ambassador dashboard and every project/media mutation check the signed-in user's normalized primary email against the D1 `allowed_users` table on the server.

## Deploy to Cloudflare

[`wrangler.jsonc`](wrangler.jsonc) defines the Worker, D1, and private R2 bindings. Drizzle schema lives in [`src/db/schema.ts`](src/db/schema.ts) and generated D1 migrations live in [`drizzle`](drizzle).

The production gallery is served from `https://codexshowcase.dev`. The apex
hostname is attached directly to the production `codex-showcase` Worker as a
proxied Cloudflare custom domain.

```bash
npm run db:generate
npm run db:migrate
npm run deploy
```

Keep R2 public access disabled. The application does not use browser-facing R2 credentials, public bucket URLs, presigned URLs, or a public bucket hostname.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for local checks and pull-request expectations. Report vulnerabilities privately using the process in [SECURITY.md](SECURITY.md); do not open a public issue for a suspected security problem.

## Verification

```bash
npm test
npx tsc --noEmit
npm run lint
npm run check
npm run build
```

Product details and the full artifact contract live in [docs/feature-blueprint.md](docs/feature-blueprint.md).

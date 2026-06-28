# Codex Showcase

A Next.js app for discovering projects built with Codex. Each project has a public post, links/media, and a Codex-style story viewer built from cleaned user/Codex thread history.

## Stack

- Next.js App Router
- Supabase Postgres
- Vercel deployment
- Local `codex-showcase` exporter CLI

## Development

```bash
npm install
npm run dev
```

The dev script requests port `3000`.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/20260628000000_create_codex_showcase.sql` in the Supabase SQL editor or with the Supabase CLI.
3. Copy your Supabase project URL and publishable key into `src/config/app.ts`.
4. Add these secrets locally and in Vercel:

```bash
SUPABASE_SERVICE_ROLE_KEY=...
CODEX_SHOWCASE_ADMIN_TOKEN=...
```

The public app can read published projects with the publishable key. The service-role key is only used by server routes for submissions and admin imports.

## Backend Routes

- `GET /api/projects` lists published projects.
- `GET /api/projects/[slug]` returns one published project.
- `POST /api/submissions` stores a private review submission.
- `POST /api/projects` imports and publishes a `project.json` artifact. Requires `x-codex-showcase-admin-token`.

## Project Export

The local exporter scans Codex session JSONL files for the current project, removes raw tool-call detail, applies configured redactions, and writes a publishable artifact.

```bash
npm run export:project -- \
  --project-dir "$PWD" \
  --title "Project title" \
  --description "Short public description" \
  --author "Author name" \
  --maker "Builder name" \
  --link "Repository=https://github.com/example/project" \
  --link "Demo=https://example.com"
```

Outputs:

- `codex-showcase-export/project.md`
- `codex-showcase-export/project.json`

Redaction rules live in `codex-showcase.config.json`.

## Vercel Deployment

1. Set `src/config/app.ts` to the deployed Vercel URL and Supabase public config.
2. Add `SUPABASE_SERVICE_ROLE_KEY` and `CODEX_SHOWCASE_ADMIN_TOKEN` as Vercel environment variables.
3. Deploy:

```bash
vercel
vercel --prod
```

`vercel.json` pins the framework to Next.js and uses `npm install` plus `npm run build`.

## Verification

```bash
npm run check
npm run lint
npm run build
```

## Product Notes

The feature plan lives in [docs/feature-blueprint.md](docs/feature-blueprint.md).

---
name: codex-showcase-export
description: Turn a local Codex project into a complete Codex Ambassador Showcase upload bundle containing a privacy-scrubbed project.json, a public project.md write-up, and a polished generated cover image. Use when a user asks to create, prepare, export, package, or update a showcase project or ambassador submission from Codex project threads.
---

# Codex Showcase Export

Produce a reviewable upload bundle:

- `project.json`: structured metadata, links, metrics, and scrubbed Codex history.
- `project.md`: concise public project write-up.
- `cover.png`: project-specific generated cover artwork.

The only publishable primitive is a project. Include a readable post and compact build history. Exclude raw tool-call bodies, command dumps, hidden reasoning, secrets, private contact data, and unrelated files.

## Workflow

1. Confirm the current working directory is the project being exported.
2. Inspect the project before asking questions. Infer its purpose, audience, stack, visual identity, and most distinctive idea from the README, product code, existing screenshots, icons, and public links.
3. Ask only for public metadata that cannot be inferred: title, author, maker, description, category, repository URL, demo URL, or article links.
4. Draft 1–3 concise public paragraphs explaining what the project is, why it was built, and what is interesting about the Codex workflow.
5. Run the CLI from the project directory:

```bash
npx --yes github:jstEagle/Codex-showcase export \
  --project-dir "$PWD" \
  --title "Project title" \
  --description "Short public description" \
  --author "Author name" \
  --maker "Builder name" \
  --category "Web app" \
  --card-animation "liquid" \
  --stack "Next.js,Clerk,Cloudflare" \
  --body "Public blog paragraph." \
  --link "Repository=https://github.com/example/project" \
  --link "Demo=https://example.com"
```

6. Read `codex-showcase-export/project.md` and `codex-showcase-export/project.json`.
7. Read [references/cover-image.md](references/cover-image.md), then use the image-generation capability to create the cover. Save the selected final as `codex-showcase-export/cover.png`. Generate a cover by default; skip only when the user explicitly opts out or has approved a supplied cover.
8. Review every exported thread for privacy, accuracy, and missing links. The CLI includes all threads associated with the Codex project and does not offer selective omission.
9. If anything private remains, add a specific redaction rule to `codex-showcase.config.json` and rerun the CLI.
10. Verify all three files exist and tell the user where the upload bundle is.

## Privacy Rules

- Keep user messages and final Codex responses only.
- Exclude tool calls, command logs, stack traces, hidden reasoning, and intermediate commentary.
- Redact emails, API-key-like tokens, JWTs, secret assignments, and local user home paths.
- Treat links as public only when supplied by the user or already present in project metadata.
- Stop and ask before publishing histories containing private clients, private domains, unreleased names, or contextual secrets missed by regex.
- Treat the redaction report as a warning aid, not a guarantee. Never confirm the portal privacy attestation for the user.
- Preserve recorded token usage, wall-clock build span, and active Codex duration. Label unavailable metrics rather than estimating them.

## Artifact Shape

`project.json` uses the canonical `codex-showcase-project` schema:

```json
{
  "schema": "codex-showcase-project",
  "project": {
    "title": "Project title",
    "description": "Short public description",
    "author": "Author name",
    "maker": "Builder name",
    "category": "Web app",
    "cardAnimation": "liquid",
    "stack": ["Next.js", "Clerk"],
    "links": [
      {
        "label": "Repository",
        "url": "https://github.com/example/project",
        "kind": "repo"
      }
    ]
  },
  "metrics": {
    "threadCount": 1,
    "turnCount": 1,
    "wallClockDurationMs": 720000,
    "activeDurationMs": 680000,
    "tokens": { "totalTokens": 125000 },
    "tokenCountSource": "recorded"
  },
  "post": {
    "title": "Project title",
    "body": ["Public blog paragraph."]
  },
  "threads": [
    {
      "id": "019...",
      "title": "Thread title",
      "startedAt": "2026-06-28T00:00:00.000Z",
      "turns": [
        {
          "user": "User request",
          "codex": "Final Codex outcome",
          "workedFor": "worked for 12 minutes",
          "durationMs": 720000,
          "tokens": { "totalTokens": 125000 }
        }
      ]
    }
  ]
}
```

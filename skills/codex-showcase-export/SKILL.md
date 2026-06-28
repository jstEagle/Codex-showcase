# Codex Showcase Export

Use this skill when a user wants to turn the current Codex project into a Codex Showcase submission.

## Goal

Produce two files the user can review and upload:

- `project.md`: a blog-style project post draft.
- `project.json`: the structured project artifact with metadata, links, and scrubbed Codex history.

The only publishable primitive is a project. A project contains a readable post plus a compact Codex build history. Do not include raw tool-call bodies, command output dumps, hidden reasoning, secrets, private contact data, or unrelated local files.

## Workflow

1. Confirm the current working directory is the project being exported.
2. Ask the user for missing public metadata only when it cannot be inferred: title, author, maker, description, repository URL, demo URL, videos, images, or article links.
3. Run the CLI from the project directory:

```bash
npx codex-showcase export \
  --project-dir "$PWD" \
  --title "Project title" \
  --description "Short public description" \
  --author "Author name" \
  --maker "Builder name" \
  --link "Repository=https://github.com/example/project" \
  --link "Demo=https://example.com"
```

4. Read `codex-showcase-export/project.md` and `codex-showcase-export/project.json`.
5. Review the output for privacy, accuracy, and missing links.
6. If anything private remains, add a specific redaction rule to `codex-showcase.config.json` and rerun the CLI.
7. Tell the user where the two files are and summarize what was included.

## Privacy Rules

- Keep user messages and final Codex responses only.
- Exclude tool calls, command logs, stack traces, hidden reasoning, and intermediate commentary.
- Redact emails, API-key-like tokens, JWTs, secret assignments, and local user home paths.
- Treat all links as public only if the user supplied them or they already appear in project metadata.
- If the project history contains client names, private domains, unreleased product names, or credentials that the regex rules missed, stop and ask before publishing.

## Artifact Shape

`project.json` should follow `codex-showcase-project/v1`:

```json
{
  "schemaVersion": "codex-showcase-project/v1",
  "project": {
    "title": "Project title",
    "description": "Short public description",
    "author": "Author name",
    "maker": "Builder name",
    "links": [
      { "label": "Repository", "url": "https://github.com/example/project" }
    ]
  },
  "codexHistory": [
    {
      "threadId": "019...",
      "title": "Thread title",
      "turns": [
        {
          "user": "User request",
          "codex": "Final Codex outcome",
          "workedFor": "worked for 12 minutes"
        }
      ]
    }
  ]
}
```

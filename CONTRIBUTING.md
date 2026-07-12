# Contributing to Codex Ambassador Showcase

Thanks for improving the exporter, skill, or gallery.

## Before opening a pull request

1. Keep a change focused. Do not mix an exporter contract change with an unrelated visual rewrite.
2. Keep non-secret defaults in checked-in configuration. Never commit credentials, tokens, or real user exports.
3. Add or update tests when changing session parsing, redaction, artifact shape, or metrics.
4. Run the relevant checks:

   ```bash
   npm test
   npx tsc --noEmit
   npm run lint
   npm run check
   npm run build
   ```

## Exporter changes

The exporter is intentionally conservative. It may include only user prompts and final Codex responses in a public artifact. Keep tool calls, terminal output, commentary, hidden reasoning, and intermediate messages out of the output. Preserve the required human privacy review even when adding redaction rules.

`codex-showcase.config.json` is the canonical checked-in configuration for exporter behavior. Document any new option in both `README.md` and `.agents/skills/codex-showcase-export/SKILL.md`.

## Pull requests

Explain the user-facing outcome, testing performed, and any privacy or deployment impact. Include screenshots for visible gallery changes. Never attach a real unredacted Codex transcript to an issue or pull request.

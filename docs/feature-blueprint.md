# Codex Showcase Feature Blueprint

## Product Shape

Codex Showcase should feel like a Codex workspace where the "threads" are not private coding sessions, but public project stories. The left sidebar becomes a discovery and collection system. The main pane becomes a project reading, submission, and review surface. The bottom composer becomes the primary way ambassadors start or improve a submission.

The product should answer one question quickly and credibly:

"What are people actually building with Codex?"

## Core Product Loops

### Visitor Discovery Loop

1. Visitor lands in a Codex-like app shell.
2. They browse featured projects, collections, or recent submissions.
3. They open a project story.
4. They inspect media, links, code, workflow notes, and outcomes.
5. They follow the demo/repo/author or continue browsing related projects.

### Ambassador Publishing Loop

1. Ambassador signs in.
2. They create a new project submission from the Codex-style composer.
3. They add structured sections, media, links, tags, and workflow notes.
4. They preview the post as it will appear publicly.
5. They submit for review or publish if trusted.
6. They can later update the project with new demos, launches, or lessons.

### Editorial Curation Loop

1. Editor reviews submitted projects.
2. Editor checks media quality, links, claims, category, tags, and safety.
3. Editor requests changes or approves.
4. Editor assigns projects to collections and feature slots.
5. Published projects feed search, collections, author pages, and digests.

## UI Mapping From Codex Native App

### Sidebar

Use the sidebar as the main discovery object.

Sections:

- New submission.
- Search.
- Collections.
- Ambassadors.
- Featured projects.
- Recent projects.
- Drafts for authenticated users.
- Review queue for editors.
- Settings.

Project groups can mirror Codex project folders:

- Featured.
- Agents.
- Apps.
- Games.
- Research.
- Automations.
- Design.
- Data.
- Devtools.
- Open-source.

Individual sidebar rows can represent project posts, drafts, review items, or curated collections.

### Main Empty State

The current Codex-like prompt screen should become the signed-in creation entrypoint.

Prompt examples:

- "Paste a repo or demo URL to start a project post."
- "Describe what you built with Codex."
- "Turn this build log into a showcase submission."
- "Create a project story from screenshots and notes."

The three connector cards can become onboarding actions:

- Connect GitHub.
- Connect media library.
- Submit a project.

For the public homepage, the same composition can show a featured project instead of an empty prompt.

### Thread View

A project detail page should feel like a Codex thread:

- User prompt: the ambassador's initial project brief.
- Assistant response: polished project story.
- Attachments: screenshots, videos, demo links, repos.
- Change cards: "Updated demo link", "Added launch video", "Published v2".
- Review controls for editors.

This lets the project avoid feeling like a normal blog and instead feel like a living Codex artifact.

### Environment Panel

The right environment panel can show project metadata.

Potential fields:

- Author.
- Status.
- Category.
- Tech stack.
- Codex workflow tags.
- Demo URL.
- Repository URL.
- Media count.
- Published date.
- Review state.
- Featured placement.
- Related collections.

## Public Features

### Project Feed

The primary browsing surface.

Capabilities:

- Featured projects.
- Recent projects.
- Staff picks.
- Ambassador picks.
- Trending projects.
- Recently updated projects.
- Dense list mode.
- Media grid mode.
- Compact Codex-thread mode.

Feed cards should show:

- Cover image or video.
- Title.
- One-line summary.
- Author.
- Category.
- Tech stack.
- Codex workflow tags.
- Demo/repo indicators.
- Published or updated time.

### Project Detail Pages

Each project needs a rich, inspectable page.

Sections:

- Hero media.
- Summary.
- What was built.
- Why it matters.
- Codex workflow.
- Key prompts or instructions.
- Screenshots and videos.
- Demo link.
- Repository link.
- Stack and tools.
- Timeline.
- Lessons learned.
- Related projects.
- Author card.

Optional sections:

- Architecture diagram.
- Before/after comparison.
- Test or benchmark results.
- Launch metrics.
- Known limitations.
- How to reproduce.
- Downloadable artifact.

### Search

Search should be fast and technical.

Searchable fields:

- Title.
- Summary.
- Body.
- Author.
- Tech stack.
- Category.
- Tags.
- Demo URL domain.
- Repository name.
- Codex workflow type.

Filters:

- Category.
- Stack.
- Workflow.
- Media type.
- Has demo.
- Has repo.
- Published date.
- Difficulty.
- Ambassador.
- Collection.

### Collections

Collections are curated views that make the product feel editorial and useful.

Examples:

- Best first Codex builds.
- Full-stack apps.
- Agent workflows.
- Internal tools.
- Games built with Codex.
- Debugging saves.
- Launch-ready products.
- Design-heavy builds.
- Open-source projects.
- Data and research workflows.

Collection pages should support:

- Collection description.
- Curator.
- Ordered projects.
- Featured lead project.
- Related collections.

### Ambassador Profiles

Profiles should make ambassadors feel like builders, not authors in a CMS.

Profile fields:

- Name.
- Handle.
- Avatar.
- Bio.
- Location or timezone if public.
- Links.
- Specialties.
- Tech stack.
- Featured projects.
- Recent projects.
- Collections curated.

Profile stats:

- Published projects.
- Featured projects.
- Total demos.
- Open-source repos.

### Project Embeds

Each project should produce shareable assets.

Embeds:

- Open Graph card.
- Small project badge.
- "Built with Codex" badge.
- Collection embed.
- Ambassador profile card.

This helps projects travel outside the site.

## Authenticated Ambassador Features

### Dashboard

The ambassador dashboard should feel like a Codex workspace.

Views:

- My projects.
- Drafts.
- Submitted.
- Published.
- Needs changes.
- Archived.
- Media library.
- Profile.

### Submission Composer

The composer should produce structured project posts.

Inputs:

- Title.
- Short summary.
- Category.
- Tags.
- Tech stack.
- Codex workflow tags.
- Body sections.
- Screenshots.
- Video uploads or embeds.
- Demo links.
- Repository links.
- Prompt/workflow excerpts.
- Lessons learned.

Quality helpers:

- Missing demo warning.
- Missing cover media warning.
- Broken link check.
- Too-vague summary warning.
- Required section checklist.
- Preview before submit.

### Media Library

Media should be first-class because the site is a showcase.

Features:

- Image uploads.
- Video uploads or embeds.
- Cover image selection.
- Alt text.
- Captions.
- Gallery ordering.
- Media reuse across posts.
- File size and format validation.

### Draft Collaboration

Useful for editorial polish.

Features:

- Save drafts.
- Autosave.
- Preview links.
- Editor comments.
- Requested changes.
- Revision history.
- Publish checklist.

## Editorial Features

### Review Queue

Editors need a clear queue.

States:

- Draft.
- Submitted.
- In review.
- Needs changes.
- Approved.
- Published.
- Archived.

Review fields:

- Reviewer.
- Internal notes.
- Public quality score.
- Media readiness.
- Link health.
- Tag accuracy.
- Collection assignment.

### Moderation

The site should prevent low-quality or risky submissions.

Checks:

- Broken links.
- Missing attribution.
- Secret leakage in screenshots or snippets.
- Private repo exposure.
- Unsafe claims.
- Spam.
- Duplicate project posts.
- Copyright-sensitive media.

### Featuring Controls

Editors should be able to shape the public surface.

Controls:

- Feature on homepage.
- Add to collection.
- Pin within category.
- Mark as staff pick.
- Schedule publish.
- Set display priority.

## Data Model

### User

- id.
- name.
- handle.
- email.
- role: visitor, ambassador, editor, admin.
- avatar_url.
- bio.
- links.
- created_at.

### Project

- id.
- slug.
- title.
- subtitle.
- summary.
- author_id.
- status.
- category_id.
- cover_media_id.
- body.
- demo_url.
- repo_url.
- published_at.
- updated_at.
- created_at.

### Project Metadata

- project_id.
- difficulty.
- codex_workflow_tags.
- tech_stack_tags.
- media_type_tags.
- source_visibility: public, private, mixed.
- has_demo.
- has_repo.

### Media

- id.
- owner_id.
- project_id.
- type: image, video, embed, file.
- url.
- storage_path.
- alt_text.
- caption.
- sort_order.
- created_at.

### Collection

- id.
- slug.
- title.
- description.
- curator_id.
- cover_media_id.
- published.
- sort_order.

### Collection Project

- collection_id.
- project_id.
- sort_order.
- note.

### Review

- id.
- project_id.
- reviewer_id.
- status.
- notes.
- requested_changes.
- created_at.
- updated_at.

## Ranking And Discovery

The site should not rank only by clicks. It should reward complete, useful proof.

Ranking signals:

- Has working demo.
- Has repository.
- Has media.
- Has clear Codex workflow explanation.
- Editor featured.
- Collection inclusion.
- Recent update.
- Ambassador reputation.
- Visitor saves or outbound clicks.

Avoid ranking that rewards vague hype, clickbait titles, or low-substance posts.

## MVP

Build the first version around the smallest complete publishing loop.

MVP features:

- Public Codex-style app shell.
- Project feed.
- Project detail page.
- Seeded projects.
- Ambassador sign-in.
- Create/edit draft.
- Upload cover image.
- Add demo and repo links.
- Add tags.
- Preview post.
- Submit for review.
- Minimal editor approval.
- Published project appears in feed.

MVP should not try to solve:

- Advanced analytics.
- Full collaborative editing.
- Complex permissions.
- Video transcoding.
- Public comments.
- Recommendation algorithms.

## Phase 2

Add depth after the core loop works.

Features:

- Collections.
- Ambassador profiles.
- Rich media galleries.
- Video embeds.
- Link preview generation.
- Review comments.
- Project update timeline.
- Search and filtering.
- Featured homepage slots.
- Open Graph image generation.

## Phase 3

Turn the showcase into a durable ecosystem surface.

Features:

- Public badges.
- Embeddable project cards.
- Weekly digest.
- RSS feed.
- Analytics dashboard.
- GitHub import.
- Demo health checks.
- Project changelogs.
- Multi-author projects.
- Collection curators.
- Submission templates for common project types.

## Submission Templates

Templates can help ambassadors publish better posts.

Templates:

- Full app build.
- Debugging story.
- Refactor story.
- Agent workflow.
- Game prototype.
- Data/research project.
- Design implementation.
- Internal tool.
- Launch case study.

Each template should provide suggested sections and required proof points.

## Quality Bar

A good project post should include:

- Clear description of what was built.
- At least one visual artifact.
- A working link or repo when possible.
- Specific Codex contribution.
- What changed during iteration.
- What someone else can learn.

A weak project post:

- Reads like marketing copy.
- Has no screenshot or demo.
- Does not explain Codex's role.
- Makes broad claims without artifacts.
- Uses generic AI productivity language.

## Product Voice

The voice should be technical, direct, and artifact-focused.

Use:

- "Built with Codex."
- "Workflow."
- "Demo."
- "Repository."
- "What changed."
- "Artifacts."
- "Lessons."

Avoid:

- "Unlock your potential."
- "Revolutionary."
- "10x."
- Generic community hype.

## Implementation Priorities

1. Preserve the Codex-native shell and interaction metaphor.
2. Build real project browsing before building marketing pages.
3. Make project media central.
4. Make ambassador submission structured.
5. Add moderation early enough to protect quality.
6. Add collections once enough posts exist.
7. Use analytics to improve curation, not to turn the product into a social feed.

## Near-Term Build Plan

1. Replace the empty-state connector cards with showcase-specific actions while keeping the same visual layout.
2. Add seeded project data in a local config/data file.
3. Create a project feed view inside the Codex shell.
4. Create a project detail view that feels like a Codex thread.
5. Create a submission form that uses the composer metaphor.
6. Add basic draft/published state locally.
7. Add authentication and database-backed persistence.
8. Add media storage.
9. Add review queue.
10. Add collections and profiles.

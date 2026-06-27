# Codex Showcase Vision

## Product Intent

Codex Showcase is a web app that recreates the feel of the Codex native app while serving a different purpose: helping people discover, study, and share the best things being built with Codex.

The app should feel like opening Codex, but instead of entering a coding workspace, visitors enter a living gallery of projects, workflows, experiments, launches, tools, automations, apps, games, research artifacts, and creative systems built by Codex users and ambassadors.

The goal is not to make a marketing blog. The goal is to make a product surface that feels native to the Codex ecosystem: dense, refined, technical, browsable, and credible.

## Core Premise

Build a TanStack Start application that visually clones the Codex native app UI for the web.

The functional product is a showcase platform:

- Codex ambassadors can log in.
- Ambassadors can submit project posts.
- Posts can include text, images, videos, links, repository references, prompts, process notes, and outcomes.
- Visitors can browse, search, filter, and read those posts.
- The site should make Codex feel tangible by showing real things real people are building.

## Audience

Primary users:

- People curious about what Codex can actually build.
- Existing Codex users looking for inspiration and patterns to copy.
- Codex ambassadors who need a polished place to publish their work.
- OpenAI teams who want a curated view of community output.

Secondary users:

- Developers evaluating Codex for their own workflow.
- Product teams exploring AI-assisted software development.
- Journalists, investors, and community members who need concrete examples instead of abstract claims.

## Experience Principles

### Native Codex Feel

The web app should closely mirror the Codex native app UI:

- Dark, focused application shell.
- Left sidebar for navigation, discovery, and collections.
- Main content pane for selected project stories.
- Secondary detail areas where useful.
- Compact controls.
- High information density.
- Minimal decoration.
- Calm, technical typography.
- Subtle borders, panels, hover states, and status indicators.

The user should feel like they are inside a Codex-adjacent tool, not a typical community website.

### Showcase, Not Hype

Project posts should emphasize concrete artifacts:

- What was built.
- What Codex helped with.
- What the workflow looked like.
- What changed because Codex was involved.
- What someone else could learn or reuse.

The product should avoid vague success-story language. Every post should make the work inspectable through screenshots, videos, links, repos, or implementation notes.

### Built For Browsing And Deep Reading

The app should support both quick scanning and long-form reading:

- Gallery/grid views for discovery.
- List views for dense scanning.
- Rich post pages for deep dives.
- Filters for project type, tech stack, Codex workflow, difficulty, media type, and ambassador.
- Saved or featured collections.

### Ambassador Publishing Should Feel First-Class

Submission should not feel like filling out a generic CMS form. It should feel like composing a Codex project artifact:

- Structured editor with sections.
- Rich media uploads.
- Link previews.
- Repo/demo links.
- Tags and technology metadata.
- Draft and preview modes.
- Submission status.
- Editorial feedback if moderation is needed.

## Product Structure

### Public Surface

The public surface is optimized for discovery.

Primary views:

- Home feed of featured and recent projects.
- Project detail pages.
- Ambassador profile pages.
- Collections around themes such as agents, apps, games, automation, research, design, data, internal tools, and open-source.
- Search and filters.
- Media-rich project gallery.

The home screen should avoid a generic landing-page hero. The first screen should immediately show the product: a Codex-like app shell filled with real showcase content.

### Authenticated Ambassador Surface

Ambassadors get a private workspace inside the same app shell.

Primary views:

- My projects.
- Drafts.
- New submission.
- Media library.
- Submission review status.
- Profile settings.

The authenticated area should reuse the same native Codex visual language rather than switching into an admin dashboard style.

### Editorial Surface

If moderation is needed, editors need a quiet review workflow.

Primary views:

- Submission queue.
- Draft review.
- Comments or requested changes.
- Publish scheduling.
- Featured placement controls.
- Collection assignment.

This can be implemented later, but the data model and route structure should leave room for it.

## Content Model

A project post should support:

- Title.
- Subtitle or short summary.
- Ambassador author.
- Project category.
- Tech stack.
- Codex usage pattern.
- Difficulty or complexity.
- Cover image or video.
- Body content.
- Image gallery.
- Embedded videos.
- External links.
- Repository links.
- Live demo links.
- Prompt or workflow excerpts.
- Build timeline.
- Lessons learned.
- Status: draft, submitted, approved, published, archived.

Useful categories:

- Web apps.
- Mobile apps.
- Games.
- Internal tools.
- Browser extensions.
- Data analysis.
- Automation.
- Design systems.
- Agents.
- Devtools.
- Research.
- Hardware or physical-world projects.

Useful Codex workflow tags:

- Full app build.
- Refactor.
- Debugging.
- Test generation.
- Design implementation.
- Data migration.
- Deployment.
- Documentation.
- Code review.
- Multi-agent workflow.
- Local tool integration.

## Information Architecture

Recommended top-level routes:

- `/` for the showcase feed.
- `/projects` for browse and filter.
- `/projects/$slug` for project detail.
- `/ambassadors` for ambassador directory.
- `/ambassadors/$handle` for profile pages.
- `/collections` for curated groups.
- `/collections/$slug` for collection detail.
- `/submit` for authenticated project submission.
- `/dashboard` for ambassador project management.
- `/review` for editorial review.

Recommended primary navigation:

- Showcase.
- Projects.
- Collections.
- Ambassadors.
- Submit.

Authenticated-only navigation:

- My Projects.
- Drafts.
- Media.
- Profile.

## Visual Direction

The UI should take strong cues from the Codex native app:

- App-like shell rather than website layout.
- Sidebar navigation.
- Thread-list-like project browsing.
- Detail-pane reading experience.
- Compact metadata chips.
- Monospace accents for repositories, commands, model names, and stack details.
- Media preview panes that feel integrated into the workspace.
- Subtle empty states and loading states.

Avoid:

- Marketing hero pages.
- Oversized promotional cards.
- Decorative gradients.
- Generic SaaS dashboards.
- Blog template aesthetics.
- Overly playful community-site styling.

The project itself is the visual content. Screenshots, videos, demos, and build artifacts should carry the page.

## Technical Direction

Use TanStack Start as the application foundation.

Preferred stack:

- TanStack Start for routing, server functions, and full-stack app structure.
- TanStack Router for route-first composition.
- TanStack Query where client/server data synchronization is needed.
- TypeScript throughout.
- A database-backed content model for projects, ambassadors, media, tags, and submissions.
- Authentication for ambassador accounts.
- Object storage for images and videos.
- Markdown or rich-text JSON for post bodies, depending on editor needs.

Non-secret configuration should live in checked-in config files. Only secrets such as auth credentials, database URLs, API keys, and storage tokens should live in environment variables or a secret store.

## MVP Scope

The first useful version should include:

- TanStack Start app shell that visually resembles Codex.
- Public project feed.
- Project detail page.
- Ambassador login.
- Ambassador project submission form.
- Rich post body support.
- Image upload support.
- External link support.
- Draft and published states.
- Basic admin approval path, even if minimal.
- Seeded example projects so the UI feels real immediately.

The MVP should prove the main loop:

1. An ambassador logs in.
2. They create a project story.
3. They attach media and links.
4. They preview the post.
5. The post is submitted or published.
6. Visitors can discover and read it.

## Later Scope

Future capabilities:

- Video upload and transcoding.
- Embeddable demos.
- GitHub repo import.
- Automatic link previews.
- Featured collections.
- Ambassador badges.
- Editorial comments.
- Public reactions or saves.
- Weekly digest pages.
- RSS feed.
- Open Graph image generation.
- Analytics for project views and outbound clicks.
- Submission quality checklist.
- Codex workflow templates for common post types.

## Success Criteria

The product is working if:

- The first screen unmistakably feels like a Codex-native web app.
- Visitors can quickly understand the breadth of things built with Codex.
- A project detail page feels specific, credible, and media-rich.
- Ambassadors can publish without needing a separate CMS.
- The site creates reusable proof points for the Codex ecosystem.
- The UI does not feel like a marketing page or generic blog.

## Product North Star

Codex Showcase should become the place people go when they ask:

"What are people actually building with Codex?"

The answer should be visible immediately: real projects, rich artifacts, technical detail, and a web experience that feels like it belongs inside Codex itself.

# OpenAI Codex Design System Extraction

Source page: https://openai.com/codex/
Extracted: 2026-06-27

This is a local reference for the visual system observed on the OpenAI Codex product page. Use it as the design direction for Codex Showcase, while replacing page-specific product screenshots, partner logos, and trademarked marks with project-owned content when building public-facing surfaces.

## Core Direction

- Overall feel: dark product editorial, high contrast, restrained chrome, strong real-product imagery.
- Primary canvas: black background with near-black raised panels.
- Typography: OpenAI Sans, 17px body, compact line height, no negative letter spacing in our app.
- Actions: pill CTAs, 40px height, 40px radius, 14px medium label.
- Layout: generous vertical rhythm, centered hero/composer blocks, tight information grids, minimal decoration.
- Imagery: real app screenshots and interface states, not abstract illustrations.
- Borders: translucent white, usually 12 percent opacity; stronger hover/active state around 20 percent opacity.

## Tokens

| Token         | Value                       | Use                               |
| ------------- | --------------------------- | --------------------------------- |
| `bg`          | `#000`                      | Page and viewport background      |
| `panel`       | `#0f0f0f`                   | Main app panel and sidebar base   |
| `panelSoft`   | `#1f1f1f`                   | Inputs, bubbles, secondary panels |
| `panelRaised` | `#272727`                   | Composer and elevated surfaces    |
| `line`        | `rgba(255, 255, 255, 0.12)` | Default border                    |
| `lineStrong`  | `rgba(255, 255, 255, 0.2)`  | Hover/selected border             |
| `text`        | `#fff`                      | Primary text                      |
| `muted`       | `rgba(255, 255, 255, 0.68)` | Secondary text                    |
| `dim`         | `rgba(255, 255, 255, 0.42)` | Placeholder and quiet metadata    |
| `button`      | `#fff`                      | Primary pill fill                 |
| `inverseText` | `#000`                      | Text on white pills               |
| `success`     | `#5dd135`                   | Live/status accent                |

## Typography

- Font stack: `"OpenAI Sans", "OpenAI Sans Variable Scripts", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Body: 17px, regular, about 1.65 line height on the source page.
- Product CTAs: 14px, medium, 1.0 line height, 40px pill.
- Compact UI labels: 13px to 16px, medium to semibold.
- Headings are calm and low-weight; avoid oversized marketing type inside the app shell.

## Components

### Shell

- Full viewport app shell.
- Black or near-black base.
- Sidebar can use a subtle radial highlight, but avoid colored decorative blobs.
- Borders should read as glassy separators, not thick outlines.

### Composer

- Raised near-black rounded container.
- Textarea and action row share the same panel tone.
- Submit action is a white circular button with black icon/text.
- Secondary tool actions are transparent with muted text.

### Cards

- Repeated items use small radius, thin translucent borders, and restrained hover states.
- Avoid nested cards; cards should frame individual repeated items only.
- Primary content is text and real UI evidence, not decorative illustrations.

### Buttons

- Primary: white fill, black label, 40px height, 20px horizontal padding, 40px radius.
- Secondary: subtle translucent white fill or transparent underline/link.
- Icon-only: circular or square 31px to 40px hit areas, transparent to subtle fill.

## Extracted Assets

Browser asset extraction found:

- 2 font URLs: `OpenAISans-Regular.woff2`, `OpenAISans-Medium.woff2`.
- 35 observed image assets.
- 12 stylesheet assets.
- 2 video assets.
- 38 inline SVG assets.

The bundled image/SVG reference files are stored in:

`docs/design-system/openai-codex-assets/`

The generated bundle manifest is:

`docs/design-system/openai-codex-assets/manifest.json`

Some font and mobile image downloads were blocked by the page fetch path, so their source URLs remain in the manifest failures section. Runtime font usage currently references the observed CDN URLs directly from `src/styles.css`.

## Implementation Notes

- Current CSS tokens live in `src/styles.css`.
- Reusable TypeScript tokens live in `src/design-system/openaiCodex.ts`.
- Use project-owned screenshots for final public content unless the OpenAI page assets are explicitly approved for the intended use.

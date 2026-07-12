# Codex Showcase brand

## Feel

- Editorial, technical, and quiet: project work is the focus.
- Project photography is always the card visual; motion reveals a transient white ASCII layer without replacing or tinting the image.
- Large immersive project visuals paired with restrained, readable metadata.
- Transitions preserve spatial continuity so the interface feels like one canvas.

## Typography

- Interface and display: OpenAI Sans, system sans-serif fallback.
- Technical labels and metrics: JetBrains Mono, system monospace fallback.
- Editorial accent only: Instrument Serif italic.
- Display headings use tight tracking and 0.98-1.08 line height; body copy uses 1.6-1.75.

## Colour

- Background: `#ffffff`.
- Primary text and card field: `#0d0d0d`.
- Muted text: `#5f5f68`; dim labels: `#93939c`.
- Uploaded project photography keeps its original colour. ASCII is always white.
- Colour is semantic only: focus `#007CD5`, danger `#FF8B55`, warning `#FDE252`, success `#DEEEC4`, info `#92DEFF`, error surface `#FCDFDB`, and selection `#CCC7F0`.
- Decorative UI remains black, white, or grey; semantic colours never tint project cards or the ASCII effect.

## UI style

- Spacing follows a compact 4/8px rhythm with generous 40-96px editorial gutters.
- Project cards are square-edged on the canvas and gain a 26px radius when expanded into a hero.
- Prefer hairline dividers over shadows; controls are compact and high contrast.
- Pointer and touch movement reveals a short-lived GPU layer of white `-`, `>`, and `o` glyphs derived from the luminance of the uploaded photo beneath them. It is a small, soft character-mask contact patch like the OpenAI Codex hero, not a fluid, ripple, displacement, or colour effect.
- Hover and keyboard focus restore the quiet grey ASCII frame outside the card edges. Its horizontal and vertical strings crawl in opposing stepped loops only while the card is active; it remains separate from the smaller white contact mask over the image.
- The selected card expands in place with an `expo.inOut` curve and a brief white ASCII reveal. Supporting copy reveals through clipped movement, stagger, and deterministic ASCII decoding.
- Reduced-motion mode uses the final photographic layout without the animated ASCII trail.

## Voice

- Clear, direct, and specific.
- Use short interface labels such as “All projects”, “Return to canvas”, and “Build history”.
- Describe recorded project facts; label unavailable metrics rather than estimating them.

## Implementation

- Global tokens and component rules: `src/styles.css`.
- Checked-in interaction and renderer settings: `src/config/app.ts`.
- Shared GPU ASCII renderer: `src/lib/ascii-shader.ts`.
- Selected-project motion: `src/components/ProjectCanvas.tsx` and `src/components/ProjectHeroOverlay.tsx`.

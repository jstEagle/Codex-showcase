# Showcase Cover Image

Create one strong, project-specific cover rather than generic technology art.

## Art Direction

1. Extract the product's central promise, emotional tone, distinctive visual motif, and existing palette from the project. Use an existing icon or screenshot as a style reference only when it is genuinely representative.
2. Choose one legible visual metaphor. Prefer a clear sculptural object, system, environment, or product moment over a collage of features.
3. Use the built-in image-generation capability. Select the closest image-generation use case for the project, usually `stylized-concept`, `product-mockup`, or `ui-mockup`.
4. Generate a wide 16:10 composition with a strong focal point, generous safe margins, and enough visual weight to survive landscape, portrait, and square card crops.
5. Keep the result readable at thumbnail size. Avoid small UI, dense diagrams, feature lists, literal code, and decorative noise.
6. Match the real project's character. A calm productivity tool should not become neon cyberpunk art; a playful game should not become a sterile enterprise render.

## Prompt Requirements

Include:

- Asset type: premium Codex Ambassador Showcase cover.
- Primary request: what the product does and the idea the image should communicate.
- Scene or backdrop.
- Subject and one central metaphor.
- Style or medium.
- Wide 16:10 framing with crop-safe margins.
- Lighting, mood, palette, and materials grounded in the project.
- Constraints and an explicit avoid list.

Default constraints:

- No text unless the user supplied exact approved copy and text is essential.
- No third-party logos or recognizable proprietary UI.
- No watermark.
- No generic glowing code, floating dashboards, neon circuitry, or stock “AI brain” imagery.
- Do not invent product features.

## Quality Gate

Inspect the generated image before accepting it:

- It communicates the project rather than merely “technology.”
- It remains compelling and recognizable as a small card.
- Important content survives center crops in multiple aspect ratios.
- It has no malformed text, accidental logos, unwanted UI, or irrelevant objects.
- It feels intentionally art-directed and consistent with the product.

If it fails, make one targeted iteration that names the specific defect. Do not create an unfocused batch of near-duplicates.

Copy the approved result to `codex-showcase-export/cover.png`, leaving the generator's original file intact. Report the saved project-local path with the other export artifacts.

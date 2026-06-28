export const openAiCodexDesignSystem = {
  source: {
    page: 'https://openai.com/codex/',
    extractedAt: '2026-06-27',
  },
  font: {
    family:
      '"OpenAI Sans", "OpenAI Sans Variable Scripts", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    regularUrl:
      'https://cdn.openai.com/common/fonts/openai-sans/v4/OpenAISans-Regular.woff2',
    mediumUrl:
      'https://cdn.openai.com/common/fonts/openai-sans/v4/OpenAISans-Medium.woff2',
  },
  color: {
    bg: '#000',
    panel: '#0f0f0f',
    panelSoft: '#1f1f1f',
    panelRaised: '#272727',
    line: 'rgba(255, 255, 255, 0.12)',
    lineStrong: 'rgba(255, 255, 255, 0.2)',
    text: '#fff',
    muted: 'rgba(255, 255, 255, 0.68)',
    dim: 'rgba(255, 255, 255, 0.42)',
    button: '#fff',
    inverseText: '#000',
    success: '#5dd135',
  },
  radius: {
    cta: '40px',
    composer: '22px',
    card: '10px',
    icon: '9999px',
  },
  spacing: {
    ctaHeight: '40px',
    ctaPaddingInline: '20px',
    iconButton: '40px',
    compactIconButton: '31px',
  },
  assets: {
    referenceDirectory: 'docs/design-system/openai-codex-assets',
    manifest: 'docs/design-system/openai-codex-assets/manifest.json',
  },
} as const

export type OpenAiCodexDesignSystem = typeof openAiCodexDesignSystem

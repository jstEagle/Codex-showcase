export const cardAnimations = [
  {
    id: 'liquid',
    label: 'Liquid',
    description: 'Rippling fluid interference and moving currents.',
  },
  {
    id: 'flow',
    label: 'Flow field',
    description: 'Directional particles following a shifting vector field.',
  },
  {
    id: 'terrain',
    label: 'Terrain',
    description: 'Animated contour lines and topographic elevation.',
  },
  {
    id: 'orbit',
    label: 'Orbit',
    description: 'Bodies and rings moving through a small gravity system.',
  },
  {
    id: 'rain',
    label: 'Digital rain',
    description: 'Falling columns of project-seeded symbols.',
  },
] as const

export type CardAnimation = (typeof cardAnimations)[number]['id']

export const semanticColors = {
  focus: '#007CD5',
  danger: '#FF8B55',
  warning: '#FDE252',
  success: '#DEEEC4',
  info: '#92DEFF',
  errorSurface: '#FCDFDB',
  selection: '#CCC7F0',
} as const

export const appConfig = {
  name: 'Codex Ambassador Showcase',
  description:
    'Explore projects built by Codex Ambassadors, including their stories, build statistics, prompts, and final Codex responses.',
  baseUrl: 'https://codexshowcase.dev',
  auth: {
    signInPath: '/sign-in',
    signUpPath: '/sign-up',
    afterSignInPath: '/ambassador',
    afterSignUpPath: '/ambassador',
  },
  gallery: {
    pageSize: 100,
    prefetchDistance: 40,
    defaultCardAnimation: 'liquid' as CardAnimation,
    cardAnimations,
    interactiveAsciiEnabled: false,
    shaderMaxDevicePixelRatio: 1,
  },
  semanticColors,
  media: {
    provider: 'cloudflare-r2',
    r2: {
      accountId: 'e7de09954639c6b74c3dd4dcbc21abd0',
      bucketName: 'codex-showcase-media',
    },
    maxFilesPerProject: 12,
    maxImageBytes: 20 * 1024 * 1024,
    maxVideoBytes: 50 * 1024 * 1024,
    allowedContentTypes: [
      'image/avif',
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ] as Array<string>,
  },
  fallbackToSampleData: true,
  projectArtifactSchema: 'codex-showcase-project',
}

import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      '.open-next/**',
      '.wrangler/**',
      '.nitro/**',
      '.output/**',
      'node_modules/**',
      'codex-showcase-export/**',
      'docs/design-system/**',
      'cloudflare-env.d.ts',
    ],
  },
  ...nextVitals,
  ...nextTypescript,
]

export default eslintConfig

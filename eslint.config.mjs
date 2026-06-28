import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      '.nitro/**',
      '.output/**',
      'node_modules/**',
      'codex-showcase-export/**',
      'docs/design-system/**',
    ],
  },
  ...nextVitals,
  ...nextTypescript,
]

export default eslintConfig

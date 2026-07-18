import type { NextConfig } from 'next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cloudflare-CDN-Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/projects/:slug',
        headers: [
          {
            key: 'Cloudflare-CDN-Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
    ]
  },
}

export default nextConfig

initOpenNextCloudflareForDev()

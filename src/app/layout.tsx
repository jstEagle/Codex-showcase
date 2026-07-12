import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'

import { QueryProvider } from '../components/QueryProvider'
import { appConfig } from '../config/app'
import '../styles.css'

export const metadata: Metadata = {
  applicationName: appConfig.name,
  title: {
    default: appConfig.name,
    template: `%s · ${appConfig.name}`,
  },
  description: appConfig.description,
  metadataBase: new URL(appConfig.baseUrl),
  category: 'technology',
  creator: 'Codex Ambassadors',
  publisher: 'Codex Ambassador Showcase',
  keywords: [
    'Codex',
    'OpenAI',
    'Codex Ambassadors',
    'AI coding',
    'software projects',
    'prompt history',
  ],
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
      { url: '/codex-icon.png', sizes: '250x250', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: appConfig.name,
    title: appConfig.name,
    description: appConfig.description,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Codex Ambassador Showcase — projects, prompts, and build stories from the community.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: appConfig.name,
    description: appConfig.description,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const shell = (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return shell
  }

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      {shell}
    </ClerkProvider>
  )
}

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { appConfig } from '../config/app'
import '../styles.css'

export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `%s · ${appConfig.name}`,
  },
  description: appConfig.description,
  metadataBase: new URL(appConfig.baseUrl),
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

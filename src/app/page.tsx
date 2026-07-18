import type { Metadata } from 'next'

import { HomeExperience } from '../components/HomeExperience'
import { appConfig } from '../config/app'
import { listProjectsPage } from '../lib/project-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: appConfig.name },
  description: appConfig.description,
  alternates: { canonical: '/' },
}

export default async function HomePage() {
  const initialPage = await listProjectsPage()
  return <HomeExperience initialPage={initialPage} />
}

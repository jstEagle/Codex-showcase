import { auth, currentUser } from '@clerk/nextjs/server'
import { sql } from 'drizzle-orm'

import { allowedUsers } from '../db/schema'
import { getDatabase } from './db'

export type AmbassadorIdentity = {
  clerkUserId: string
  email: string
  name: string | null
}

export async function isAllowedAmbassador(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const [allowedUser] = await getDatabase()
    .select({ email: allowedUsers.email })
    .from(allowedUsers)
    .where(sql`lower(trim(${allowedUsers.email})) = ${normalizedEmail}`)
    .limit(1)

  return Boolean(allowedUser)
}

export async function getAmbassadorIdentity(): Promise<
  | { identity: AmbassadorIdentity; error?: never; status?: never }
  | { identity?: never; error: string; status: 401 | 403 | 503 }
> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return {
      error: 'Ambassador authentication is not configured.',
      status: 503,
    }
  }

  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || !userId) {
    return { error: 'Sign in with Clerk.', status: 401 }
  }

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase()

  if (!email) {
    return {
      error: 'Your Clerk account needs a primary email address.',
      status: 403,
    }
  }

  if (!(await isAllowedAmbassador(email))) {
    return {
      error: `${email} is not on the ambassador upload list.`,
      status: 403,
    }
  }

  return {
    identity: {
      clerkUserId: userId,
      email,
      name: user?.fullName ?? user?.username ?? null,
    },
  }
}

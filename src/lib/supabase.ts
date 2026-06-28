import { createClient } from '@supabase/supabase-js'

import { appConfig } from '../config/app'
import type { Database } from './database.types'

let publicClient: ReturnType<typeof createClient<Database>> | null = null
let adminClient: ReturnType<typeof createClient<Database>> | null = null

export function isSupabaseConfigured() {
  return Boolean(appConfig.supabase.url && appConfig.supabase.publishableKey)
}

export function getPublicSupabase() {
  if (!isSupabaseConfigured()) {
    return null
  }

  if (!publicClient) {
    publicClient = createClient<Database>(
      appConfig.supabase.url,
      appConfig.supabase.publishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )
  }

  return publicClient
}

export function getAdminSupabase() {
  if (!appConfig.supabase.url || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  if (!adminClient) {
    adminClient = createClient<Database>(
      appConfig.supabase.url,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )
  }

  return adminClient
}

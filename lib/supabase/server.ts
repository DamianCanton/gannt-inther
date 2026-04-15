import 'server-only'

import { createServerClient as _createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Create Supabase server client for use in Server Components and Server Actions.
 * Uses cookies() from next/headers for cookie storage.
 * 
 * @returns Supabase client configured for server-side use
 * @throws Error if required environment variables are missing
 */
export function createServerClient() {
  const cookieStore = cookies()

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Cookie setting can fail in Server Components (read-only context)
            // This is expected and can be ignored
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Cookie removal can fail in Server Components (read-only context)
          }
        },
      },
    }
  )
}

import { createBrowserClient } from '@supabase/ssr'

/**
 * Create Supabase browser client for use in Client Components.
 * Automatically handles cookies in browser environment.
 * 
 * @returns Supabase client configured for client-side use
 * @throws Error if required environment variables are missing
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

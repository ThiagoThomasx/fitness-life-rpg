import { createBrowserClient } from '@supabase/ssr'
import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '@/lib/env'
import { createMockBrowserClient } from '@/lib/mock/client'

export function createClient() {
  if (!isSupabaseConfigured) {
    return createMockBrowserClient() as ReturnType<typeof createBrowserClient>
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

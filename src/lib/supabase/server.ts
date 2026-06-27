import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '@/lib/env'
import { createMockServerClient } from '@/lib/mock/client'

export async function createClient() {
  if (!isSupabaseConfigured) {
    return createMockServerClient() as ReturnType<typeof createServerClient>
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll called from Server Component — cookies will be set by middleware
        }
      },
    },
  })
}

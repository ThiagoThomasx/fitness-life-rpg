import { MOCK_USER, MOCK_CHARACTER } from './data'

type MockSession = { user: typeof MOCK_USER } | null

let _mockSession: MockSession = null

const MOCK_SESSION_KEY = 'fitrpg_mock_session'

function loadSession(): MockSession {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(MOCK_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(session: MockSession) {
  if (typeof window === 'undefined') return
  if (session) {
    sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session))
  } else {
    sessionStorage.removeItem(MOCK_SESSION_KEY)
  }
}

export function createMockBrowserClient() {
  return {
    auth: {
      getUser: async () => {
        const session = _mockSession ?? loadSession()
        _mockSession = session
        return { data: { user: session?.user ?? null }, error: null }
      },
      signInWithPassword: async ({ email }: { email: string; password: string }) => {
        const user = { ...MOCK_USER, email }
        _mockSession = { user }
        saveSession(_mockSession)
        return { data: { user, session: { user } }, error: null }
      },
      signUp: async ({ email }: { email: string; password: string }) => {
        return { data: { user: { ...MOCK_USER, email }, session: null }, error: null }
      },
      signInWithOAuth: async () => {
        return { data: {}, error: { message: 'Google OAuth requer Supabase configurado.' } }
      },
      signOut: async () => {
        _mockSession = null
        saveSession(null)
        return { error: null }
      },
      exchangeCodeForSession: async () => ({ data: {}, error: null }),
    },
    from: (table: string) => createMockQueryBuilder(table),
  }
}

function createMockQueryBuilder(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    single: async () => {
      if (table === 'characters') return { data: MOCK_CHARACTER, error: null }
      return { data: null, error: null }
    },
    insert: async (data: unknown) => ({ data, error: null }),
    update: async (data: unknown) => ({ data, error: null }),
    delete: async () => ({ data: null, error: null }),
    order: () => builder,
    limit: () => builder,
  }
  return builder
}

export function createMockServerClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null as typeof MOCK_USER | null }, error: null }),
      exchangeCodeForSession: async () => ({ data: {}, error: null }),
    },
    from: (table: string) => createMockQueryBuilder(table),
  }
}

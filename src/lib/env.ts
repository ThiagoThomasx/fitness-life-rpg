const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const PLACEHOLDER_URL = 'https://seu-projeto.supabase.co'
const PLACEHOLDER_KEY = 'sua-anon-key-aqui'

export const isSupabaseConfigured =
  url.length > 0 &&
  key.length > 0 &&
  url !== PLACEHOLDER_URL &&
  key !== PLACEHOLDER_KEY

export const supabaseUrl = url
export const supabaseAnonKey = key

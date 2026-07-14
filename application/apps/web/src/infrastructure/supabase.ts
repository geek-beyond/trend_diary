import { createSupabaseAuthClient as buildSupabaseAuthClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

export type { SupabaseAuthClient } from '@trend-diary/authentication'

export function createSupabaseAuthClient(c: Context) {
  const supabaseUrl = c.env.SUPABASE_URL
  const supabaseAnonKey = c.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new HTTPException(503, {
      message: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
    })
  }

  return buildSupabaseAuthClient({
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    cookieHeader: c.req.header('Cookie') ?? '',
    setCookie: (value) => c.header('Set-Cookie', value, { append: true }),
  })
}

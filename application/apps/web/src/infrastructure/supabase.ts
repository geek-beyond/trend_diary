import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

export type SupabaseAuthClient = ReturnType<typeof createSupabaseAuthClient>

export function createSupabaseAuthClient(c: Context) {
  const supabaseUrl = c.env.SUPABASE_URL
  const supabaseAnonKey = c.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new HTTPException(503, {
      message: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
    })
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    // passkey(auth.passkey.*)はexperimentalなopt-inが必要。namespaceを有効化するだけで、
    // 実際に叩くのはpasskeyルートのみのため、常時有効にしても副作用はない
    auth: {
      experimental: {
        passkey: true,
      },
    },
    cookies: {
      getAll() {
        return parseCookieHeader(c.req.header('Cookie') ?? '').map((cookie) => ({
          name: cookie.name,
          value: cookie.value ?? '',
        }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // SDKが渡すoptionsでセキュリティ属性が無効化されないよう、自前の属性を後勝ちにする
          const mergedOptions = {
            ...options,
            httpOnly: true,
            secure: true,
            sameSite: 'lax' as const,
          }
          c.header('Set-Cookie', serializeCookieHeader(name, value, mergedOptions), {
            append: true,
          })
        })
      },
    },
  })
}

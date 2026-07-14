import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type { SupabaseClient }

export interface SupabaseAuthClientConfig {
  url: string
  anonKey: string
  cookieHeader: string
  setCookie: (value: string) => void
}

// Cookie の入出力を素の値(ヘッダ文字列と書き込みコールバック)で受け取り、フレームワーク(Hono等)に依存させない。
export function createSupabaseAuthClient(config: SupabaseAuthClientConfig) {
  return createServerClient(config.url, config.anonKey, {
    // passkey(auth.passkey.*)はexperimentalなopt-inが必要。namespaceを有効化するだけで、
    // 実際に叩くのはpasskeyルートのみのため、常時有効にしても副作用はない
    auth: {
      experimental: {
        passkey: true,
      },
    },
    cookies: {
      getAll() {
        return parseCookieHeader(config.cookieHeader).map((cookie) => ({
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
          config.setCookie(serializeCookieHeader(name, value, mergedOptions))
        })
      },
    },
  })
}

export type SupabaseAuthClient = ReturnType<typeof createSupabaseAuthClient>

// anonキーで動作するクライアント。テストのフィクスチャ準備でのみ使う。
export function createSupabaseClient(config: { url: string; key: string }): SupabaseClient {
  return createClient(config.url, config.key)
}

// service_role権限の管理クライアント。テストの認証ユーザー掃除でのみ使う。
export function createSupabaseAdminClient(config: {
  url: string
  serviceRoleKey: string
}): SupabaseClient {
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

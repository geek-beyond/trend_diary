import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { UnexpectedAuthError } from '../errors'

export interface AuthClientConfig {
  url: string
  anonKey: string
  cookieHeader: string
  setCookie: (value: string) => void
}

// authClientConfig が必要とする最小限のリクエスト情報。特定フレームワークに縛られないよう構造的に受ける。
export interface AuthRequestContext {
  env: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string }
  req: { header: (name: string) => string | undefined }
  header: (name: string, value: string, options?: { append?: boolean }) => void
}

// リクエストから認証クライアントの設定を組み立てる。バックエンド(Supabase)の生成はクライアントクラス内へ隠蔽する。
export function authClientConfig(context: AuthRequestContext): AuthClientConfig {
  const url = context.env.SUPABASE_URL
  const anonKey = context.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new UnexpectedAuthError(
      'Authentication backend is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
    )
  }

  return {
    url,
    anonKey,
    cookieHeader: context.req.header('Cookie') ?? '',
    setCookie: (value) => context.header('Set-Cookie', value, { append: true }),
  }
}

// Cookie の入出力を素の値で扱い、フレームワーク(Hono等)に依存させない。パッケージ内でのみ生成し外へは公開しない。
export function createBackendClient(config: AuthClientConfig) {
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

export type SupabaseAuthClient = ReturnType<typeof createBackendClient>

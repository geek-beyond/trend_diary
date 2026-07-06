import type { WorkerBindings } from '@trend-diary/common/env'
import type { LoggerType } from '@trend-diary/common/logger'
import type { Nullable } from '@trend-diary/common/types/utility'
import type CONTEXT_KEY from './middleware/context'

export interface SessionUser {
  activeUserId: bigint
  displayName?: Nullable<string>
  email: string
}

// Cloudflare Workers の Rate Limiting バインディングの型（workers-typesに含まれないため定義する）
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export interface Env {
  Bindings: WorkerBindings & {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY?: string
    // Cloudflare Turnstileのサイトキー（公開値）。未設定の環境ではウィジェットを描画しない
    TURNSTILE_SITE_KEY?: string
    // Cloudflare Turnstileのシークレットキー（秘匿）。未設定の環境ではサーバー側のCAPTCHA検証をスキップする
    TURNSTILE_SECRET_KEY?: string
    // ローカル開発などバインディング未設定の環境ではフェイルオープンするためoptional
    AUTH_RATE_LIMITER?: RateLimiter
  }
  Variables: {
    [CONTEXT_KEY.APP_LOG]: LoggerType
    [CONTEXT_KEY.SESSION_USER]: SessionUser
    [CONTEXT_KEY.SESSION_ID]: string
  }
}

declare module 'react-router' {
  interface AppLoadContext {
    cloudflare: { env: Env['Bindings'] }
  }
}

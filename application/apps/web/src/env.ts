import type { LoggerType } from '@trend-diary/logger'
import type { WorkerBindings } from '@trend-diary/runtime/env'
import type { Nullable } from '@trend-diary/std/types/utility'
import type CONTEXT_KEY from './middleware/context'

// AppLoadContext の型は load-context.ts で定義する（v8 で react-router の同名 interface が撤去されたため）

export interface SessionUser {
  activeUserId: bigint
  displayName?: Nullable<string>
  email: string
}

// Cloudflare Workers の Rate Limiting バインディングの型（workers-typesに含まれないため定義する）
interface RateLimiter {
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
    // エッジキャッシュの無効フラグ。本番は常時有効とし、テスト間分離が必要な E2E 等でのみ "true" にして無効化する
    EDGE_CACHE_DISABLED?: string
  }
  Variables: {
    [CONTEXT_KEY.APP_LOG]: LoggerType
    [CONTEXT_KEY.SESSION_USER]: SessionUser
  }
}

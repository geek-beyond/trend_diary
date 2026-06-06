import { LoggerType, LogLevel } from '@/common/logger'
import { Nullable } from '@/common/types/utility'
import type { RdbClient } from '@/infrastructure/rdb'
import CONTEXT_KEY from './middleware/context'

type D1Database = import('@cloudflare/workers-types').D1Database

export type SessionUser = {
  activeUserId: bigint
  displayName?: Nullable<string>
  email: string
}

export type Env = {
  Bindings: {
    DB?: D1Database
    // テスト(vitest/E2E)では生成済みクライアントを注入する。本番では未設定で env.DB(D1)から構築する。
    rdbClient?: RdbClient
    DISCORD_WEBHOOK_URL: string
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY?: string
    LOG_LEVEL?: LogLevel
  }
  Variables: {
    [CONTEXT_KEY.APP_LOG]: LoggerType
    [CONTEXT_KEY.SESSION_USER]: SessionUser
    [CONTEXT_KEY.SESSION_ID]: string
  }
}

declare module 'react-router' {
  interface AppLoadContext {
    whatever: string
  }
}

import { LoggerType, LogLevel } from '@trend-diary/common/logger'
import { Nullable } from '@trend-diary/common/types/utility'
import CONTEXT_KEY from './middleware/context'

type D1Database = import('@cloudflare/workers-types').D1Database

export type SessionUser = {
  activeUserId: bigint
  displayName?: Nullable<string>
  email: string
}

export type Env = {
  Bindings: {
    DB: D1Database
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
    cloudflare: { env: Env['Bindings'] }
  }
}

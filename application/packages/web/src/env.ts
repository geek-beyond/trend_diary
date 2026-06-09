import type { WorkerBindings } from '@trend-diary/common/env'
import { LoggerType } from '@trend-diary/common/logger'
import { Nullable } from '@trend-diary/common/types/utility'
import CONTEXT_KEY from './middleware/context'

export interface SessionUser {
  activeUserId: bigint
  displayName?: Nullable<string>
  email: string
}

export interface Env {
  Bindings: WorkerBindings & {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY?: string
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

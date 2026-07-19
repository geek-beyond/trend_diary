import type { Context } from 'hono'
import type { Env } from '@/env'

const CONTEXT_KEY = {
  APP_LOG: 'appLog',
  SESSION_USER: 'sessionUser',
  SESSION_ID: 'sessionId',
} as const

type ContextKey = (typeof CONTEXT_KEY)[keyof typeof CONTEXT_KEY]

// 契約上必ず存在するはずの Context 値を取得する。未設定なら `!` で握らず明示的なエラーで契約違反を顕在化させるため
export function mustGet<K extends ContextKey>(
  c: Context<Env>,
  key: K,
): NonNullable<Env['Variables'][K]> {
  const value = c.get(key)
  if (value === null || value === undefined) {
    throw new Error(`Context value for "${key}" is required but was not set`)
  }
  return value
}

export default CONTEXT_KEY

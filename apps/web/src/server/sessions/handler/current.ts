import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'

// authenticatorで検証済みのセッションをここで再検証すると、トークン期限切れ時にリフレッシュが
// 二重に走り、ローテーション済みrefresh tokenの再利用としてセッションが失効し得るため、
// contextに格納済みの検証結果を使う
export default function getCurrentSession(c: Context<Env>) {
  const logger = mustGet(c, CONTEXT_KEY.APP_LOG)
  const user = mustGet(c, CONTEXT_KEY.SESSION_USER)

  logger.info('get current user success', { activeUserId: user.activeUserId })

  return c.json({
    user: {
      displayName: user.displayName,
    },
  })
}

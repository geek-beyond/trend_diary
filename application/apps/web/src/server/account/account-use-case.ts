import getRdbClient from '@trend-diary/datastore/rdb'
import {
  type AccountUseCase,
  createAccountUseCase as createDomainAccountUseCase,
} from '@trend-diary/domain/account'
import { DiscordWebhookClient } from '@trend-diary/notification'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'

// 補償トランザクション失敗（孤児 users レコード）の運用通知に使う Notifier を、ハンドラ個別ではなく
// ここで一元的に組み立てて注入する（error-handler ミドルウェアが Discord クライアントを内部生成するのに倣う）
export function createAccountUseCase(c: Context<Env>): AccountUseCase {
  const rdb = getRdbClient(c.env.DB)
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const notifier = new DiscordWebhookClient(c.env.DISCORD_WEBHOOK_URL, logger)
  return createDomainAccountUseCase(rdb, notifier)
}

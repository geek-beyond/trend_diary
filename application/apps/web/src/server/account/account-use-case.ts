import getRdbClient from '@trend-diary/datastore/rdb'
import {
  type AccountUseCase,
  createAccountUseCase as createDomainAccountUseCase,
  type Notifier,
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
  // 通知が要るのは補償失敗時だけなので、送信時にのみクライアントを生成する。これによりセッション検証等の
  // クエリ経路（通知不要）では毎リクエストの生成を避けられる。未設定URLや送信失敗は同クライアントが握りつぶす
  const notifier: Notifier = {
    sendMessage: (content) =>
      new DiscordWebhookClient(c.env.DISCORD_WEBHOOK_URL, logger).sendMessage(content),
  }
  return createDomainAccountUseCase(rdb, notifier)
}

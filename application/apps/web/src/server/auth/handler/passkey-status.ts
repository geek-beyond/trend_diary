import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import { unwrapAuth } from '../unwrap-auth'

export default async function passkeyStatus(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const passkeys = unwrapAuth(await passkeyClient.list(), logger)
  return c.json({ hasPasskey: passkeys.length > 0 }, 200)
}

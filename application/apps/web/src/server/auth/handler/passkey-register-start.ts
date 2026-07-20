import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import { unwrapAuth } from '../unwrap-auth'

export default async function passkeyRegisterStart(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const result = unwrapAuth(await passkeyClient.startRegistration(), logger)
  return c.json({ challengeId: result.challenge_id, options: result.options }, 200)
}

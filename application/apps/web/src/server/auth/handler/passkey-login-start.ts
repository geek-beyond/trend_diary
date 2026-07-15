import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'
import toHttpException from '../auth-error'

export default async function passkeyLoginStart(c: Context<Env>) {
  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const result = await passkeyClient.startAuthentication()
  if (result.isErr()) throw toHttpException(result.error)

  return c.json({ challengeId: result.value.challenge_id, options: result.value.options }, 200)
}

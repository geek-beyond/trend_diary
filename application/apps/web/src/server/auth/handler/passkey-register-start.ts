import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'

export default async function passkeyRegisterStart(c: Context<Env>) {
  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const result = await passkeyClient.startRegistration()
  if (result.isErr()) throw result.error

  return c.json({ challengeId: result.value.challenge_id, options: result.value.options }, 200)
}

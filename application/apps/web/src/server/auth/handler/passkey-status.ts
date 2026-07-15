import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'

export default async function passkeyStatus(c: Context<Env>) {
  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const result = await passkeyClient.list()
  if (result.isErr()) throw result.error

  return c.json({ hasPasskey: result.value.length > 0 }, 200)
}

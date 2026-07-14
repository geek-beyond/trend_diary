import { handleError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import type { Context } from 'hono'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'

export default async function passkeyLoginStart(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const result = await wrapAsyncCall(() => client.auth.passkey.startAuthentication())
  if (result.isErr()) throw handleError(new ServerError(result.error), logger)

  const { data, error } = result.value
  if (error || !data) {
    throw handleError(
      new ServerError(`Passkey authentication start failed: ${error?.message}`),
      logger,
    )
  }

  return c.json({ challengeId: data.challenge_id, options: data.options }, 200)
}

import { handleError, ServerError } from '@trend-diary/common/errors'
import type { Context } from 'hono'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import { callSupabaseAuth } from '../supabase-auth'

export default async function passkeyStatus(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const result = await callSupabaseAuth(
    () => client.auth.passkey.list(),
    (error) => new ServerError(`Passkey list failed: ${error.message}`),
  )
  if (result.isErr()) throw handleError(result.error, logger)

  return c.json({ hasPasskey: result.value.length > 0 }, 200)
}

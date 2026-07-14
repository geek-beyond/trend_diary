import { ClientError, handleError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import type { PasskeyVerifyInput } from '@trend-diary/domain/user'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'

export default async function passkeyRegisterVerify(c: ZodValidatedContext<PasskeyVerifyInput>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const client = createSupabaseAuthClient(c)
  const result = await wrapAsyncCall(() =>
    client.auth.passkey.verifyRegistration({
      challengeId: valid.challengeId,
      credential: valid.credential,
    }),
  )
  if (result.isErr()) throw handleError(new ServerError(result.error), logger)

  const { data, error } = result.value
  if (error || !data) {
    // 資格情報の不一致など、ユーザーの再操作で解消しうる失敗として400で返す
    throw handleError(
      new ClientError(`Passkey registration failed: ${error?.message}`, 400),
      logger,
    )
  }

  logger.info('passkey registration success', { passkeyId: data.id })

  return c.json({ id: data.id }, 201)
}

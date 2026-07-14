import { handleError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import type { WebAuthnRegistrationOptions } from '@trend-diary/domain/user'
import type { Context } from 'hono'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'

export default async function passkeyRegisterStart(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const result = await wrapAsyncCall(() => client.auth.passkey.startRegistration())
  if (result.isErr()) throw handleError(new ServerError(result.error), logger)

  const { data, error } = result.value
  if (error || !data) {
    throw handleError(
      new ServerError(`Passkey registration start failed: ${error?.message}`),
      logger,
    )
  }

  // Supabase SDK の options を中立な WebAuthn 型へ寄せる。hints の union が SDK 側で広い（string 拡張を含む）ぶんだけ差があるため境界で単一アサーションする
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SDK 型と中立型は hints の union 幅のみ異なる構造互換のため、境界での単一アサーションに留める
  const options = data.options as WebAuthnRegistrationOptions
  return c.json({ challengeId: data.challenge_id, options }, 200)
}

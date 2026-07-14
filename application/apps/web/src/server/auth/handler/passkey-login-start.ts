import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'
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

  // Supabase SDK と @simplewebauthn の WebAuthn 型は hints の union 幅のみ異なるため、client(ceremony ライブラリ)が受ける型へ境界で寄せる
  // oxlint-disable-next-line typescript/consistent-type-assertions -- 上記のとおり構造互換だが宣言が別のため、ライブラリ境界での単一アサーションに留める
  const options = data.options as PublicKeyCredentialRequestOptionsJSON
  return c.json({ challengeId: data.challenge_id, options }, 200)
}

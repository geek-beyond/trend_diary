import { startRegistration } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { PASSKEY_STATUS_SWR_KEY } from '@/client/features/authenticate/hooks/use-passkey-status'
import { PASSKEY_MESSAGES } from '@/client/features/authenticate/model/passkey'
import getApiClientForClient from '@/client/infrastructure/api'

// passkey登録は「start(サーバーでchallenge発行) → ブラウザのWebAuthn ceremony → verify(サーバーで検証し登録)」の3段
export default function usePasskeyRegister() {
  const { mutate } = useSWRConfig()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const register = async () => {
    setIsSubmitting(true)
    const client = getApiClientForClient()

    const startResult = await wrapAsyncCall(async () => {
      const res = await client.auth.passkey.register.start.$post()
      if (!res.ok) throw new Error('passkey register start failed')
      return res.json()
    })
    if (startResult.isErr()) {
      toast.error(PASSKEY_MESSAGES.registerFailed)
      setIsSubmitting(false)
      return
    }

    const { challengeId, options } = startResult.value

    // サーバーが発行するWebAuthnオプションは不透明JSONのため、ブラウザAPIの入力型に合わせる
    // oxlint-disable-next-line typescript/consistent-type-assertions -- 不透明JSONをブラウザAPIの入力型へ変換するため
    const optionsJSON = options as unknown as PublicKeyCredentialCreationOptionsJSON

    const ceremonyResult = await wrapAsyncCall(() => startRegistration({ optionsJSON }))
    if (ceremonyResult.isErr()) {
      toast.error(PASSKEY_MESSAGES.canceled)
      setIsSubmitting(false)
      return
    }

    // WebAuthn ceremonyの結果JSONを検証用ペイロードとしてそのまま送る
    // oxlint-disable-next-line typescript/consistent-type-assertions -- ceremony結果をそのまま検証ペイロードへ渡すため
    const credential = ceremonyResult.value as unknown as Record<string, unknown>

    const verifyResult = await wrapAsyncCall(() =>
      client.auth.passkey.register.verify.$post({
        json: { challengeId, credential },
      }),
    )
    if (verifyResult.isErr() || !verifyResult.value.ok) {
      toast.error(PASSKEY_MESSAGES.registerFailed)
      setIsSubmitting(false)
      return
    }

    // 案内バナーを引っ込めるため、登録状態を再検証する
    await mutate(PASSKEY_STATUS_SWR_KEY)
    toast.success('passkeyを登録しました')
    setIsSubmitting(false)
  }

  return { isSubmitting, register }
}

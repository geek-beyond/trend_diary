import { startRegistration } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { useState } from 'react'
import { toast } from 'sonner'
import { PASSKEY_MESSAGES } from '@/client/features/authenticate/model/passkey'
import getApiClientForClient from '@/client/infrastructure/api'

export default function usePasskeyRegister() {
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
      return false
    }

    const { challengeId, options } = startResult.value

    // oxlint-disable-next-line typescript/consistent-type-assertions -- 型定義の実体はブラウザWebAuthn API側にあるため
    const optionsJSON = options as unknown as PublicKeyCredentialCreationOptionsJSON

    const ceremonyResult = await wrapAsyncCall(() => startRegistration({ optionsJSON }))
    if (ceremonyResult.isErr()) {
      toast.error(PASSKEY_MESSAGES.canceled)
      setIsSubmitting(false)
      return false
    }

    // oxlint-disable-next-line typescript/consistent-type-assertions -- 真正性はSupabaseが検証するため境界で受けるだけ
    const credential = ceremonyResult.value as unknown as Record<string, unknown>

    const verifyResult = await wrapAsyncCall(() =>
      client.auth.passkey.register.verify.$post({
        json: { challengeId, credential },
      }),
    )
    if (verifyResult.isErr() || !verifyResult.value.ok) {
      toast.error(PASSKEY_MESSAGES.registerFailed)
      setIsSubmitting(false)
      return false
    }

    toast.success(PASSKEY_MESSAGES.registered)
    setIsSubmitting(false)
    return true
  }

  return { isSubmitting, register }
}

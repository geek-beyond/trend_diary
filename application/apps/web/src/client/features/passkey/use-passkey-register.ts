import {
  type PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from '@simplewebauthn/browser'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { useState } from 'react'
import { toast } from 'sonner'
import { PASSKEY_MESSAGES } from '@/client/features/passkey/model'
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

    // Supabaseが返すoptions型はhintsのunion幅のみ@simplewebauthnより広いため、ceremony呼び出し直前で受け側の型へ寄せる
    // oxlint-disable-next-line typescript/consistent-type-assertions -- 構造互換だが宣言が別のため、ライブラリ境界での単一アサーションに留める
    const optionsJSON = options as PublicKeyCredentialCreationOptionsJSON
    const ceremonyResult = await wrapAsyncCall(() => startRegistration({ optionsJSON }))
    if (ceremonyResult.isErr()) {
      toast.error(PASSKEY_MESSAGES.canceled)
      setIsSubmitting(false)
      return false
    }

    const verifyResult = await wrapAsyncCall(() =>
      client.auth.passkey.register.verify.$post({
        json: { challengeId, credential: ceremonyResult.value },
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

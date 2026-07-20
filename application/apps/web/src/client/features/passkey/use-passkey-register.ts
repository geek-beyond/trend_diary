import {
  type PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from '@simplewebauthn/browser'
import { wrapAsyncCall } from '@trend-diary/std/result'
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
      const res = await client.passkey.register.start.$post()
      if (!res.ok) throw new Error('passkey register start failed')
      return res.json()
    })
    if (startResult.isErr()) {
      toast.error(PASSKEY_MESSAGES.registerFailed)
      setIsSubmitting(false)
      return false
    }

    const { challengeId, options } = startResult.value

    // Supabaseとceremonyライブラリ(@simplewebauthn)は同じW3CのWebAuthn JSON型を各自宣言しており、
    // hintsのunion幅だけが異なる(Supabaseは将来の追加値に備え`(string & {})`まで広い)。実行時の値は
    // 完全に同一で変換は不要なため、受け側が要求する狭い型へ境界で単一アサーションする
    // oxlint-disable-next-line typescript/consistent-type-assertions -- 上記のとおり値は同一・宣言のみ相違
    const optionsJSON = options as PublicKeyCredentialCreationOptionsJSON
    const ceremonyResult = await wrapAsyncCall(() => startRegistration({ optionsJSON }))
    if (ceremonyResult.isErr()) {
      toast.error(PASSKEY_MESSAGES.canceled)
      setIsSubmitting(false)
      return false
    }

    const verifyResult = await wrapAsyncCall(() =>
      client.passkey.register.verify.$post({
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

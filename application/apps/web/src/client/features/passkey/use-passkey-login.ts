import {
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
} from '@simplewebauthn/browser'
import { wrapAsyncCall } from '@trend-diary/std/result'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useSWRConfig } from 'swr'
import { SESSION_SWR_KEY } from '@/client/entities/auth'
import { PASSKEY_MESSAGES } from '@/client/features/passkey/model'
import getApiClientForClient from '@/client/infrastructure/api'

export default function usePasskeyLogin(redirectTo?: string) {
  const navigate = useNavigate()
  const { mutate } = useSWRConfig()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | undefined>(undefined)

  const login = async () => {
    setFormError(undefined)
    setIsSubmitting(true)
    const client = getApiClientForClient()

    const startResult = await wrapAsyncCall(async () => {
      const res = await client.passkey.login.start.$post()
      if (!res.ok) throw new Error('passkey login start failed')
      return res.json()
    })
    if (startResult.isErr()) {
      setFormError(PASSKEY_MESSAGES.loginFailed)
      setIsSubmitting(false)
      return
    }

    const { challengeId, options } = startResult.value

    // Supabaseとceremonyライブラリ(@simplewebauthn)は同じW3CのWebAuthn JSON型を各自宣言しており、
    // hintsのunion幅だけが異なる(Supabaseは将来の追加値に備え`(string & {})`まで広い)。実行時の値は
    // 完全に同一で変換は不要なため、受け側が要求する狭い型へ境界で単一アサーションする
    // oxlint-disable-next-line typescript/consistent-type-assertions -- 上記のとおり値は同一・宣言のみ相違
    const optionsJSON = options as PublicKeyCredentialRequestOptionsJSON
    const ceremonyResult = await wrapAsyncCall(() => startAuthentication({ optionsJSON }))
    if (ceremonyResult.isErr()) {
      // キャンセルは失敗ではないので中断案内に寄せる
      setFormError(PASSKEY_MESSAGES.canceled)
      setIsSubmitting(false)
      return
    }

    const verifyResult = await wrapAsyncCall(() =>
      client.passkey.login.verify.$post({
        json: { challengeId, credential: ceremonyResult.value },
      }),
    )
    if (verifyResult.isErr() || !verifyResult.value.ok) {
      setFormError(PASSKEY_MESSAGES.loginFailed)
      setIsSubmitting(false)
      return
    }

    // mutate(key)は購読中のuseSWRがないと再検証されず、遷移先ページのProtectedLayoutが
    // 古い未ログイン状態を読んでログイン画面へ押し戻してしまうため、値を直接確定させる
    await mutate(SESSION_SWR_KEY, true, { revalidate: false })
    navigate(redirectTo ?? '/trends')
  }

  return { isSubmitting, formError, login }
}

import { startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'
import { wrapAsyncCall } from '@trend-diary/common/result'
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
      const res = await client.auth.passkey.login.start.$post()
      if (!res.ok) throw new Error('passkey login start failed')
      return res.json()
    })
    if (startResult.isErr()) {
      setFormError(PASSKEY_MESSAGES.loginFailed)
      setIsSubmitting(false)
      return
    }

    const { challengeId, options } = startResult.value

    // 型はSupabase/ブラウザ側が保証するため、境界でブラウザAPIの入力型に合わせるだけに留める
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- 型定義の実体はブラウザWebAuthn API側にあり、その型境界でしか受けられないため
    const optionsJSON = options as unknown as PublicKeyCredentialRequestOptionsJSON

    const ceremonyResult = await wrapAsyncCall(() => startAuthentication({ optionsJSON }))
    if (ceremonyResult.isErr()) {
      // キャンセルは失敗ではないので中断案内に寄せる
      setFormError(PASSKEY_MESSAGES.canceled)
      setIsSubmitting(false)
      return
    }

    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- 真正性はSupabaseが検証するため、ブラウザWebAuthn APIの型境界で受けるだけのため
    const credential = ceremonyResult.value as unknown as Record<string, unknown>

    const verifyResult = await wrapAsyncCall(() =>
      client.auth.passkey.login.verify.$post({
        json: { challengeId, credential },
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

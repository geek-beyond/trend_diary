import { startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useSWRConfig } from 'swr'
import { SESSION_SWR_KEY } from '@/client/features/authenticate/hooks/use-session'
import { PASSKEY_MESSAGES } from '@/client/features/authenticate/model/passkey'
import getApiClientForClient from '@/client/infrastructure/api'

// passkeyログインは「start(サーバーでchallenge発行) → ブラウザのWebAuthn ceremony → verify(サーバーで検証しセッション確立)」の3段
export default function usePasskeyLogin() {
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

    // サーバーが発行するWebAuthnオプションは不透明JSONのため、ブラウザAPIの入力型に合わせる
    // oxlint-disable-next-line typescript/consistent-type-assertions -- 不透明JSONをブラウザAPIの入力型へ変換するため
    const optionsJSON = options as unknown as PublicKeyCredentialRequestOptionsJSON

    // OSのpasskeyダイアログ。ユーザーがキャンセルするとrejectするため、失敗は中断案内に寄せる
    const ceremonyResult = await wrapAsyncCall(() => startAuthentication({ optionsJSON }))
    if (ceremonyResult.isErr()) {
      setFormError(PASSKEY_MESSAGES.canceled)
      setIsSubmitting(false)
      return
    }

    // WebAuthn ceremonyの結果JSONを検証用ペイロードとしてそのまま送る
    // oxlint-disable-next-line typescript/consistent-type-assertions -- ceremony結果をそのまま検証ペイロードへ渡すため
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

    // 未ログイン状態のキャッシュを残さないよう再検証してから遷移する
    await mutate(SESSION_SWR_KEY)
    navigate('/trends')
  }

  return { isSubmitting, formError, login }
}

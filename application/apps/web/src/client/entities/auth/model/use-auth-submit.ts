import { wrapAsyncCall } from '@trend-diary/common/result'
import { useState } from 'react'
import { z } from 'zod'
import { AUTH_ERROR_MESSAGES } from '../lib/error-message'
import { type AuthenticateErrors, authenticateFormSchema } from './validation'

interface AuthSubmitPayload {
  email: string
  password: string
  captchaToken?: string
}

interface UseAuthSubmitParams {
  turnstileSiteKey?: string
  request: (payload: AuthSubmitPayload) => Promise<{ ok: boolean; status: number }>
  // 機能ごとに異なるステータス→文言の解決を注入する
  resolveErrorMessage: (status: number) => string
  // 成功後の遷移やキャッシュ再検証など機能固有の後処理を注入する
  onSuccess: () => void | Promise<void>
}

/**
 * login / signup で共通のフォーム送信フロー（バリデーション・CAPTCHA確認・送信・エラー整形）をまとめる。
 * エンドポイント・エラー解決・成功後処理だけが機能ごとに異なるため、それらを引数で受け取る。
 */
export default function useAuthSubmit({
  turnstileSiteKey,
  request,
  resolveErrorMessage,
  onSuccess,
}: UseAuthSubmitParams) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<AuthenticateErrors | undefined>(undefined)
  const [formError, setFormError] = useState<string | undefined>(undefined)

  const submit = async (formData: FormData) => {
    setErrors(undefined)
    setFormError(undefined)

    const validation = authenticateFormSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    })
    if (!validation.success) {
      setErrors(z.flattenError(validation.error).fieldErrors)
      return
    }

    const captchaTokenValue = formData.get('cf-turnstile-response')
    const captchaToken = typeof captchaTokenValue === 'string' ? captchaTokenValue : undefined
    // CAPTCHA有効時にトークン未取得のまま送信させない
    if (turnstileSiteKey && !captchaToken) {
      setFormError(AUTH_ERROR_MESSAGES.captchaRequired)
      return
    }

    setIsSubmitting(true)
    const result = await wrapAsyncCall(() =>
      request({
        email: validation.data.email,
        password: validation.data.password,
        captchaToken,
      }),
    )

    if (result.isErr()) {
      setFormError(AUTH_ERROR_MESSAGES.unexpected)
      setIsSubmitting(false)
      return
    }
    if (!result.value.ok) {
      setFormError(resolveErrorMessage(result.value.status))
      setIsSubmitting(false)
      return
    }

    // 成功時は遷移でアンマウントされるため、ボタンを無効のままにして二重送信を防ぐ
    await onSuccess()
  }

  return { isSubmitting, errors, formError, submit }
}

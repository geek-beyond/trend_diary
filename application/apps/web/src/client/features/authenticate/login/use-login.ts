import { wrapAsyncCall } from '@trend-diary/common/result'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useSWRConfig } from 'swr'
import { z } from 'zod'
import {
  AUTH_ERROR_MESSAGES,
  type AuthenticateErrors,
  authenticateFormSchema,
  SESSION_SWR_KEY,
} from '@/client/entities/auth'
import getApiClientForClient from '@/client/infrastructure/api'
import { resolveLoginErrorMessage } from './error-message'

export default function useLogin(turnstileSiteKey?: string) {
  const navigate = useNavigate()
  const { mutate } = useSWRConfig()
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
    const result = await wrapAsyncCall(() => {
      const client = getApiClientForClient()
      return client.auth.login.$post({
        json: {
          email: validation.data.email,
          password: validation.data.password,
          captchaToken,
        },
      })
    })

    if (result.isErr()) {
      setFormError(AUTH_ERROR_MESSAGES.unexpected)
      setIsSubmitting(false)
      return
    }
    if (!result.value.ok) {
      setFormError(resolveLoginErrorMessage(result.value.status))
      setIsSubmitting(false)
      return
    }

    // ログイン前の未ログイン状態がセッションキャッシュに残ったまま遷移しないよう再検証する
    await mutate(SESSION_SWR_KEY)
    // 成功時は遷移でアンマウントされるため、ボタンを無効のままにして二重送信を防ぐ
    navigate('/trends')
  }

  return { isSubmitting, errors, formError, submit }
}

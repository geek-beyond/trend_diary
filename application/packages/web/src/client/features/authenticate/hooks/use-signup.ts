import { wrapAsyncCall } from '@trend-diary/common/result'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  AUTH_ERROR_MESSAGES,
  resolveSignupErrorMessage,
} from '@/client/features/authenticate/lib/error-message'
import {
  type AuthenticateErrors,
  validateAuthenticateForm,
} from '@/client/features/authenticate/lib/validation'
import getApiClientForClient from '@/client/infrastructure/api'

export default function useSignup(turnstileSiteKey?: string) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<AuthenticateErrors | undefined>(undefined)
  const [formError, setFormError] = useState<string | undefined>(undefined)

  const submit = async (formData: FormData) => {
    setErrors(undefined)
    setFormError(undefined)

    const validation = validateAuthenticateForm(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
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
      return client.auth.signup.$post({
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
      setFormError(resolveSignupErrorMessage(result.value.status))
      setIsSubmitting(false)
      return
    }

    // 成功時は遷移でアンマウントされるため、ボタンを無効のままにして二重送信を防ぐ
    navigate('/login')
  }

  return { isSubmitting, errors, formError, submit }
}

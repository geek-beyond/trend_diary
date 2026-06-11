import { wrapAsyncCall } from '@trend-diary/common/result'
import { useState } from 'react'
import { AUTH_ERROR_MESSAGES } from '@/client/features/authenticate/error-message'
import {
  type AuthenticateErrors,
  type AuthenticateFormData,
  validateAuthenticateForm,
} from '@/client/features/authenticate/validation'

interface AuthApiResponse {
  ok: boolean
  status: number
}

type AuthSubmitInput = AuthenticateFormData & { captchaToken?: string }

interface UseAuthSubmitParams {
  turnstileSiteKey?: string
  post: (input: AuthSubmitInput) => Promise<AuthApiResponse>
  resolveErrorMessage: (status: number) => string
  onSuccess: () => Promise<void> | void
}

// login/signupはエンドポイント・遷移先・エラー解決のみが異なるため、検証〜送信〜エラー処理の流れを共通化する
export default function useAuthSubmit({
  turnstileSiteKey,
  post,
  resolveErrorMessage,
  onSuccess,
}: UseAuthSubmitParams) {
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
    const result = await wrapAsyncCall(() =>
      post({ email: validation.data.email, password: validation.data.password, captchaToken }),
    )
    setIsSubmitting(false)

    if (result.isErr()) {
      setFormError(AUTH_ERROR_MESSAGES.unexpected)
      return
    }
    if (!result.value.ok) {
      setFormError(resolveErrorMessage(result.value.status))
      return
    }

    await onSuccess()
  }

  return { isSubmitting, errors, formError, submit }
}

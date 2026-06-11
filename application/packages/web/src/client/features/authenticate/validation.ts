import { type AuthInput, authInputSchema } from '@trend-diary/domain/user'
import { z } from 'zod'
import {
  newValidationError,
  newValidationSuccess,
  type ValidationResult,
} from './validation-result'

// oxlint-disable-next-line typescript/consistent-type-definitions -- Record<string, unknown> 制約を満たすため type エイリアスを使う
export type AuthenticateErrors = {
  email?: string[]
  password?: string[]
}

export type AuthenticateFormData = AuthInput

export function validateAuthenticateForm(
  formData: FormData,
): ValidationResult<AuthenticateFormData, AuthenticateErrors> {
  const email = formData.get('email')
  const password = formData.get('password')

  const result = authInputSchema.pick({ email: true, password: true }).safeParse({
    email,
    password,
  })

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error)
    return newValidationError<AuthenticateErrors>({
      email: fieldErrors.email,
      password: fieldErrors.password,
    })
  }

  return newValidationSuccess<AuthenticateFormData>({
    email: result.data.email,
    password: result.data.password,
  })
}

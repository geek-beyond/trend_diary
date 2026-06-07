import { AuthInput, authInputSchema } from '@trend-diary/domain/user'
import { z } from 'zod'
import { newValidationError, newValidationSuccess, ValidationResult } from '../validation'

export type AuthenticateErrors = {
  email?: string[]
  password?: string[]
}

export type AuthenticateFormData = AuthInput

export function validateAuthenticateForm(
  formData: FormData,
): ValidationResult<AuthenticateFormData, AuthenticateErrors> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const result = authInputSchema.pick({ email: true, password: true }).safeParse({
    email,
    password,
  })

  if (!result.success) {
    return newValidationError<AuthenticateErrors>(
      z.flattenError(result.error).fieldErrors as AuthenticateErrors,
    )
  }

  return newValidationSuccess<AuthenticateFormData>({
    email: result.data.email,
    password: result.data.password,
  })
}

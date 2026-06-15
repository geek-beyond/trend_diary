import { type AuthInput, authInputSchema } from '@trend-diary/domain/user'
import { z } from 'zod'

export interface AuthenticateErrors {
  email?: string[]
  password?: string[]
}

export type AuthenticateFormData = AuthInput

type ValidateAuthenticateFormResult =
  | {
      isValid: true
      data: AuthenticateFormData
    }
  | {
      isValid: false
      errors: AuthenticateErrors
    }

export function validateAuthenticateForm(formData: FormData): ValidateAuthenticateFormResult {
  const email = formData.get('email')
  const password = formData.get('password')

  const result = authInputSchema.pick({ email: true, password: true }).safeParse({
    email,
    password,
  })

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error)
    return {
      isValid: false,
      errors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    }
  }

  return {
    isValid: true,
    data: {
      email: result.data.email,
      password: result.data.password,
    },
  }
}

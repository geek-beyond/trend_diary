import { authInputSchema } from '@trend-diary/domain/account'

export interface AuthenticateErrors {
  email?: string[]
  password?: string[]
}

export const authenticateFormSchema = authInputSchema.pick({ email: true, password: true })

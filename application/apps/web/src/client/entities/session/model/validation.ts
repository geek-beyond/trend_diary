import { authInputSchema } from '@trend-diary/domain/account/schema/auth-schema'

export interface AuthenticateErrors {
  email?: string[]
  password?: string[]
}

export const authenticateFormSchema = authInputSchema.pick({ email: true, password: true })

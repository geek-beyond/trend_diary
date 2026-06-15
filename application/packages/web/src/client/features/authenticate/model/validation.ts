import { authInputSchema } from '@trend-diary/domain/user'

export interface AuthenticateErrors {
  email?: string[]
  password?: string[]
}

export const authenticateFormSchema = authInputSchema.pick({ email: true, password: true })

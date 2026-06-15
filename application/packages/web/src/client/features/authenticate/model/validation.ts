import { authInputSchema } from '@trend-diary/domain/user'

export interface AuthenticateErrors {
  email?: string[]
  password?: string[]
}

const authenticateFormSchema = authInputSchema.pick({ email: true, password: true })

export function validateAuthenticateForm(formData: FormData) {
  return authenticateFormSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
}

import { AUTH_ERROR_MESSAGES, resolveCommonAuthErrorMessage } from '@/client/entities/session'

const SIGNUP_ALREADY_EXISTS_ERROR_MESSAGE = 'このメールアドレスは既に使用されています'

export const resolveSignupErrorMessage = (status: number): string => {
  switch (status) {
    case 409:
      return SIGNUP_ALREADY_EXISTS_ERROR_MESSAGE
    default:
      return resolveCommonAuthErrorMessage(status) ?? AUTH_ERROR_MESSAGES.unexpected
  }
}

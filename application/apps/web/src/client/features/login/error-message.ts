import { AUTH_ERROR_MESSAGES, resolveCommonAuthErrorMessage } from '@/client/entities/session'

const INVALID_LOGIN_CREDENTIALS_ERROR_MESSAGE = 'メールアドレスまたはパスワードが正しくありません'

export const resolveLoginErrorMessage = (status: number): string => {
  switch (status) {
    case 401:
    case 404:
      return INVALID_LOGIN_CREDENTIALS_ERROR_MESSAGE
    default:
      return resolveCommonAuthErrorMessage(status) ?? AUTH_ERROR_MESSAGES.unexpected
  }
}

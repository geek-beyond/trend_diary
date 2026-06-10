const UNEXPECTED_AUTH_ERROR_MESSAGE = '予期せぬエラーが発生しました。'
const AUTH_SERVER_ERROR_MESSAGE = 'サーバーエラーが発生しました。時間をおいて再度お試しください。'
const INVALID_LOGIN_CREDENTIALS_ERROR_MESSAGE = 'メールアドレスまたはパスワードが正しくありません'
const SIGNUP_ALREADY_EXISTS_ERROR_MESSAGE = 'このメールアドレスは既に使用されています'
const CAPTCHA_REQUIRED_ERROR_MESSAGE = 'セキュリティ認証を完了してください。'

const getStatusCode = (error: unknown): number | null => {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = error.statusCode
    if (typeof statusCode === 'number') {
      return statusCode
    }
  }

  return null
}

export const resolveLoginErrorMessage = (error: unknown): string => {
  const statusCode = getStatusCode(error)
  if (statusCode === 401 || statusCode === 404) {
    return INVALID_LOGIN_CREDENTIALS_ERROR_MESSAGE
  }

  // CAPTCHA検証失敗はサーバーが403で返す
  if (statusCode === 403) {
    return CAPTCHA_REQUIRED_ERROR_MESSAGE
  }

  if (statusCode === 500) {
    return AUTH_SERVER_ERROR_MESSAGE
  }

  return UNEXPECTED_AUTH_ERROR_MESSAGE
}

export const resolveSignupErrorMessage = (error: unknown): string => {
  const statusCode = getStatusCode(error)
  if (statusCode === 409) {
    return SIGNUP_ALREADY_EXISTS_ERROR_MESSAGE
  }

  // CAPTCHA検証失敗はサーバーが403で返す
  if (statusCode === 403) {
    return CAPTCHA_REQUIRED_ERROR_MESSAGE
  }

  if (statusCode === 500) {
    return AUTH_SERVER_ERROR_MESSAGE
  }

  return UNEXPECTED_AUTH_ERROR_MESSAGE
}

export const AUTH_ERROR_MESSAGES = {
  unexpected: UNEXPECTED_AUTH_ERROR_MESSAGE,
  captchaRequired: CAPTCHA_REQUIRED_ERROR_MESSAGE,
}

const UNEXPECTED_AUTH_ERROR_MESSAGE = '予期せぬエラーが発生しました。'
const AUTH_SERVER_ERROR_MESSAGE = 'サーバーエラーが発生しました。時間をおいて再度お試しください。'
const INVALID_LOGIN_CREDENTIALS_ERROR_MESSAGE = 'メールアドレスまたはパスワードが正しくありません'
const SIGNUP_ALREADY_EXISTS_ERROR_MESSAGE = 'このメールアドレスは既に使用されています'

const getStatusCode = (error: unknown): number | null => {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = error.statusCode
    if (typeof statusCode === 'number') {
      return statusCode
    }
  }

  if (!(error instanceof Error)) {
    return null
  }

  const matched = /^HTTP (\d{3}):/.exec(error.message)
  if (!matched) {
    return null
  }

  const statusCode = Number(matched[1])
  return Number.isNaN(statusCode) ? null : statusCode
}

export const resolveLoginErrorMessage = (error: unknown): string => {
  const statusCode = getStatusCode(error)
  if (statusCode === 401 || statusCode === 404) {
    return INVALID_LOGIN_CREDENTIALS_ERROR_MESSAGE
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

  if (statusCode === 500) {
    return AUTH_SERVER_ERROR_MESSAGE
  }

  return UNEXPECTED_AUTH_ERROR_MESSAGE
}

export const AUTH_ERROR_MESSAGES = {
  unexpected: UNEXPECTED_AUTH_ERROR_MESSAGE,
}

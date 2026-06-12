import {
  AUTH_ERROR_MESSAGES,
  resolveLoginErrorMessage,
  resolveSignupErrorMessage,
} from './error-message'

describe('authenticate error-message', () => {
  describe('resolveLoginErrorMessage', () => {
    it.each([
      { status: 401, expected: 'メールアドレスまたはパスワードが正しくありません' },
      { status: 404, expected: 'メールアドレスまたはパスワードが正しくありません' },
      { status: 403, expected: 'セキュリティ認証を完了してください。' },
      {
        status: 429,
        expected: '試行回数が上限に達しました。しばらく時間をおいて再度お試しください。',
      },
      { status: 500, expected: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' },
      { status: 503, expected: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' },
      { status: 400, expected: AUTH_ERROR_MESSAGES.unexpected },
    ])('ステータス$statusは「$expected」になる', ({ status, expected }) => {
      expect(resolveLoginErrorMessage(status)).toBe(expected)
    })
  })

  describe('resolveSignupErrorMessage', () => {
    it.each([
      { status: 409, expected: 'このメールアドレスは既に使用されています' },
      { status: 403, expected: 'セキュリティ認証を完了してください。' },
      {
        status: 429,
        expected: '試行回数が上限に達しました。しばらく時間をおいて再度お試しください。',
      },
      { status: 500, expected: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' },
      { status: 503, expected: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' },
      { status: 400, expected: AUTH_ERROR_MESSAGES.unexpected },
    ])('ステータス$statusは「$expected」になる', ({ status, expected }) => {
      expect(resolveSignupErrorMessage(status)).toBe(expected)
    })
  })
})

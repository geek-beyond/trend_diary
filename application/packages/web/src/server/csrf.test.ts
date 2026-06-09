import TEST_ENV from '@/test/env'
import app from '../server'

// app.requestが生成するリクエストURLのオリジン
const SAME_ORIGIN = 'http://localhost'

describe('CSRF対策ミドルウェア', () => {
  async function requestLogin(headers: Record<string, string>, body: string) {
    return app.request('/api/auth/login', { method: 'POST', headers, body }, TEST_ENV)
  }

  it('フォーム送信かつクロスオリジンのOriginは403で拒否する', async () => {
    const res = await requestLogin(
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://evil.example.com',
      },
      'email=attacker@example.com&password=Test@password123',
    )

    expect(res.status).toBe(403)
  })

  it('Content-Typeが無いリクエスト（text/plain扱い）もクロスオリジンなら403で拒否する', async () => {
    const res = await requestLogin({ Origin: 'https://evil.example.com' }, 'noop')

    expect(res.status).toBe(403)
  })

  it('フォーム送信でも同一オリジンのOriginはCSRFで拒否しない', async () => {
    const res = await requestLogin(
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: SAME_ORIGIN,
      },
      'email=user@example.com&password=Test@password123',
    )

    expect(res.status).not.toBe(403)
  })

  it('JSONリクエストはOriginが無くてもCSRFの検査対象外で通過する', async () => {
    const res = await requestLogin(
      { 'Content-Type': 'application/json' },
      JSON.stringify({ email: 'not-an-email', password: 'short' }),
    )

    // CSRFで拒否されず、バリデーション（422）まで到達することを確認する
    expect(res.status).not.toBe(403)
    expect(res.status).toBe(422)
  })
})

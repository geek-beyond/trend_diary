import TEST_ENV from '@/test/env'
import app from '../server'

// app.requestが生成するリクエストURLのオリジン
const SAME_ORIGIN = 'http://localhost'
const CROSS_ORIGIN = 'https://evil.example.com'

describe('CSRF対策ミドルウェア', () => {
  // バリデーションで422になる入力。CSRFを通過した場合に422、拒否された場合に403で区別する
  const body = JSON.stringify({ email: 'not-an-email', password: 'short' })

  const testCases: Array<{ name: string; headers: Record<string, string>; status: number }> = [
    {
      name: 'フォーム送信かつクロスオリジンのOriginは403で拒否する',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: CROSS_ORIGIN },
      status: 403,
    },
    {
      name: 'Content-Typeが無い（text/plain扱い）クロスオリジンも403で拒否する',
      headers: { Origin: CROSS_ORIGIN },
      status: 403,
    },
    {
      name: 'フォーム送信でも同一オリジンはCSRFを通過する',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: SAME_ORIGIN },
      status: 422,
    },
    {
      name: 'JSONリクエストはOriginが無くてもCSRFの検査対象外で通過する',
      headers: { 'Content-Type': 'application/json' },
      status: 422,
    },
  ]

  testCases.forEach(({ name, headers, status }) => {
    it(name, async () => {
      const res = await app.request('/api/auth/login', { method: 'POST', headers, body }, TEST_ENV)
      expect(res.status).toBe(status)
    })
  })
})

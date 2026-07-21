import app from '@/server'
import TEST_ENV from '@/test/env'

// app.requestが生成するリクエストURLのオリジン
const SAME_ORIGIN = 'http://localhost'
const CROSS_ORIGIN = 'https://evil.example.com'

describe('CSRF対策ミドルウェア', () => {
  // バリデーションで422になる入力。CSRFを通過した場合に422、拒否された場合に403で区別する
  const body = JSON.stringify({ email: 'not-an-email', password: 'short' })

  const groups: Array<{
    group: string
    cases: Array<{ name: string; headers: Record<string, string>; status: number }>
  }> = [
    {
      group: '正常系',
      cases: [
        {
          name: 'JSONリクエスト（通常のAPIクライアント）は検査対象外で通過する',
          headers: { 'Content-Type': 'application/json' },
          status: 422,
        },
      ],
    },
    {
      group: '準正常系',
      cases: [
        {
          name: '同一オリジンのフォーム送信もCSRFを通過する',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: SAME_ORIGIN },
          status: 422,
        },
      ],
    },
    {
      group: '異常系',
      cases: [
        {
          name: 'クロスオリジンのフォーム送信は403で拒否する',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: CROSS_ORIGIN },
          status: 403,
        },
        {
          name: 'Content-Typeが無い（text/plain扱い）クロスオリジンも403で拒否する',
          headers: { Origin: CROSS_ORIGIN },
          status: 403,
        },
      ],
    },
  ]

  groups.forEach(({ group, cases }) => {
    describe(group, () => {
      cases.forEach(({ name, headers, status }) => {
        it(name, async () => {
          const res = await app.request(
            '/api/sessions',
            { method: 'POST', headers, body },
            TEST_ENV,
          )
          expect(res.status).toBe(status)
        })
      })
    })
  })
})

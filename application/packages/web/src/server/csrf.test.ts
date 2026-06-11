import TEST_ENV from '@/test/env'
import app from '../server'

// app.requestが生成するリクエストURLのオリジン
const SAME_ORIGIN = 'http://localhost'
const CROSS_ORIGIN = 'https://evil.example.com'

// 認証エンドポイントは csrf（フォーム系Content-Type）と sameOriginGuard（Content-Type不問）の
// 2層で同一オリジンを強制する。actionがフォームをJSONへ変換してin-process呼び出しするため、
// JSONリクエストも検査対象に含める必要がある
describe('認証エンドポイントのCSRF対策（csrf + sameOriginGuard）', () => {
  // バリデーションで422になる入力。ガードを通過した場合に422、拒否された場合に403で区別する
  const body = JSON.stringify({ email: 'not-an-email', password: 'short' })

  const groups: Array<{
    group: string
    cases: Array<{ name: string; headers: Record<string, string>; status: number }>
  }> = [
    {
      group: '正常系',
      cases: [
        {
          name: '同一オリジンのJSONリクエスト（Sec-Fetch-Site）は通過する',
          headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' },
          status: 422,
        },
        {
          name: '同一オリジンのJSONリクエスト（Origin）は通過する',
          headers: { 'Content-Type': 'application/json', Origin: SAME_ORIGIN },
          status: 422,
        },
      ],
    },
    {
      group: '準正常系',
      cases: [
        {
          name: '同一オリジンのフォーム送信もガードを通過する',
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
        {
          name: 'クロスオリジンのJSONリクエストはsameOriginGuardが403で拒否する',
          headers: { 'Content-Type': 'application/json', Origin: CROSS_ORIGIN },
          status: 403,
        },
        {
          name: 'オリジン情報が無いJSONリクエストもsameOriginGuardが403で拒否する',
          headers: { 'Content-Type': 'application/json' },
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
            '/api/auth/login',
            { method: 'POST', headers, body },
            TEST_ENV,
          )
          expect(res.status).toBe(status)
        })
      })
    })
  })
})

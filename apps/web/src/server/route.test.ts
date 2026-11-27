import { apiRequest } from '@/test/helper/request'

describe('GET /api/health', () => {
  it('正常系: 200とstatus okを返し、共通のセキュリティヘッダーを付与する', async () => {
    const res = await apiRequest('/api/health', { method: 'GET' })

    expect(res.status).toBe(200)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'")
    expect(res.headers.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload',
    )

    const body: { status: string } = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })
})

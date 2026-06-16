import app from '@/server'
import TEST_ENV from '@/test/env'

describe('GET /api/health', () => {
  it('正常系: 200とstatus okを返す', async () => {
    const res = await app.request('/api/health', { method: 'GET' }, TEST_ENV)

    expect(res.status).toBe(200)

    const body: { status: string } = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })
})

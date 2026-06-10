import TEST_ENV from '@/test/env'
import app from '../server'

describe('GET /api/health', () => {
  it('正常系: 200とstatus okを返す', async () => {
    const res = await app.request('/api/health', { method: 'GET' }, TEST_ENV)

    expect(res.status).toBe(200)

    const body = (await res.json()) as { status: string }
    expect(body).toEqual({ status: 'ok' })
  })
})

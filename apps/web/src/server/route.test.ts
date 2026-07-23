import { apiRequest } from '@/test/helper/request'

describe('GET /api/health', () => {
  it('正常系: 200とstatus okを返す', async () => {
    const res = await apiRequest('/api/health', { method: 'GET' })

    expect(res.status).toBe(200)

    const body: { status: string } = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })
})

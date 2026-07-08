import { ServerError } from '@trend-diary/common/errors'
import type * as ArticleModule from '@trend-diary/domain/article'
import { err, ok } from 'neverthrow'
import { vi } from 'vitest'
import TEST_ENV from '@/test/env'

// 認証を通したうえで取得ユースケースの失敗のみを再現する
vi.mock('@/middleware/authenticator/validate', () => ({
  validateSession: () =>
    Promise.resolve(
      ok({
        sessionUser: { activeUserId: 1n, displayName: 'test', email: 'test@example.com' },
      }),
    ),
}))

vi.mock('@trend-diary/domain/article', async (importOriginal) => {
  const actual = await importOriginal<typeof ArticleModule>()
  return {
    ...actual,
    createArticleUseCase: () => ({
      getUnreadDigestionArticles: () =>
        Promise.resolve(err(new ServerError(new Error('取得に失敗しました')))),
    }),
  }
})

import app from '@/server'

describe('GET /api/articles/unread-digestion 異常系', () => {
  it('取得でServerErrorが発生した場合は500を返す', async () => {
    const res = await app.request('/api/articles/unread-digestion', { method: 'GET' }, TEST_ENV)
    expect(res.status).toBe(500)
  })
})

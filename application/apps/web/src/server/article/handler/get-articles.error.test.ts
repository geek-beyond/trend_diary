import { ServerError } from '@trend-diary/common/errors'
import type * as ArticleModule from '@trend-diary/domain/article'
import { err } from 'neverthrow'
import { vi } from 'vitest'
import TEST_ENV from '@/test/env'

// 検索ユースケースが失敗するケースを再現するため、記事集約のファクトリを差し替える
vi.mock('@trend-diary/domain/article', async (importOriginal) => {
  const actual = await importOriginal<typeof ArticleModule>()
  return {
    ...actual,
    createArticleUseCase: () => ({
      searchArticles: () => Promise.resolve(err(new ServerError(new Error('検索に失敗しました')))),
    }),
  }
})

import app from '@/server'

describe('GET /api/articles 異常系', () => {
  it('検索でServerErrorが発生した場合は500を返す', async () => {
    const res = await app.request('/api/articles', { method: 'GET' }, TEST_ENV)
    expect(res.status).toBe(500)
  })
})

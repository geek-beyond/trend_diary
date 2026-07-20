import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import useReadArticle from './use-read-article'

const mockApiClient = {
  articles: {
    ':article_id': {
      read: {
        $post: vi.fn(),
      },
      unread: {
        $delete: vi.fn(),
      },
    },
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするため any と型アサーションを許可する
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

describe('useReadArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  describe('markAsRead', () => {
    it('記事を既読にできる', async () => {
      mockApiClient.articles[':article_id'].read.$post.mockResolvedValue({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({ message: '記事を既読にしました' }),
      })

      const { result } = renderHook(() => useReadArticle())

      let success = false
      await act(async () => {
        success = await result.current.markAsRead('123')
      })

      expect(success).toBe(true)
      expect(mockApiClient.articles[':article_id'].read.$post).toHaveBeenCalledWith(
        {
          param: { article_id: '123' },
          json: { read_at: expect.any(String) },
        },
        { init: { credentials: 'include' } },
      )
    })

    it('既読API失敗時はfalseを返しエラートーストを表示', async () => {
      mockApiClient.articles[':article_id'].read.$post.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const { result } = renderHook(() => useReadArticle())

      let success = true
      await act(async () => {
        success = await result.current.markAsRead('123')
      })

      expect(success).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('既読に失敗しました')
    })

    it('既読APIが401の場合はfalseを返すがエラートーストは表示しない', async () => {
      mockApiClient.articles[':article_id'].read.$post.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const { result } = renderHook(() => useReadArticle())

      let success = true
      await act(async () => {
        success = await result.current.markAsRead('123')
      })

      expect(success).toBe(false)
      expect(toast.error).not.toHaveBeenCalledWith('既読に失敗しました')
    })
  })

  describe('markAsUnread', () => {
    it('記事を未読にできる', async () => {
      mockApiClient.articles[':article_id'].unread.$delete.mockResolvedValue({
        ok: true,
        status: 204,
      })

      const { result } = renderHook(() => useReadArticle())

      let success = false
      await act(async () => {
        success = await result.current.markAsUnread('123')
      })

      expect(success).toBe(true)
      expect(mockApiClient.articles[':article_id'].unread.$delete).toHaveBeenCalledWith(
        {
          param: { article_id: '123' },
        },
        { init: { credentials: 'include' } },
      )
    })

    it('未読API失敗時はfalseを返しエラートーストを表示', async () => {
      mockApiClient.articles[':article_id'].unread.$delete.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const { result } = renderHook(() => useReadArticle())

      let success = true
      await act(async () => {
        success = await result.current.markAsUnread('123')
      })

      expect(success).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('未読に失敗しました')
    })

    it('未読APIが401の場合はfalseを返すがエラートーストは表示しない', async () => {
      mockApiClient.articles[':article_id'].unread.$delete.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const { result } = renderHook(() => useReadArticle())

      let success = true
      await act(async () => {
        success = await result.current.markAsUnread('123')
      })

      expect(success).toBe(false)
      expect(toast.error).not.toHaveBeenCalledWith('未読に失敗しました')
    })
  })
})

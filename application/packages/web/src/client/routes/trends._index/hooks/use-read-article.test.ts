import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import useReadArticle from './use-read-article'

const mockApiClient = {
  articles: {
    ':article_id': {
      read: {
        // biome-ignore lint/style/useNamingConvention: $post is a Hono client method name
        $post: vi.fn(),
      },
      unread: {
        // biome-ignore lint/style/useNamingConvention: $delete is a Hono client method name
        $delete: vi.fn(),
      },
    },
  },
}

// biome-ignore lint/suspicious/noExplicitAny: getApiClientForClientの型が面倒なのでanyを使用
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

describe('useReadArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  describe('markAsRead', () => {
    it('記事を既読にできる', async () => {
      mockApiClient.articles[':article_id'].read.$post.mockResolvedValue({
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
        status: 500,
      })

      const { result } = renderHook(() => useReadArticle())

      let success = true
      await act(async () => {
        success = await result.current.markAsRead('123')
      })

      expect(success).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('既読に失敗しました')
    })
  })

  describe('markAsUnread', () => {
    it('記事を未読にできる', async () => {
      mockApiClient.articles[':article_id'].unread.$delete.mockResolvedValue({
        status: 200,
        json: vi.fn().mockResolvedValue({ message: '記事を未読にしました' }),
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
        status: 500,
      })

      const { result } = renderHook(() => useReadArticle())

      let success = true
      await act(async () => {
        success = await result.current.markAsUnread('123')
      })

      expect(success).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('未読に失敗しました')
    })
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'
import { ClientError } from '@trend-diary/std/errors'
import { createElement, type ReactNode } from 'react'
import { toast } from 'sonner'
import { SWRConfig } from 'swr'
import { ALL_MEDIA, type SelectedMedia, useReadArticle } from '@/client/features/article'
import type * as UseArticlesModule from '@/client/features/article/hooks/use-articles'
import { completionPendingStorage } from '@/client/features/inbox/model/completion-pending-storage'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'
import useUnreadDigestion, { type Article } from './use-unread-digestion'

vi.mock('@/client/infrastructure/create-swr-fetcher', () => ({
  default: vi.fn(),
}))

vi.mock('@/client/features/article', async () => {
  const media = await vi.importActual<typeof UseArticlesModule>(
    '@/client/features/article/hooks/use-articles',
  )
  return {
    useReadArticle: vi.fn(),
    ALL_MEDIA: media.ALL_MEDIA,
    isAllMediaSelected: media.isAllMediaSelected,
  }
})

const mockedCreateSWRFetcher = vi.mocked(createSWRFetcher)
const mockedUseReadArticle = vi.mocked(useReadArticle)

const mockUnreadDigestionGet = vi.fn()
const mockSkipPost = vi.fn()
const mockApiCall = vi.fn(async <T>(apiCall: () => Promise<T>) => apiCall())
const mockMarkAsRead = vi.fn()

const baseArticle: Article = {
  articleId: 'article-1',
  media: 'qiita',
  title: 'テスト記事',
  author: 'tester',
  description: 'これはテスト記事',
  url: 'https://example.com/articles/1',
  createdAt: new Date('2026-03-08T00:00:00.000Z'),
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    SWRConfig,
    { value: { provider: () => new Map(), dedupingInterval: 0 } },
    children,
  )
}

describe('useUnreadDigestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    sessionStorage.clear()
    vi.spyOn(window, 'open').mockImplementation(() => null)
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })

    mockedUseReadArticle.mockReturnValue({
      markAsRead: mockMarkAsRead.mockResolvedValue(true),
      markAsUnread: vi.fn().mockResolvedValue(true),
      isLoading: false,
    })

    // oxlint-disable-next-line typescript/consistent-type-assertions -- Hono client は深くネストした型を持ち、テストでは利用する一部のみをモックするため二重アサーションで橋渡しする
    mockedCreateSWRFetcher.mockReturnValue({
      fetcher: vi.fn(),
      apiCall: mockApiCall,
      client: {
        articles: {
          'unread-digestion': {
            $get: mockUnreadDigestionGet,
          },
          ':article_id': {
            skip: {
              $post: mockSkipPost,
            },
          },
        },
      },
      // oxlint-disable-next-line typescript/no-restricted-types -- 一部のみをモックした値を実型へ橋渡しするための境界キャストのため
    } as unknown as ReturnType<typeof createSWRFetcher>)
  })

  it('初回ロードが0件でも完了演出フラグは立たない', async () => {
    mockUnreadDigestionGet.mockResolvedValue({
      data: [],
      total: 0,
    })

    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.remainingCount).toBe(0)
    expect(result.current.isJustCompleted).toBe(false)
  })

  it('最後の1件をスキップして0件になると完了演出フラグが1回立つ', async () => {
    mockUnreadDigestionGet.mockResolvedValue({
      data: [baseArticle],
      total: 1,
    })
    mockSkipPost.mockResolvedValue({
      status: 201,
    })

    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

    await waitFor(() => {
      expect(result.current.remainingCount).toBe(1)
    })

    await act(async () => {
      await result.current.handleSkip()
    })

    await waitFor(() => {
      expect(result.current.remainingCount).toBe(0)
      expect(result.current.isJustCompleted).toBe(true)
    })

    await waitFor(
      () => {
        expect(result.current.isJustCompleted).toBe(false)
      },
      { timeout: 4000 },
    )
  })

  it('フィルタ変更で0件になっても完了演出フラグは立たない', async () => {
    mockUnreadDigestionGet
      .mockResolvedValueOnce({
        data: [baseArticle],
        total: 1,
      })
      .mockResolvedValueOnce({
        data: [],
        total: 0,
      })

    const initialProps: { selectedMedia: SelectedMedia } = { selectedMedia: ALL_MEDIA }
    const { result, rerender } = renderHook(
      ({ selectedMedia }: { selectedMedia: SelectedMedia }) => useUnreadDigestion(selectedMedia),
      {
        initialProps,
        wrapper,
      },
    )

    await waitFor(() => {
      expect(result.current.remainingCount).toBe(1)
    })

    rerender({ selectedMedia: ['qiita', 'zenn'] })

    await waitFor(() => {
      expect(result.current.remainingCount).toBe(0)
    })

    expect(result.current.isJustCompleted).toBe(false)
  })

  it('最後の1件を読む時にタブ非表示なら、復帰時に完了演出フラグが立つ', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    mockUnreadDigestionGet.mockResolvedValue({
      data: [baseArticle],
      total: 1,
    })

    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

    await waitFor(() => {
      expect(result.current.remainingCount).toBe(1)
    })

    await act(async () => {
      await result.current.handleRead()
    })

    await waitFor(() => {
      expect(result.current.remainingCount).toBe(0)
    })
    expect(result.current.isJustCompleted).toBe(false)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => {
      expect(result.current.isJustCompleted).toBe(true)
    })
  })

  it('保留中のままタブが可視でマウントすると復帰時の完了演出フラグが立つ', async () => {
    // 非表示中に最後の1件を消化して保留になった後、可視状態で再マウントされた状況を再現する
    completionPendingStorage.set(true)
    mockUnreadDigestionGet.mockResolvedValue({
      data: [],
      total: 0,
    })

    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

    await waitFor(() => {
      expect(result.current.isJustCompleted).toBe(true)
    })
  })

  it('バッチを消化しきっても未読が残っていれば次バッチを取得し、完了演出は出さない', async () => {
    const nextArticle: Article = {
      ...baseArticle,
      articleId: 'article-2',
      title: 'テスト記事2',
    }
    mockUnreadDigestionGet
      .mockResolvedValueOnce({
        data: [baseArticle],
        total: 2,
      })
      .mockResolvedValueOnce({
        data: [nextArticle],
        total: 1,
      })
    mockSkipPost.mockResolvedValue({
      status: 201,
    })

    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

    await waitFor(() => {
      expect(result.current.currentArticle?.articleId).toBe('article-1')
    })
    expect(result.current.remainingCount).toBe(2)

    await act(async () => {
      await result.current.handleSkip()
    })

    await waitFor(() => {
      expect(result.current.currentArticle?.articleId).toBe('article-2')
    })
    expect(result.current.remainingCount).toBe(1)
    expect(result.current.isJustCompleted).toBe(false)
  })

  it('次バッチ取得が同一応答(SWRが更新しない)でもローディングに固定化しない', async () => {
    // 再取得結果がdeep-equalだとSWRはdataを更新せず[data]効果が再実行されない。
    // ローディングをSWRのisValidatingで持つことで、それでも固定化しないことを保証する
    mockUnreadDigestionGet.mockResolvedValue({
      data: [baseArticle],
      total: 2,
    })
    mockSkipPost.mockResolvedValue({
      status: 201,
    })

    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

    await waitFor(() => {
      expect(result.current.currentArticle?.articleId).toBe('article-1')
    })

    await act(async () => {
      await result.current.handleSkip()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('既読APIが失敗したらキューを消化しない', async () => {
    mockMarkAsRead.mockResolvedValue(false)
    mockUnreadDigestionGet.mockResolvedValue({
      data: [baseArticle],
      total: 1,
    })

    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

    await waitFor(() => {
      expect(result.current.remainingCount).toBe(1)
    })

    await act(async () => {
      await result.current.handleRead()
    })

    expect(result.current.remainingCount).toBe(1)
    expect(result.current.isJustCompleted).toBe(false)
  })

  describe('異常系', () => {
    it('未読一覧の取得に失敗するとエラーのトーストを表示する', async () => {
      mockUnreadDigestionGet.mockRejectedValue(new Error('取得に失敗しました'))

      renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'エラーが発生しました。時間をおいて再度お試しください。',
          expect.objectContaining({ id: 'unread-digestion-error' }),
        )
      })
    })

    it('未読一覧取得が401のときはエラートーストを表示しない', async () => {
      mockUnreadDigestionGet.mockRejectedValue(new ClientError('Unauthorized', 401))

      renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

      await waitFor(() => {
        expect(mockUnreadDigestionGet).toHaveBeenCalled()
      })
      expect(toast.error).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'unread-digestion-error' }),
      )
    })

    it('未読一覧の取得に失敗するとhasErrorがtrueになり、retryで再取得に成功するとfalseに戻る', async () => {
      mockUnreadDigestionGet.mockRejectedValueOnce(new Error('取得に失敗しました'))

      const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

      await waitFor(() => {
        expect(result.current.hasError).toBe(true)
      })

      mockUnreadDigestionGet.mockResolvedValueOnce({
        data: [baseArticle],
        total: 1,
      })

      await act(async () => {
        await result.current.retry()
      })

      await waitFor(() => {
        expect(result.current.hasError).toBe(false)
      })
    })

    it('スキップAPIが401の場合はエラートーストを表示しない', async () => {
      mockUnreadDigestionGet.mockResolvedValue({
        data: [baseArticle],
        total: 1,
      })
      mockSkipPost.mockRejectedValue(new ClientError('Unauthorized', 401))

      const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })

      await waitFor(() => {
        expect(result.current.remainingCount).toBe(1)
      })

      await act(async () => {
        await result.current.handleSkip()
      })

      expect(toast.error).not.toHaveBeenCalledWith('スキップに失敗しました')
    })
  })
})

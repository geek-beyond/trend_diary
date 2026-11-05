import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { toast } from 'sonner'
import { SWRConfig } from 'swr'
import { ALL_MEDIA, type SelectedMedia, useReadArticle } from '@/client/features/article'
import type * as UseArticlesModule from '@/client/features/article/hooks/use-articles'
import { completionPendingStorage } from '@/client/features/inbox/model/completion-pending-storage'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'
import HttpError from '@/client/infrastructure/http-error'
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

  it.each(['read', 'skip'] as const)(
    '%s は応答前に次を表示し、失敗時に対象記事と残件数を戻す',
    async (operation) => {
      const next = { ...baseArticle, articleId: 'next', title: '次の記事' }
      mockUnreadDigestionGet.mockResolvedValue({ data: [baseArticle, next], total: 2 })
      let fail!: (reason: Error) => void
      const pending = new Promise<never>((_resolve, reject) => {
        fail = reject
      })
      if (operation === 'skip') mockSkipPost.mockReturnValueOnce(pending)
      else mockMarkAsRead.mockReturnValueOnce(pending)
      const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })
      await waitFor(() => expect(result.current.remainingCount).toBe(2))
      let action!: Promise<void>
      act(() => {
        action = operation === 'skip' ? result.current.handleSkip() : result.current.handleRead()
        result.current.handleLater()
      })
      await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('next'))
      expect(result.current.remainingCount).toBe(1)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isActionPending).toBe(true)
      expect(mockSkipPost.mock.calls.length + mockMarkAsRead.mock.calls.length).toBe(1)
      expect(window.open).toHaveBeenCalledTimes(operation === 'read' ? 1 : 0)
      await act(async () => {
        fail(new Error('offline'))
        await action
      })
      expect(result.current.currentArticle?.articleId).toBe(baseArticle.articleId)
      expect(result.current.remainingCount).toBe(2)
      expect(result.current.isActionPending).toBe(false)
      expect(result.current.isJustCompleted).toBe(false)
      expect(toast.error).toHaveBeenCalled()
    },
  )

  it('後で読むの並べ替えを確定状態に残す', async () => {
    const next = { ...baseArticle, articleId: 'article-2', title: '次の記事' }
    const last = { ...baseArticle, articleId: 'article-3', title: '最後の記事' }
    mockUnreadDigestionGet.mockResolvedValue({ data: [baseArticle, next, last], total: 3 })
    mockSkipPost.mockResolvedValue({ status: 201 })
    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-1'))

    act(() => result.current.handleLater())
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-2'))
    expect(result.current.remainingCount).toBe(3)

    await act(async () => {
      await result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-3'))
    await act(async () => {
      await result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-1'))
  })

  it('後で読むを連打しても確定状態の順序を保つ', async () => {
    const articles = ['article-1', 'article-2', 'article-3', 'article-4'].map((articleId) => ({
      ...baseArticle,
      articleId,
      title: articleId,
    }))
    mockUnreadDigestionGet.mockResolvedValue({ data: articles, total: articles.length })
    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-1'))

    act(() => {
      result.current.handleLater()
      result.current.handleLater()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-2'))
    act(() => result.current.handleLater())
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-3'))
    act(() => result.current.handleLater())
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-4'))
    act(() => result.current.handleLater())
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-1'))
  })

  it('別の記事が処理中に後で読むを選び、失敗記事を戻しても並べ替えを保つ', async () => {
    const next = { ...baseArticle, articleId: 'article-2', title: '次の記事' }
    const last = { ...baseArticle, articleId: 'article-3', title: '最後の記事' }
    mockUnreadDigestionGet.mockResolvedValue({ data: [baseArticle, next, last], total: 3 })
    let failFirst!: (error: Error) => void
    mockSkipPost.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          failFirst = reject
        }),
    )
    mockSkipPost.mockResolvedValue({ status: 201 })
    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-1'))

    let firstAction!: Promise<void>
    act(() => {
      firstAction = result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-2'))
    act(() => result.current.handleLater())
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-3'))

    await act(async () => {
      failFirst(new Error('offline'))
      await firstAction
    })
    expect(result.current.currentArticle?.articleId).toBe('article-1')
    expect(result.current.remainingCount).toBe(3)

    await act(async () => {
      await result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-3'))
    await act(async () => {
      await result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-2'))
  })

  it('別の記事操作を並行でき、先の操作が失敗しても後の成功を巻き戻さない', async () => {
    const next = { ...baseArticle, articleId: 'article-2', title: '次の記事' }
    const last = { ...baseArticle, articleId: 'article-3', title: '最後の記事' }
    mockUnreadDigestionGet.mockResolvedValue({ data: [baseArticle, next, last], total: 3 })
    const pending = new Map<string, { resolve: () => void; reject: (error: Error) => void }>()
    mockSkipPost.mockImplementation(
      ({ param }: { param: { article_id: string } }) =>
        new Promise((resolve, reject) => {
          pending.set(param.article_id, {
            resolve: () => resolve({ status: 201 }),
            reject,
          })
        }),
    )
    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-1'))

    let firstAction!: Promise<void>
    act(() => {
      firstAction = result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-2'))
    let secondAction!: Promise<void>
    act(() => {
      secondAction = result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-3'))
    expect(result.current.remainingCount).toBe(1)
    expect(result.current.isActionPending).toBe(true)
    expect(mockSkipPost).toHaveBeenCalledTimes(2)

    await act(async () => {
      pending.get('article-2')?.resolve()
      await secondAction
    })
    expect(result.current.isActionPending).toBe(true)
    expect(result.current.currentArticle?.articleId).toBe('article-3')
    expect(result.current.remainingCount).toBe(1)

    await act(async () => {
      pending.get('article-1')?.reject(new Error('offline'))
      await firstAction
    })
    expect(result.current.currentArticle?.articleId).toBe('article-1')
    expect(result.current.remainingCount).toBe(2)
    expect(result.current.isActionPending).toBe(false)
    expect(result.current.isJustCompleted).toBe(false)
  })

  it('3つの操作が逆順で成功・失敗しても、成功済みだけを確定し失敗記事を戻す', async () => {
    const articles = ['article-1', 'article-2', 'article-3', 'article-4'].map((articleId) => ({
      ...baseArticle,
      articleId,
      title: articleId,
    }))
    mockUnreadDigestionGet.mockResolvedValue({ data: articles, total: 4 })
    const requests = new Map<string, { resolve: () => void; reject: (error: Error) => void }>()
    mockSkipPost.mockImplementation(
      ({ param }: { param: { article_id: string } }) =>
        new Promise((resolve, reject) => {
          requests.set(param.article_id, {
            resolve: () => resolve({ status: 201 }),
            reject,
          })
        }),
    )
    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-1'))

    let first!: Promise<void>
    act(() => {
      first = result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-2'))
    let second!: Promise<void>
    act(() => {
      second = result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-3'))
    let third!: Promise<void>
    act(() => {
      third = result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-4'))

    await act(async () => {
      requests.get('article-3')?.resolve()
      await third
    })
    await act(async () => {
      requests.get('article-2')?.reject(new Error('offline'))
      await second
    })
    await act(async () => {
      requests.get('article-1')?.resolve()
      await first
    })

    expect(result.current.currentArticle?.articleId).toBe('article-2')
    expect(result.current.remainingCount).toBe(2)
    expect(result.current.isActionPending).toBe(false)
    expect(result.current.isJustCompleted).toBe(false)
  })

  it('最後の2記事を並行消化し、一方の失敗中は完了演出を出さない', async () => {
    const next = { ...baseArticle, articleId: 'article-2', title: '最後の記事' }
    mockUnreadDigestionGet.mockResolvedValue({ data: [baseArticle, next], total: 2 })
    const requests = new Map<string, { resolve: () => void; reject: (error: Error) => void }>()
    mockSkipPost.mockImplementation(
      ({ param }: { param: { article_id: string } }) =>
        new Promise((resolve, reject) => {
          requests.set(param.article_id, {
            resolve: () => resolve({ status: 201 }),
            reject,
          })
        }),
    )
    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-1'))
    let first!: Promise<void>
    act(() => {
      first = result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('article-2'))
    let last!: Promise<void>
    act(() => {
      last = result.current.handleSkip()
    })
    expect(result.current.remainingCount).toBe(0)
    expect(result.current.isJustCompleted).toBe(false)

    await act(async () => {
      requests.get('article-2')?.resolve()
      await last
    })
    expect(result.current.isJustCompleted).toBe(false)
    expect(result.current.remainingCount).toBe(0)
    await act(async () => {
      requests.get('article-1')?.reject(new Error('offline'))
      await first
    })
    expect(result.current.currentArticle?.articleId).toBe('article-1')
    expect(result.current.remainingCount).toBe(1)
    expect(result.current.isJustCompleted).toBe(false)

    mockSkipPost.mockResolvedValueOnce({ status: 201 })
    await act(async () => {
      await result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.isJustCompleted).toBe(true))
    expect(result.current.remainingCount).toBe(0)
  })

  it('最後の1件の完了演出はAPI成功後だけ確定する', async () => {
    mockUnreadDigestionGet.mockResolvedValue({ data: [baseArticle], total: 1 })
    let finish!: (success: boolean) => void
    mockMarkAsRead.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })
    await waitFor(() => expect(result.current.remainingCount).toBe(1))
    let action!: Promise<void>
    act(() => {
      action = result.current.handleRead()
    })
    expect(window.open).toHaveBeenCalledWith(baseArticle.url, '_blank', 'noopener,noreferrer')
    expect(result.current.remainingCount).toBe(0)
    expect(result.current.isJustCompleted).toBe(false)
    expect(result.current.isLoading).toBe(true)
    await act(async () => {
      finish(true)
      await action
    })
    expect(result.current.isJustCompleted).toBe(true)
    await waitFor(() => expect(result.current.isActionPending).toBe(false))
  })

  it('次バッチ取得失敗では消化済み記事を戻さず、再試行で残りの記事を表示する', async () => {
    mockUnreadDigestionGet
      .mockResolvedValueOnce({ data: [baseArticle], total: 2 })
      .mockRejectedValueOnce(new Error('offline'))
    mockSkipPost.mockResolvedValue({ status: 201 })
    const { result } = renderHook(() => useUnreadDigestion(ALL_MEDIA), { wrapper })
    await waitFor(() => expect(result.current.remainingCount).toBe(2))
    await act(async () => {
      await result.current.handleSkip()
    })
    await waitFor(() => expect(result.current.hasError).toBe(true))
    expect(result.current.currentArticle).toBeNull()
    expect(result.current.remainingCount).toBe(1)
    expect(result.current.isJustCompleted).toBe(false)
    mockUnreadDigestionGet.mockResolvedValueOnce({
      data: [{ ...baseArticle, articleId: 'next' }],
      total: 1,
    })
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.currentArticle?.articleId).toBe('next'))
    expect(result.current.hasError).toBe(false)
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
      mockUnreadDigestionGet.mockRejectedValue(new HttpError(401, 'Unauthorized'))

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
      mockSkipPost.mockRejectedValue(new HttpError(401, 'Unauthorized'))

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

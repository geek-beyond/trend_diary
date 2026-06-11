import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { SWRConfig } from 'swr'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'
import type { MediaType } from '../../trends._index/components/media-filter'
import useReadArticle from '../../trends._index/hooks/use-read-article'
import useUnreadDigestion, { type Article } from './use-unread-digestion'

vi.mock('@/client/infrastructure/create-swr-fetcher', () => ({
  default: vi.fn(),
}))

vi.mock('../../trends._index/hooks/use-read-article', () => ({
  default: vi.fn(),
}))

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
            // biome-ignore lint/style/useNamingConvention: $get is a Hono client method name
            $get: mockUnreadDigestionGet,
          },
          ':article_id': {
            skip: {
              // biome-ignore lint/style/useNamingConvention: $post is a Hono client method name
              $post: mockSkipPost,
            },
          },
        },
      },
    } as unknown as ReturnType<typeof createSWRFetcher>)
  })

  it('初回ロードが0件でも完了演出フラグは立たない', async () => {
    mockUnreadDigestionGet.mockResolvedValue({
      data: [],
      total: 0,
    })

    const { result } = renderHook(() => useUnreadDigestion(true, null), { wrapper })

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

    const { result } = renderHook(() => useUnreadDigestion(true, null), { wrapper })

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

    const initialProps: { selectedMedia: MediaType } = { selectedMedia: null }
    const { result, rerender } = renderHook(
      ({ selectedMedia }: { selectedMedia: MediaType }) => useUnreadDigestion(true, selectedMedia),
      {
        initialProps,
        wrapper,
      },
    )

    await waitFor(() => {
      expect(result.current.remainingCount).toBe(1)
    })

    rerender({ selectedMedia: 'qiita' })

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

    const { result } = renderHook(() => useUnreadDigestion(true, null), { wrapper })

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

    const { result } = renderHook(() => useUnreadDigestion(true, null), { wrapper })

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

  it('既読APIが失敗したらキューを消化しない', async () => {
    mockMarkAsRead.mockResolvedValue(false)
    mockUnreadDigestionGet.mockResolvedValue({
      data: [baseArticle],
      total: 1,
    })

    const { result } = renderHook(() => useUnreadDigestion(true, null), { wrapper })

    await waitFor(() => {
      expect(result.current.remainingCount).toBe(1)
    })

    await act(async () => {
      await result.current.handleRead()
    })

    expect(result.current.remainingCount).toBe(1)
    expect(result.current.isJustCompleted).toBe(false)
  })
})

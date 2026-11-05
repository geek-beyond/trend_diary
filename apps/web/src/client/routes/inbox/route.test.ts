import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { SWRConfig } from 'swr'
import { useReadArticle } from '@/client/features/article'
import type * as ArticleModule from '@/client/features/article'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'
import InboxRoute from './route'

vi.mock('@/client/infrastructure/create-swr-fetcher', () => ({ default: vi.fn() }))

vi.mock('@/client/features/article', async () => {
  const article = await vi.importActual<typeof ArticleModule>('@/client/features/article')
  return {
    ...article,
    useReadArticle: vi.fn(),
  }
})

const mockedCreateSWRFetcher = vi.mocked(createSWRFetcher)
const mockedUseReadArticle = vi.mocked(useReadArticle)
const mockUnreadDigestionGet = vi.fn()
const mockSkipPost = vi.fn()
const mockApiCall: ReturnType<typeof createSWRFetcher>['apiCall'] = async <T>(
  request: Parameters<ReturnType<typeof createSWRFetcher>['apiCall']>[0],
) => {
  const response = await request()
  if (!response.ok) throw new Error(response.statusText)
  if (response.status === 204) return null
  // oxlint-disable-next-line typescript/consistent-type-assertions -- API境界のJSONを呼び出し側の型へ橋渡しする
  return (await response.json()) as T
}

const qiitaArticle = {
  articleId: 'qiita-article',
  media: 'qiita' as const,
  title: 'Qiitaの記事',
  author: 'Qiita作者',
  description: 'Qiita本文',
  url: 'https://example.com/qiita',
  createdAt: new Date('2026-03-08T00:00:00.000Z'),
}
const zennArticle = {
  ...qiitaArticle,
  articleId: 'zenn-article',
  media: 'zenn' as const,
  title: 'Zennの記事',
  url: 'https://example.com/zenn',
}

const apiResponse = <T>(body: T, status = 200) => ({
  ok: true,
  status,
  statusText: 'OK',
  json: async () => body,
})

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    SWRConfig,
    { value: { provider: () => new Map(), dedupingInterval: 0 } },
    createElement(MemoryRouter, {}, children),
  )
}

function renderRoute() {
  return render(createElement(InboxRoute), { wrapper })
}

describe('InboxRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseReadArticle.mockReturnValue({
      markAsRead: vi.fn().mockResolvedValue(true),
      markAsUnread: vi.fn().mockResolvedValue(true),
      isLoading: false,
    })
    const mockedFetcher = {
      fetcher: vi.fn(),
      apiCall: mockApiCall,
      client: {
        articles: {
          'unread-digestion': { $get: mockUnreadDigestionGet },
          ':article_id': { skip: { $post: mockSkipPost } },
        },
      },
    }
    // oxlint-disable typescript/no-restricted-types, typescript/consistent-type-assertions -- ルートテストでは使わないAPIを含むHonoクライアントの一部だけをモックする
    const typedMockedFetcher = mockedFetcher as unknown as ReturnType<typeof createSWRFetcher>
    // oxlint-enable typescript/no-restricted-types, typescript/consistent-type-assertions
    mockedCreateSWRFetcher.mockReturnValue(typedMockedFetcher)
    mockUnreadDigestionGet.mockImplementation(({ query }: { query: { media?: string[] } }) =>
      Promise.resolve(
        apiResponse({
          data: query.media?.includes('zenn') ? [zennArticle] : [qiitaArticle],
          total: 1,
        }),
      ),
    )
  })

  it('メディアを切り替えた後に旧操作が完了しても、新しいセッションのキューを変えない', async () => {
    let resolveOldRequest!: (response: { status: number }) => void
    mockSkipPost.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOldRequest = resolve
        }),
    )
    renderRoute()
    await waitFor(() => expect(screen.getByText('Qiitaの記事')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'スキップ' }))
    await waitFor(() => expect(mockSkipPost).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Qiita' }))
    await waitFor(() => expect(screen.getByText('Zennの記事')).toBeInTheDocument())
    expect(screen.getByText('残り 1 件')).toBeInTheDocument()

    await act(async () => {
      resolveOldRequest(apiResponse({}, 201))
      await Promise.resolve()
    })
    expect(screen.getByText('Zennの記事')).toBeInTheDocument()
    expect(screen.getByText('残り 1 件')).toBeInTheDocument()
    expect(screen.queryByText('消化完了')).not.toBeInTheDocument()
  })
})

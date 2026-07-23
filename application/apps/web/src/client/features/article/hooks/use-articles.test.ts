import { act, renderHook, waitFor } from '@testing-library/react'
import { addJstDays, toJstDateString } from '@trend-diary/std/locale/date'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { SWRConfig } from 'swr'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import useArticles, { ALL_MEDIA, type Article } from './use-articles'

// window.matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const defaultFakeArticle: Article = {
  articleId: '1',
  media: 'qiita',
  title: 'デフォルトタイトル',
  author: 'デフォルト筆者',
  description: 'デフォルトの説明文です',
  url: 'https://example.com',
  imageUrl: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

const generateFakeArticle = (params?: Partial<Article>): Article => ({
  ...defaultFakeArticle,
  ...params,
})

const mockApiClient = {
  articles: {
    $get: vi.fn(),
  },
}

const generateFakeResponse = (
  params?: Partial<{
    status: number
    articles: Article[]
    page: number
    limit: number
    total: number
    totalPages: number
  }>,
) => {
  const {
    status = 200,
    articles = [],
    page = 1,
    limit = 20,
    total = 0,
    totalPages = 1,
  } = params ?? {}
  return {
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue({
      data: articles,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }),
  }
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするため any と型アサーションを許可する
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

function setupHook(
  initialEntries?: string[],
  options?: {
    isLoggedIn?: boolean
  },
) {
  return renderHook(() => useArticles(options?.isLoggedIn), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(
        SWRConfig,
        { value: { provider: () => new Map(), dedupingInterval: 0 } },
        createElement(MemoryRouter, { initialEntries }, children),
      ),
  })
}

describe('useArticles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  describe('基本動作', () => {
    it('初期化時に今日の日付で記事一覧が取得できる', async () => {
      const fakeArticles = [
        generateFakeArticle({ articleId: '1', title: '記事1' }),
        generateFakeArticle({ articleId: '2', title: '記事2' }),
      ]

      const fakeResponse = generateFakeResponse({
        articles: fakeArticles,
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook()

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(2)
      })

      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 1,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
      expect(result.current.articles[0].title).toBe('記事1')
      expect(result.current.page).toBe(1)
      expect(result.current.totalPages).toBe(1)
    })

    it('loading中はisLoadingがtrueになる', async () => {
      let resolvePromise: () => void
      // oxlint-disable-next-line typescript/no-explicit-any --　getApiClientForClientの型が面倒なのでanyを使用
      const mockPromise = new Promise<any>((resolve) => {
        resolvePromise = () =>
          resolve({
            status: 200,
            ok: true,
            json: () =>
              Promise.resolve({
                data: [],
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
              }),
          })
      })

      mockApiClient.articles.$get.mockReturnValue(mockPromise)

      const { result } = setupHook()

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolvePromise!()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('記事一覧を取得したタイミングで、ページ情報が更新される', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook(['/?page=2'])

      await waitFor(() => {
        expect(result.current.page).toBe(2)
        expect(result.current.totalPages).toBe(3)
      })
    })

    it('記事が0件でも正しく処理される', async () => {
      const fakeResponse = generateFakeResponse()

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.articles).toEqual([])
      expect(result.current.page).toBe(1)
      expect(result.current.totalPages).toBe(1)
    })

    it('URLパラメータにpage=2がある場合、初期表示で2ページ目を取得する', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle({ articleId: '3', title: '2ページ目の記事' })],
        page: 2,
        totalPages: 3,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook(['/?page=2'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 2,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
      expect(result.current.page).toBe(2)
      expect(result.current.articles[0].title).toBe('2ページ目の記事')
    })

    it('setSearchParamsでURLパラメータを変更すると、新しいパラメータでAPIが呼ばれる', async () => {
      const initialResponse = generateFakeResponse({
        page: 1,
        totalPages: 3,
      })

      const nextPageResponse = generateFakeResponse({
        articles: [generateFakeArticle({ articleId: '3', title: '記事3' })],
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(initialResponse)

      const { result } = setupHook()

      await waitFor(() => {
        expect(result.current.page).toBe(1)
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(nextPageResponse)

      await act(async () => {
        result.current.setSearchParams(new URLSearchParams({ page: '2' }))
      })

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      })

      expect(mockApiClient.articles.$get).toHaveBeenLastCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 2,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
      expect(result.current.articles).toHaveLength(1)
      expect(result.current.articles[0].title).toBe('記事3')
    })

    it('URLパラメータでlimitを指定すると、指定されたlimitでAPIが呼ばれる', async () => {
      const fakeResponse = generateFakeResponse({
        limit: 10,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook(['/?limit=10'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 1,
            limit: 10,
          },
        },
        { init: { credentials: 'include' } },
      )
    })

    it('ログイン時にread_status=0があると未読フィルタ付きでAPIが呼ばれる', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
      })
      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      setupHook(['/?read_status=0'], { isLoggedIn: true })

      await waitFor(() => {
        expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
          {
            query: {
              to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              page: 1,
              limit: 20,
              read_status: '0',
            },
          },
          { init: { credentials: 'include' } },
        )
      })
    })
  })

  describe('日付プリセット', () => {
    it('from/toが7日プリセットに一致する場合、selectedDatePresetがlast7daysになる', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
        page: 1,
        totalPages: 1,
      })
      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const today = toJstDateString(new Date())
      const last7daysFrom = addJstDays(today, -6)
      const { result } = setupHook([`/?from=${last7daysFrom}&to=${today}`])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.selectedDatePreset).toBe('last7days')
      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            from: last7daysFrom,
            to: today,
            page: 1,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
    })

    it('from/toがプリセット外の場合、todayとしてAPIが呼ばれる', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
        page: 1,
        totalPages: 1,
      })
      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const today = toJstDateString(new Date())
      const customFrom = addJstDays(today, -4)
      const customTo = addJstDays(today, -1)
      const { result } = setupHook([`/?from=${customFrom}&to=${customTo}`])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.selectedDatePreset).toBe('today')
      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            from: today,
            to: today,
            page: 1,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
    })

    it('7日プリセットを適用するとfrom/to付きでAPIが呼ばれる', async () => {
      const initialResponse = generateFakeResponse({
        page: 2,
        totalPages: 3,
      })
      const filteredResponse = generateFakeResponse({
        page: 1,
        totalPages: 1,
      })
      mockApiClient.articles.$get.mockResolvedValueOnce(initialResponse)

      const { result } = setupHook(['/?page=2'], { isLoggedIn: true })

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(filteredResponse)

      await act(async () => {
        result.current.handleFiltersApply({
          media: ['qiita'],
          readStatus: 'unread',
          datePreset: 'last7days',
        })
      })

      const today = toJstDateString(new Date())
      const last7daysFrom = addJstDays(today, -6)

      await waitFor(() => {
        expect(mockApiClient.articles.$get).toHaveBeenLastCalledWith(
          {
            query: {
              from: last7daysFrom,
              to: today,
              page: 1,
              limit: 20,
              media: ['qiita'],
              read_status: '0',
            },
          },
          { init: { credentials: 'include' } },
        )
      })
    })

    it('todayプリセットを適用するとselectedDatePresetがtodayになる', async () => {
      const today = toJstDateString(new Date())
      const last7daysFrom = addJstDays(today, -6)
      const initialResponse = generateFakeResponse({
        page: 2,
        totalPages: 3,
      })
      const filteredResponse = generateFakeResponse({
        page: 1,
        totalPages: 1,
      })
      mockApiClient.articles.$get.mockResolvedValueOnce(initialResponse)

      const { result } = setupHook([`/?from=${last7daysFrom}&to=${today}&page=2`], {
        isLoggedIn: true,
      })

      await waitFor(() => {
        expect(result.current.selectedDatePreset).toBe('last7days')
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(filteredResponse)

      await act(async () => {
        result.current.handleFiltersApply({
          media: ALL_MEDIA,
          readStatus: 'all',
          datePreset: 'today',
        })
      })

      await waitFor(() => {
        expect(result.current.selectedDatePreset).toBe('today')
      })
      expect(mockApiClient.articles.$get).toHaveBeenLastCalledWith(
        {
          query: {
            from: today,
            to: today,
            page: 1,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
    })
  })

  describe('ページ遷移', () => {
    it('toNextPageを呼ぶと次のページに遷移する', async () => {
      const initialResponse = generateFakeResponse({
        page: 1,
        totalPages: 3,
      })

      const nextPageResponse = generateFakeResponse({
        articles: [generateFakeArticle({ articleId: '3', title: '2ページ目の記事' })],
        page: 2,
        totalPages: 3,
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(initialResponse)

      const { result } = setupHook()

      await waitFor(() => {
        expect(result.current.page).toBe(1)
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(nextPageResponse)

      await act(async () => {
        result.current.toNextPage(1)
      })

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      })

      expect(mockApiClient.articles.$get).toHaveBeenLastCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 2,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
    })

    it('toPreviousPageを呼ぶと前のページに遷移する', async () => {
      const initialResponse = generateFakeResponse({
        page: 2,
        totalPages: 3,
      })

      const previousPageResponse = generateFakeResponse({
        articles: [generateFakeArticle({ articleId: '1', title: '1ページ目の記事' })],
        page: 1,
        totalPages: 3,
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(initialResponse)

      const { result } = setupHook(['/?page=2'])

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(previousPageResponse)

      await act(async () => {
        result.current.toPreviousPage(2)
      })

      await waitFor(() => {
        expect(result.current.page).toBe(1)
      })

      expect(mockApiClient.articles.$get).toHaveBeenLastCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 1,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
    })

    it('前へ・次へのリンク先(href)が前後のページを指す（検索エンジンがたどれるようにする）', async () => {
      mockApiClient.articles.$get.mockResolvedValue(
        generateFakeResponse({ page: 2, totalPages: 3 }),
      )

      const { result } = setupHook(['/?page=2'])

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      })

      // page=1 は既定ページのため href からは page を落として素の URL にする
      expect(result.current.prevPageHref).toBe('/')
      expect(result.current.nextPageHref).toBe('/?page=3')
    })

    it('リンク先(href)は page 以外の絞り込みクエリを保持する', async () => {
      mockApiClient.articles.$get.mockResolvedValue(
        generateFakeResponse({ page: 2, totalPages: 3 }),
      )

      const { result } = setupHook(['/?media=qiita&page=2'])

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      })

      expect(result.current.prevPageHref).toBe('/?media=qiita')
      expect(result.current.nextPageHref).toBe('/?media=qiita&page=3')
    })
  })

  describe('APIのエラーケース', () => {
    it('API呼び出しで400番台の時、エラーのtoastが表示される', async () => {
      const fakeResponse = generateFakeResponse({ status: 400 })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook()

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'エラーが発生しました。時間をおいて再度お試しください。',
          expect.objectContaining({ id: 'articles-error' }),
        )
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('API呼び出しで500番台の時、エラーのtoastが表示される', async () => {
      const fakeResponse = generateFakeResponse({ status: 500 })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook()

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'エラーが発生しました。時間をおいて再度お試しください。',
          expect.objectContaining({ id: 'articles-error' }),
        )
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('その他のエラーの時、エラーのtoastが表示される', async () => {
      const networkError = new Error('ネットワークエラー')
      mockApiClient.articles.$get.mockRejectedValue(networkError)

      const { result } = setupHook()

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'エラーが発生しました。時間をおいて再度お試しください。',
          expect.objectContaining({ id: 'articles-error' }),
        )
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('取得に失敗するとhasErrorがtrueになり、retryで再取得に成功するとfalseに戻る', async () => {
      mockApiClient.articles.$get.mockRejectedValueOnce(new Error('ネットワークエラー'))

      const { result } = setupHook()

      await waitFor(() => {
        expect(result.current.hasError).toBe(true)
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(generateFakeResponse())

      await act(async () => {
        await result.current.retry()
      })

      await waitFor(() => {
        expect(result.current.hasError).toBe(false)
      })
    })

    it('API呼び出しで401の時、セッション切れの案内トーストのみが表示される', async () => {
      const fakeResponse = generateFakeResponse({ status: 401 })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook()

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'セッションの有効期限が切れました。再度ログインしてください。',
          { id: 'session-expired' },
        )
        expect(result.current.isLoading).toBe(false)
      })
      expect(toast.error).not.toHaveBeenCalledWith(
        'エラーが発生しました。時間をおいて再度お試しください。',
        expect.objectContaining({ id: 'articles-error' }),
      )
    })
  })

  describe('無効なURLパラメータのフォールバック', () => {
    it('pageに数値以外が指定された場合、デフォルト値（1）でAPIが呼ばれる', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
        page: 1,
        totalPages: 1,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook(['/?page=abc'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 1,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
    })

    it('limitに数値以外が指定された場合、デフォルト値（20）でAPIが呼ばれる', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
        page: 1,
        totalPages: 1,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook(['/?limit=invalid'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 1,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
    })

    it('limitが範囲外（MAX_LIMIT超過）の場合、デフォルト値でAPIが呼ばれる', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
        page: 1,
        totalPages: 1,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook(['/?limit=999'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 1,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
    })

    it('media=hatenaが指定された場合、media条件付きでAPIが呼ばれる', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle({ media: 'hatena' })],
        page: 1,
        totalPages: 1,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook(['/?media=hatena'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 1,
            limit: 20,
            media: ['hatena'],
          },
        },
        { init: { credentials: 'include' } },
      )
      expect(result.current.selectedMedia).toEqual(['hatena'])
    })

    it('media が複数指定された場合、複数media条件付きでAPIが呼ばれる', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
        page: 1,
        totalPages: 1,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook(['/?media=qiita&media=zenn'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 1,
            limit: 20,
            media: ['qiita', 'zenn'],
          },
        },
        { init: { credentials: 'include' } },
      )
      expect(result.current.selectedMedia).toEqual(['qiita', 'zenn'])
    })

    it('media に無効値が混在する場合、有効なmediaのみで絞り込む', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
        page: 1,
        totalPages: 1,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook(['/?media=qiita&media=note'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 1,
            limit: 20,
            media: ['qiita'],
          },
        },
        { init: { credentials: 'include' } },
      )
      expect(result.current.selectedMedia).toEqual(['qiita'])
    })

    it('pageとlimitの両方が無効な場合、両方ともデフォルト値でAPIが呼ばれる', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
        page: 1,
        totalPages: 1,
      })

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook(['/?page=invalid&limit=abc'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
        {
          query: {
            to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
            page: 1,
            limit: 20,
          },
        },
        { init: { credentials: 'include' } },
      )
    })
  })

  describe('既読状態管理', () => {
    it('isRead付きの記事を取得できる', async () => {
      const fakeArticles = [
        generateFakeArticle({ articleId: '1', title: '既読記事' }),
        generateFakeArticle({ articleId: '2', title: '未読記事' }),
      ]

      const fakeResponse = {
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [
            { ...fakeArticles[0], articleId: '1', isRead: true },
            { ...fakeArticles[1], articleId: '2', isRead: false },
          ],
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        }),
      }

      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      const { result } = setupHook()

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(2)
      })

      expect(result.current.articles[0].isRead).toBe(true)
      expect(result.current.articles[1].isRead).toBe(false)
    })
  })

  describe('既読状態フィルタ', () => {
    it('未読を選ぶとread_status=0でAPIが呼ばれる', async () => {
      const initialResponse = generateFakeResponse({
        page: 2,
        totalPages: 3,
      })
      const unreadResponse = generateFakeResponse({
        page: 1,
        totalPages: 1,
      })
      mockApiClient.articles.$get.mockResolvedValueOnce(initialResponse)

      const { result } = setupHook(['/?page=2'], { isLoggedIn: true })

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(unreadResponse)

      await act(async () => {
        result.current.handleReadStatusChange('unread')
      })

      await waitFor(() => {
        expect(mockApiClient.articles.$get).toHaveBeenLastCalledWith(
          {
            query: {
              to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              page: 1,
              limit: 20,
              read_status: '0',
            },
          },
          { init: { credentials: 'include' } },
        )
      })
    })

    it('未ログインでread_status指定時はフィルタを無視してAPIが呼ばれる', async () => {
      const fakeResponse = generateFakeResponse({
        articles: [generateFakeArticle()],
      })
      mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

      setupHook(['/?read_status=0'])

      await waitFor(() => {
        expect(mockApiClient.articles.$get).toHaveBeenCalledWith(
          {
            query: {
              to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              page: 1,
              limit: 20,
            },
          },
          { init: { credentials: 'include' } },
        )
      })
    })

    it('媒体と未読を一括適用できる', async () => {
      const initialResponse = generateFakeResponse({
        page: 2,
        totalPages: 3,
      })
      const filteredResponse = generateFakeResponse({
        page: 1,
        totalPages: 1,
      })
      mockApiClient.articles.$get.mockResolvedValueOnce(initialResponse)

      const { result } = setupHook(['/?page=2'], { isLoggedIn: true })

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(filteredResponse)

      await act(async () => {
        result.current.handleFiltersApply({
          media: ['qiita'],
          readStatus: 'unread',
          datePreset: 'today',
        })
      })

      await waitFor(() => {
        expect(mockApiClient.articles.$get).toHaveBeenLastCalledWith(
          {
            query: {
              to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              page: 1,
              limit: 20,
              media: ['qiita'],
              read_status: '0',
            },
          },
          { init: { credentials: 'include' } },
        )
      })
    })

    it('複数媒体を一括適用できる', async () => {
      const initialResponse = generateFakeResponse({
        page: 2,
        totalPages: 3,
      })
      const filteredResponse = generateFakeResponse({
        page: 1,
        totalPages: 1,
      })
      mockApiClient.articles.$get.mockResolvedValueOnce(initialResponse)

      const { result } = setupHook(['/?page=2'], { isLoggedIn: true })

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(filteredResponse)

      await act(async () => {
        result.current.handleFiltersApply({
          media: ['qiita', 'hatena'],
          readStatus: 'all',
          datePreset: 'today',
        })
      })

      await waitFor(() => {
        expect(mockApiClient.articles.$get).toHaveBeenLastCalledWith(
          {
            query: {
              to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              page: 1,
              limit: 20,
              media: ['qiita', 'hatena'],
            },
          },
          { init: { credentials: 'include' } },
        )
      })
      expect(result.current.selectedMedia).toEqual(['qiita', 'hatena'])
    })

    it('すべてを適用するとmedia/read_status/pageが除去される', async () => {
      const initialResponse = generateFakeResponse({
        page: 2,
        totalPages: 3,
      })
      const clearedResponse = generateFakeResponse({
        page: 1,
        totalPages: 1,
      })
      mockApiClient.articles.$get.mockResolvedValueOnce(initialResponse)

      const { result } = setupHook(['/?media=qiita&read_status=0&page=2'], { isLoggedIn: true })

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      })

      mockApiClient.articles.$get.mockResolvedValueOnce(clearedResponse)

      await act(async () => {
        result.current.handleFiltersApply({
          media: ALL_MEDIA,
          readStatus: 'all',
          datePreset: 'today',
        })
      })

      await waitFor(() => {
        expect(mockApiClient.articles.$get).toHaveBeenLastCalledWith(
          {
            query: {
              to: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              from: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
              page: 1,
              limit: 20,
            },
          },
          { init: { credentials: 'include' } },
        )
      })
    })
  })

  describe('既読トグルの楽観的更新', () => {
    describe('正常系', () => {
      it('リクエストの完了を待たずに一覧のisReadが即座に切り替わる', async () => {
        const fakeResponse = generateFakeResponse({
          articles: [generateFakeArticle({ articleId: '1', isRead: false })],
          total: 1,
          totalPages: 1,
        })
        mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

        const { result } = setupHook()

        await waitFor(() => {
          expect(result.current.articles[0]?.isRead).toBe(false)
        })

        let resolveRequest: (succeeded: boolean) => void
        const request = vi.fn(
          () =>
            new Promise<boolean>((resolve) => {
              resolveRequest = resolve
            }),
        )

        act(() => {
          void result.current.updateArticleReadState('1', true, request)
        })

        await waitFor(() => {
          expect(result.current.articles[0]?.isRead).toBe(true)
        })

        await act(async () => {
          resolveRequest!(true)
        })
      })

      it('未読のみフィルタ表示中に既読化すると、リクエストの完了を待たず一覧から消える', async () => {
        const fakeResponse = generateFakeResponse({
          articles: [generateFakeArticle({ articleId: '1', isRead: false })],
          total: 1,
          totalPages: 1,
        })
        mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

        const { result } = setupHook(['/?read_status=0'], { isLoggedIn: true })

        await waitFor(() => {
          expect(result.current.articles).toHaveLength(1)
        })

        let resolveRequest: (succeeded: boolean) => void
        const request = vi.fn(
          () =>
            new Promise<boolean>((resolve) => {
              resolveRequest = resolve
            }),
        )

        act(() => {
          void result.current.updateArticleReadState('1', true, request)
        })

        await waitFor(() => {
          expect(result.current.articles).toHaveLength(0)
        })

        await act(async () => {
          resolveRequest!(true)
        })
      })

      it('未読のみフィルタ表示中に既読化すると、ページの空きを埋めるためバックグラウンドで再検証される', async () => {
        const fakeResponse = generateFakeResponse({
          articles: [generateFakeArticle({ articleId: '1', isRead: false })],
          total: 1,
          totalPages: 1,
        })
        mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

        const { result } = setupHook(['/?read_status=0'], { isLoggedIn: true })

        await waitFor(() => {
          expect(result.current.articles).toHaveLength(1)
        })
        expect(mockApiClient.articles.$get).toHaveBeenCalledTimes(1)

        const request = vi.fn().mockResolvedValue(true)

        await act(async () => {
          await result.current.updateArticleReadState('1', true, request)
        })

        await waitFor(() => {
          expect(mockApiClient.articles.$get).toHaveBeenCalledTimes(2)
        })
      })

      it('「すべて」フィルタ表示中に既読化しても再検証は発生しない（表示位置が変わらないため）', async () => {
        const fakeResponse = generateFakeResponse({
          articles: [generateFakeArticle({ articleId: '1', isRead: false })],
          total: 1,
          totalPages: 1,
        })
        mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

        const { result } = setupHook()

        await waitFor(() => {
          expect(result.current.articles).toHaveLength(1)
        })
        expect(mockApiClient.articles.$get).toHaveBeenCalledTimes(1)

        const request = vi.fn().mockResolvedValue(true)

        await act(async () => {
          await result.current.updateArticleReadState('1', true, request)
        })

        expect(mockApiClient.articles.$get).toHaveBeenCalledTimes(1)
      })
    })

    describe('準正常系', () => {
      it('リクエストが失敗した場合は表示が元の既読状態に戻る', async () => {
        const fakeResponse = generateFakeResponse({
          articles: [generateFakeArticle({ articleId: '1', isRead: false })],
          total: 1,
          totalPages: 1,
        })
        mockApiClient.articles.$get.mockResolvedValue(fakeResponse)

        const { result } = setupHook()

        await waitFor(() => {
          expect(result.current.articles[0]?.isRead).toBe(false)
        })

        const request = vi.fn().mockResolvedValue(false)

        await act(async () => {
          await result.current.updateArticleReadState('1', true, request)
        })

        expect(result.current.articles[0]?.isRead).toBe(false)
      })
    })
  })
})

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'
import useDiaryApi, { type DiaryRangeItemResponse, type DiaryResponse } from './use-diary-api'

vi.mock('@/client/infrastructure/create-swr-fetcher', () => ({
  default: vi.fn(),
}))

const mockedCreateSWRFetcher = vi.mocked(createSWRFetcher)

const buildDailyResponse = (date: string, read: number, skip: number): DiaryResponse => ({
  date,
  sources: [
    { media: 'qiita', read, skip },
    { media: 'zenn', read: 0, skip: 0 },
    { media: 'hatena', read: 0, skip: 0 },
  ],
  reads: {
    data: [
      {
        readHistoryId: 'r1',
        articleId: 'a1',
        media: 'qiita',
        title: 'Diary Article',
        url: 'https://example.com/diary',
        readAt: `${date}T01:23:00.000Z`,
      },
    ],
    page: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
})

const buildRangeItem = (date: string, read: number, skip: number): DiaryRangeItemResponse => ({
  date,
  summary: { read, skip },
  sources: [
    { media: 'qiita', read, skip },
    { media: 'zenn', read: 0, skip: 0 },
    { media: 'hatena', read: 0, skip: 0 },
  ],
})

const diaryGet = vi.fn()
const apiCall = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  // oxlint-disable-next-line typescript/consistent-type-assertions -- Hono client は深くネストした型を持ち、テストでは利用する一部のみをモックするため二重アサーションで橋渡しする
  mockedCreateSWRFetcher.mockReturnValue({
    fetcher: vi.fn(),
    apiCall,
    client: {
      articles: {
        diary: {
          $get: diaryGet,
        },
      },
    },
    // oxlint-disable-next-line typescript/no-restricted-types -- 一部のみをモックした値を実型へ橋渡しするための境界キャストのため
  } as unknown as ReturnType<typeof createSWRFetcher>)
})

describe('useDiaryApi', () => {
  describe('fetchDiary', () => {
    it('日次APIを正しいクエリで呼び出し、当日分を整形して返す', async () => {
      const targetDate = '2026-03-01'
      const dailyResponse = buildDailyResponse(targetDate, 2, 1)

      apiCall.mockImplementation(async <T>(apiFn: () => Promise<T>) => {
        await apiFn()
        return {
          data: [buildRangeItem(targetDate, 2, 1)],
          reads: dailyResponse.reads,
        }
      })

      const { result } = renderHook(() => useDiaryApi())
      const value = await result.current.fetchDiary(targetDate, 2)

      expect(diaryGet).toHaveBeenCalledWith(
        {
          query: {
            from: targetDate,
            to: targetDate,
            // クエリはURL上文字列で送られるため、検証前の入力型（string）で渡す
            page: '2',
          },
        },
        { init: { credentials: 'include' } },
      )
      expect(value).toEqual({
        date: targetDate,
        sources: [
          { media: 'qiita', read: 2, skip: 1 },
          { media: 'zenn', read: 0, skip: 0 },
          { media: 'hatena', read: 0, skip: 0 },
        ],
        reads: dailyResponse.reads,
      })
    })

    const invalidResponseCases: Array<{ outline: string; response: object | null }> = [
      {
        outline: 'apiCallがnullを返した場合',
        response: null,
      },
      {
        outline: 'readsが含まれないレスポンスの場合',
        response: { data: [buildRangeItem('2026-03-01', 1, 0)] },
      },
      {
        outline: 'dataが空配列の場合',
        response: { data: [], reads: buildDailyResponse('2026-03-01', 0, 0).reads },
      },
    ]

    invalidResponseCases.forEach(({ outline, response }) => {
      it(`${outline}はエラーを投げる`, async () => {
        apiCall.mockResolvedValue(response)

        const { result } = renderHook(() => useDiaryApi())

        await expect(result.current.fetchDiary('2026-03-01', 1)).rejects.toThrow(
          'ダイアリーの取得に失敗しました',
        )
      })
    })
  })

  describe('fetchDiaryRange', () => {
    it('範囲APIを正しいクエリで呼び出し、data配列を返す', async () => {
      const items = [
        buildRangeItem('2026-02-23', 1, 0),
        buildRangeItem('2026-02-24', 0, 1),
        buildRangeItem('2026-03-01', 3, 2),
      ]

      apiCall.mockImplementation(async <T>(apiFn: () => Promise<T>) => {
        await apiFn()
        return { data: items }
      })

      const { result } = renderHook(() => useDiaryApi())
      const value = await result.current.fetchDiaryRange('2026-02-23', '2026-03-01')

      expect(diaryGet).toHaveBeenCalledWith(
        {
          query: {
            from: '2026-02-23',
            to: '2026-03-01',
          },
        },
        { init: { credentials: 'include' } },
      )
      expect(value).toEqual(items)
    })

    it('apiCallがnullを返した場合はエラーを投げる', async () => {
      apiCall.mockResolvedValue(null)

      const { result } = renderHook(() => useDiaryApi())

      await expect(result.current.fetchDiaryRange('2026-02-23', '2026-03-01')).rejects.toThrow(
        'ダイアリー範囲の取得に失敗しました',
      )
    })
  })
})

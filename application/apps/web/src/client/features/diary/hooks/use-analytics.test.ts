import { act, renderHook, waitFor } from '@testing-library/react'
import { addJstDays, toJstDateString } from '@trend-diary/std/locale/date'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HttpError from '@/client/infrastructure/http-error'
import useAnalytics from './use-analytics'
import useDiaryApi, { type DiaryRangeItemResponse, type DiaryResponse } from './use-diary-api'

vi.mock('./use-diary-api', () => ({
  default: vi.fn(),
}))

const mockedUseDiaryApi = vi.mocked(useDiaryApi)

function setupHook(initialEntries: string[] = ['/analytics']) {
  return renderHook(() => useAnalytics(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(
        SWRConfig,
        { value: { provider: () => new Map(), dedupingInterval: 0 } },
        createElement(MemoryRouter, { initialEntries }, children),
      ),
  })
}

const buildDailyResponse = (date: string, read: number, skip: number): DiaryResponse => ({
  date,
  sources: [
    { media: 'qiita', read, skip },
    { media: 'zenn', read: 0, skip: 0 },
    { media: 'hatena', read: 0, skip: 0 },
  ],
  reads: {
    data:
      read > 0
        ? [
            {
              readHistoryId: 'r1',
              articleId: 'a1',
              media: 'qiita',
              title: 'Analytics Article',
              url: 'https://example.com/analytics',
              readAt: `${date}T10:00:00.000Z`,
            },
          ]
        : [],
    page: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
})

const buildRangeItemResponse = (
  date: string,
  read: number,
  skip: number,
): DiaryRangeItemResponse => ({
  date,
  summary: { read, skip },
  sources: [
    { media: 'qiita', read, skip },
    { media: 'zenn', read: 0, skip: 0 },
    { media: 'hatena', read: 0, skip: 0 },
  ],
})

const buildDates = (baseDate: string) =>
  Array.from({ length: 7 }, (_, index) => addJstDays(baseDate, -(6 - index)))

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('日付未選択時は過去1週間の集計を表示する', async () => {
    const fetchDiaryRange = vi.fn().mockImplementation((from: string, to: string) => {
      const dates = buildDates(to).filter((date) => date >= from)
      return Promise.resolve(dates.map((date, index) => buildRangeItemResponse(date, index + 1, 0)))
    })

    const fetchDiary = vi.fn()

    mockedUseDiaryApi.mockReturnValue({
      fetchDiary,
      fetchDiaryRange,
    })

    const { result } = setupHook()

    await waitFor(() => {
      expect(fetchDiaryRange).toHaveBeenCalledTimes(1)
    })

    const expectedDates = buildDates(toJstDateString(new Date()))
    expect(fetchDiaryRange).toHaveBeenCalledWith(expectedDates[0], expectedDates[6])
    expect(result.current.selectedDate).toBeNull()
    expect(result.current.summaryRange).toHaveLength(7)
    expect(result.current.weeklySummary).toEqual({ read: 28, skip: 0 })
    expect(result.current.sources[0]).toEqual({ media: 'qiita', read: 28, skip: 0 })
    expect(fetchDiary).not.toHaveBeenCalled()
  })

  it('選択日の1ページ目は日次集計を表示する', async () => {
    const targetDate = buildDates(toJstDateString(new Date()))[5]
    const fetchDiaryRange = vi.fn().mockImplementation((from: string, to: string) => {
      const dates = buildDates(to).filter((date) => date >= from)
      return Promise.resolve(
        dates.map((date) => {
          if (date === targetDate) return buildRangeItemResponse(date, 2, 1)
          return buildRangeItemResponse(date, 1, 0)
        }),
      )
    })

    const fetchDiary = vi.fn().mockResolvedValue(buildDailyResponse(targetDate, 2, 1))

    mockedUseDiaryApi.mockReturnValue({
      fetchDiary,
      fetchDiaryRange,
    })

    const { result } = setupHook([`/analytics?date=${targetDate}`])

    await waitFor(() => {
      expect(result.current.selectedDate).toBe(targetDate)
    })

    expect(fetchDiary).toHaveBeenCalledWith(targetDate, 1)
    expect(result.current.dailySummary).toEqual({ read: 2, skip: 1 })
    expect(result.current.reads[0].title).toBe('Analytics Article')
  })

  it('選択日の2ページ目以降は日次APIを再取得する', async () => {
    const targetDate = buildDates(toJstDateString(new Date()))[5]

    const fetchDiary = vi.fn().mockResolvedValue({
      ...buildDailyResponse(targetDate, 2, 1),
      reads: {
        data: [],
        page: 2,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      },
    })
    const fetchDiaryRange = vi.fn().mockImplementation((from: string, to: string) => {
      const dates = buildDates(to).filter((date) => date >= from)
      return Promise.resolve(dates.map((date) => buildRangeItemResponse(date, 1, 0)))
    })

    mockedUseDiaryApi.mockReturnValue({
      fetchDiary,
      fetchDiaryRange,
    })

    setupHook([`/analytics?date=${targetDate}&page=2`])

    await waitFor(() => {
      expect(fetchDiary).toHaveBeenCalledWith(targetDate, 2)
    })
  })

  it('selectDateで日付を選ぶと選択日の1ページ目を取得する', async () => {
    const targetDate = buildDates(toJstDateString(new Date()))[4]
    const fetchDiaryRange = vi.fn().mockImplementation((from: string, to: string) => {
      const dates = buildDates(to).filter((date) => date >= from)
      return Promise.resolve(dates.map((date) => buildRangeItemResponse(date, 1, 0)))
    })
    const fetchDiary = vi.fn().mockResolvedValue(buildDailyResponse(targetDate, 3, 0))

    mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange })

    const { result } = setupHook()

    await waitFor(() => {
      expect(fetchDiaryRange).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.selectDate(targetDate)
    })

    await waitFor(() => {
      expect(result.current.selectedDate).toBe(targetDate)
    })
    expect(fetchDiary).toHaveBeenCalledWith(targetDate, 1)
  })

  it('clearSelectedDateで選択を解除すると日付未選択の状態に戻る', async () => {
    const targetDate = buildDates(toJstDateString(new Date()))[4]
    const fetchDiaryRange = vi.fn().mockImplementation((from: string, to: string) => {
      const dates = buildDates(to).filter((date) => date >= from)
      return Promise.resolve(dates.map((date) => buildRangeItemResponse(date, 1, 0)))
    })
    const fetchDiary = vi.fn().mockResolvedValue(buildDailyResponse(targetDate, 3, 0))

    mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange })

    const { result } = setupHook([`/analytics?date=${targetDate}`])

    await waitFor(() => {
      expect(result.current.selectedDate).toBe(targetDate)
    })

    act(() => {
      result.current.clearSelectedDate()
    })

    await waitFor(() => {
      expect(result.current.selectedDate).toBeNull()
    })
  })

  it('選択日でtoNextPageを呼ぶと次ページの日次APIを取得する', async () => {
    const targetDate = buildDates(toJstDateString(new Date()))[4]
    const fetchDiaryRange = vi.fn().mockImplementation((from: string, to: string) => {
      const dates = buildDates(to).filter((date) => date >= from)
      return Promise.resolve(dates.map((date) => buildRangeItemResponse(date, 1, 0)))
    })
    const fetchDiary = vi.fn().mockImplementation((date: string, page: number) =>
      Promise.resolve({
        ...buildDailyResponse(date, 1, 0),
        reads: { data: [], page, totalPages: 3, hasNext: page < 3, hasPrev: page > 1 },
      }),
    )

    mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange })

    const { result } = setupHook([`/analytics?date=${targetDate}`])

    await waitFor(() => {
      expect(fetchDiary).toHaveBeenCalledWith(targetDate, 1)
    })

    act(() => {
      result.current.toNextPage()
    })

    await waitFor(() => {
      expect(fetchDiary).toHaveBeenLastCalledWith(targetDate, 2)
    })
  })

  describe('異常系', () => {
    it('週次集計の取得に失敗するとエラーのトーストを表示する', async () => {
      const fetchDiaryRange = vi.fn().mockRejectedValue(new Error('取得に失敗しました'))
      const fetchDiary = vi.fn()

      mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange })

      setupHook()

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'エラーが発生しました。時間をおいて再度お試しください。',
          expect.objectContaining({ id: 'diary-analytics-error' }),
        )
      })
    })

    it('選択日の日次取得に失敗するとエラーのトーストを表示する', async () => {
      const targetDate = buildDates(toJstDateString(new Date()))[5]
      const fetchDiaryRange = vi.fn().mockImplementation((from: string, to: string) => {
        const dates = buildDates(to).filter((date) => date >= from)
        return Promise.resolve(dates.map((date) => buildRangeItemResponse(date, 1, 0)))
      })
      const fetchDiary = vi.fn().mockRejectedValue(new Error('取得に失敗しました'))

      mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange })

      setupHook([`/analytics?date=${targetDate}`])

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'エラーが発生しました。時間をおいて再度お試しください。',
          expect.objectContaining({ id: 'diary-analytics-error' }),
        )
      })
    })

    it('週次集計の取得に失敗するとhasErrorがtrueになり、retryで再取得に成功するとfalseに戻る', async () => {
      const fetchDiaryRange = vi.fn().mockRejectedValueOnce(new Error('取得に失敗しました'))
      const fetchDiary = vi.fn()

      mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange })

      const { result } = setupHook()

      await waitFor(() => {
        expect(result.current.hasError).toBe(true)
      })

      fetchDiaryRange.mockImplementation((from: string, to: string) => {
        const dates = buildDates(to).filter((date) => date >= from)
        return Promise.resolve(dates.map((date) => buildRangeItemResponse(date, 1, 0)))
      })

      await act(async () => {
        await result.current.retry()
      })

      await waitFor(() => {
        expect(result.current.hasError).toBe(false)
      })
    })

    it('セッション切れ(401)の場合はエラートーストを表示しない', async () => {
      const fetchDiaryRange = vi.fn().mockRejectedValue(new HttpError(401, 'Unauthorized'))
      const fetchDiary = vi.fn()

      mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange })

      setupHook()

      await waitFor(() => {
        expect(fetchDiaryRange).toHaveBeenCalled()
      })
      expect(toast.error).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'diary-analytics-error' }),
      )
    })
  })
})

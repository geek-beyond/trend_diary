import { renderHook, waitFor } from '@testing-library/react'
import { addJstDays, toJstDateString } from '@trend-diary/common/locale/date'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useAnalytics from './use-analytics'
import useDiaryApi, { type DiaryRangeItemResponse, type DiaryResponse } from './use-diary-api'

vi.mock('./use-diary-api', () => ({
  default: vi.fn(),
}))

const mockedUseDiaryApi = vi.mocked(useDiaryApi)

function setupHook(initialEntries: string[] = ['/analytics']) {
  return renderHook(() => useAnalytics(true), {
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

const getTodayJst = () => {
  const result = toJstDateString(new Date())
  if (result.isErr()) return '1970-01-01'
  return result.value
}

const buildDates = (baseDate: string) =>
  Array.from({ length: 7 }, (_, index) => {
    const dateResult = addJstDays(baseDate, -(6 - index))
    if (dateResult.isErr()) return baseDate
    return dateResult.value
  })

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

    const expectedDates = buildDates(getTodayJst())
    expect(fetchDiaryRange).toHaveBeenCalledWith(expectedDates[0], expectedDates[6])
    expect(result.current.selectedDate).toBeNull()
    expect(result.current.summaryRange).toHaveLength(7)
    expect(result.current.weeklySummary).toEqual({ read: 28, skip: 0 })
    expect(result.current.sources[0]).toEqual({ media: 'qiita', read: 28, skip: 0 })
    expect(fetchDiary).not.toHaveBeenCalled()
  })

  it('選択日の1ページ目は日次集計を表示する', async () => {
    const targetDate = buildDates(getTodayJst())[5]
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
    const targetDate = buildDates(getTodayJst())[5]

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
})

import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useDiary from './use-diary'
import useDiaryApi from './use-diary-api'

vi.mock('./use-diary-api', () => ({
  default: vi.fn(),
}))

const mockedUseDiaryApi = vi.mocked(useDiaryApi)

function setupHook(initialEntries: string[] = ['/diary']) {
  return renderHook(() => useDiary(true), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(
        SWRConfig,
        { value: { provider: () => new Map(), dedupingInterval: 0 } },
        createElement(MemoryRouter, { initialEntries }, children),
      ),
  })
}

describe('useDiary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('今日の日付とページ番号で日次APIを取得する', async () => {
    const fetchDiary = vi.fn().mockResolvedValue({
      date: '2026-03-01',
      sources: [
        { media: 'qiita', read: 2, skip: 1 },
        { media: 'zenn', read: 1, skip: 0 },
        { media: 'hatena', read: 0, skip: 1 },
      ],
      reads: {
        data: [
          {
            readHistoryId: 'r1',
            articleId: 'a1',
            media: 'qiita',
            title: 'Diary Article',
            url: 'https://example.com/1',
            readAt: '2026-03-01T01:23:00.000Z',
          },
        ],
        page: 2,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      },
    })

    mockedUseDiaryApi.mockReturnValue({
      fetchDiary,
      fetchDiaryRange: vi.fn(),
    })

    const { result } = setupHook(['/diary?page=2'])

    await waitFor(() => {
      expect(fetchDiary).toHaveBeenCalledTimes(1)
    })

    const [todayDate, page] = fetchDiary.mock.calls[0]
    expect(todayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(page).toBe(2)
    expect(result.current.todayJst).toBe(todayDate)
    expect(result.current.dailySummary).toEqual({ read: 3, skip: 2 })
    expect(result.current.readPagination.page).toBe(2)
    expect(result.current.reads[0].readAt).toBeInstanceOf(Date)
  })
})

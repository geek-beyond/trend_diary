import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HttpError from '@/client/infrastructure/http-error'
import useDiary from './use-diary'
import useDiaryApi from './use-diary-api'

vi.mock('./use-diary-api', () => ({
  default: vi.fn(),
}))

const mockedUseDiaryApi = vi.mocked(useDiaryApi)

function setupHook(initialEntries: string[] = ['/diary']) {
  return renderHook(() => useDiary(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(
        SWRConfig,
        { value: { provider: () => new Map(), dedupingInterval: 0 } },
        createElement(MemoryRouter, { initialEntries }, children),
      ),
  })
}

const buildDiaryResponse = (page: number) => ({
  date: '2026-03-01',
  sources: [
    { media: 'qiita', read: 1, skip: 0 },
    { media: 'zenn', read: 0, skip: 0 },
    { media: 'hatena', read: 0, skip: 0 },
  ],
  reads: {
    data: [],
    page,
    totalPages: 3,
    hasNext: page < 3,
    hasPrev: page > 1,
  },
})

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

  it('toNextPageを呼ぶと次ページの日次APIを取得する', async () => {
    const fetchDiary = vi
      .fn()
      .mockImplementation((_date: string, page: number) =>
        Promise.resolve(buildDiaryResponse(page)),
      )
    mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange: vi.fn() })

    const { result } = setupHook(['/diary'])

    await waitFor(() => {
      expect(fetchDiary).toHaveBeenCalledWith(expect.any(String), 1)
    })

    act(() => {
      result.current.toNextPage()
    })

    await waitFor(() => {
      expect(fetchDiary).toHaveBeenLastCalledWith(expect.any(String), 2)
    })
  })

  it('2ページ目でtoPrevPageを呼ぶと1ページ目の日次APIを取得する', async () => {
    const fetchDiary = vi
      .fn()
      .mockImplementation((_date: string, page: number) =>
        Promise.resolve(buildDiaryResponse(page)),
      )
    mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange: vi.fn() })

    const { result } = setupHook(['/diary?page=2'])

    await waitFor(() => {
      expect(fetchDiary).toHaveBeenCalledWith(expect.any(String), 2)
    })

    act(() => {
      result.current.toPrevPage()
    })

    await waitFor(() => {
      expect(fetchDiary).toHaveBeenLastCalledWith(expect.any(String), 1)
    })
  })

  describe('異常系', () => {
    it('日次APIの取得に失敗するとエラーのトーストを表示する', async () => {
      const fetchDiary = vi.fn().mockRejectedValue(new Error('取得に失敗しました'))
      mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange: vi.fn() })

      setupHook(['/diary'])

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'エラーが発生しました。時間をおいて再度お試しください。',
          expect.objectContaining({ id: 'diary-error' }),
        )
      })
    })

    it('日次APIの取得に失敗するとhasErrorがtrueになり、retryで再取得に成功するとfalseに戻る', async () => {
      const fetchDiary = vi.fn().mockRejectedValueOnce(new Error('取得に失敗しました'))
      mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange: vi.fn() })

      const { result } = setupHook(['/diary'])

      await waitFor(() => {
        expect(result.current.hasError).toBe(true)
      })

      fetchDiary.mockResolvedValueOnce(buildDiaryResponse(1))

      await act(async () => {
        await result.current.retry()
      })

      await waitFor(() => {
        expect(result.current.hasError).toBe(false)
      })
    })

    it('セッション切れ(401)の場合はエラートーストを表示しない', async () => {
      const fetchDiary = vi.fn().mockRejectedValue(new HttpError(401, 'Unauthorized'))
      mockedUseDiaryApi.mockReturnValue({ fetchDiary, fetchDiaryRange: vi.fn() })

      setupHook(['/diary'])

      await waitFor(() => {
        expect(fetchDiary).toHaveBeenCalled()
      })
      expect(toast.error).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'diary-error' }),
      )
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout } from './index'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// signalがabortされるまで解決しないfetchを模し、タイムアウト挙動を検証する
const neverResolvingFetch = (_input: Parameters<typeof fetch>[0], init: { signal: AbortSignal }) =>
  new Promise((_resolve, reject) => {
    // 既にabort済みのsignalではabortイベントが発火しないため即座にrejectする
    if (init.signal.aborted) {
      reject(init.signal.reason)
      return
    }
    init.signal.addEventListener('abort', () => reject(init.signal.reason))
  })

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFetch.mockResolvedValue({ ok: true, status: 200 })
  })

  it('input・initを渡し、timeoutMsを除いて元のResponseを返してリスナーを解放すること', async () => {
    const controller = new AbortController()
    const addListener = vi.spyOn(controller.signal, 'addEventListener')
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener')
    const response = { ok: true, status: 200 }
    mockFetch.mockResolvedValueOnce(response)

    const result = await fetchWithTimeout('https://example.com', {
      method: 'POST',
      timeoutMs: 1000,
      signal: controller.signal,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(mockFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
    expect(mockFetch.mock.calls[0][1]).not.toHaveProperty('timeoutMs')
    expect(result).toBe(response)
    expect(addListener).toHaveBeenCalledTimes(1)
    expect(removeListener).toHaveBeenCalledExactlyOnceWith('abort', addListener.mock.calls[0][1])
  })

  it('既定のタイムアウト値を公開していること', () => {
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(5000)
  })

  describe('呼び出し元のsignalとタイムアウトの合成', () => {
    beforeEach(() => {
      mockFetch.mockImplementation(neverResolvingFetch)
    })

    it('指定したtimeoutMs経過でリクエストを中断すること', async () => {
      await expect(
        fetchWithTimeout('https://example.com', {
          timeoutMs: 10,
          signal: new AbortController().signal,
        }),
      ).rejects.toThrow()
    })

    it('呼び出し元の中断を伝播し、失敗後もリスナーを解放すること', async () => {
      const controller = new AbortController()
      const addListener = vi.spyOn(controller.signal, 'addEventListener')
      const removeListener = vi.spyOn(controller.signal, 'removeEventListener')
      const promise = fetchWithTimeout('https://example.com', { signal: controller.signal })
      controller.abort(new Error('caller aborted'))

      await expect(promise).rejects.toThrow('caller aborted')
      expect(addListener).toHaveBeenCalledTimes(1)
      expect(removeListener).toHaveBeenCalledExactlyOnceWith('abort', addListener.mock.calls[0][1])
    })

    it('既にabort済みのsignalでも中断を伝播すること', async () => {
      await expect(
        fetchWithTimeout('https://example.com', { signal: AbortSignal.abort(new Error('pre')) }),
      ).rejects.toThrow('pre')
    })
  })
})

describe('fetchWithTimeout().safeJson', () => {
  it('レスポンスボディを呼び出し側が指定した型として返す', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ message: 'ok' })))

    const response = await fetchWithTimeout('https://example.com', { method: 'GET' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }),
    )
    const body = await response.safeJson<{ message: string }>()

    expect(body).toEqual({ message: 'ok' })
  })
})

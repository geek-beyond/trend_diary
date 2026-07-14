import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('指定したinputとinitでfetchを呼び出すこと', async () => {
    await fetchWithTimeout('https://example.com', { method: 'POST' })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('ハング防止のためAbortSignalを付与すること', async () => {
    await fetchWithTimeout('https://example.com')

    expect(mockFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it('timeoutMsにはfetchへ渡すinitを含めないこと', async () => {
    await fetchWithTimeout('https://example.com', { method: 'GET', timeoutMs: 1000 })

    expect(mockFetch.mock.calls[0][1]).not.toHaveProperty('timeoutMs')
  })

  it('成功時はResponseをそのまま返すこと', async () => {
    const response = { ok: true, status: 200 }
    mockFetch.mockResolvedValueOnce(response)

    const result = await fetchWithTimeout('https://example.com')

    expect(result).toBe(response)
  })

  it('既定のタイムアウト値を公開していること', () => {
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(5000)
  })

  // AbortSignal.any 対応環境と未対応環境(iOS 16 等)の双方で中断が伝播することを検証する
  describe.each([
    { env: 'AbortSignal.any対応環境', anyImpl: AbortSignal.any },
    { env: 'AbortSignal.any未対応環境', anyImpl: undefined },
  ])('$env', ({ anyImpl }) => {
    let originalAny: typeof AbortSignal.any

    beforeEach(() => {
      originalAny = AbortSignal.any
      // AbortSignal.any は非optionalのため、未対応環境を再現する undefined 代入は Reflect.set で行う
      Reflect.set(AbortSignal, 'any', anyImpl)
      mockFetch.mockImplementation(neverResolvingFetch)
    })

    afterEach(() => {
      AbortSignal.any = originalAny
    })

    it('指定したtimeoutMs経過でリクエストを中断すること', async () => {
      await expect(fetchWithTimeout('https://example.com', { timeoutMs: 10 })).rejects.toThrow()
    })

    it('呼び出し元のsignalによる中断も尊重すること', async () => {
      const controller = new AbortController()
      const promise = fetchWithTimeout('https://example.com', { signal: controller.signal })
      controller.abort(new Error('caller aborted'))

      await expect(promise).rejects.toThrow('caller aborted')
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

    const response = await fetchWithTimeout('https://example.com')
    const body = await response.safeJson<{ message: string }>()

    expect(body).toEqual({ message: 'ok' })
  })
})

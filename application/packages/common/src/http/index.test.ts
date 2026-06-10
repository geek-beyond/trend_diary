import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout } from './index'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// signalがabortされるまで解決しないfetchを模し、タイムアウト挙動を検証する
const neverResolvingFetch = (_input: unknown, init: { signal: AbortSignal }) =>
  new Promise((_resolve, reject) => {
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

  it('指定したtimeoutMs経過でリクエストを中断すること', async () => {
    mockFetch.mockImplementation(neverResolvingFetch)

    await expect(fetchWithTimeout('https://example.com', { timeoutMs: 10 })).rejects.toThrow()
  })

  it('呼び出し元のsignalによる中断も尊重すること', async () => {
    mockFetch.mockImplementation(neverResolvingFetch)

    const controller = new AbortController()
    const promise = fetchWithTimeout('https://example.com', { signal: controller.signal })
    controller.abort(new Error('caller aborted'))

    await expect(promise).rejects.toThrow('caller aborted')
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
})

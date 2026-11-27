import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import getApiClient from '@/infrastructure/api'

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('APIクライアントの生成', () => {
  it('ブラウザでは同じオリジンを使い、繰り返し取得しても同じクライアントを返す', async () => {
    vi.stubGlobal('window', { location: { protocol: 'https:', host: 'example.com' } })
    const { default: getApiClientForClient } = await import('./api')

    const client = getApiClientForClient()

    expect(client).toBeDefined()
    expect(getApiClientForClient()).toBe(client)
    expect(getApiClient).toHaveBeenCalledExactlyOnceWith('https://example.com')
  })

  it('サーバーではブラウザのオリジンを参照せず、空の基底URLでクライアントを生成する', async () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('window', undefined)
    const { default: getApiClientForClient } = await import('./api')

    expect(getApiClientForClient()).toBeDefined()
    expect(getApiClient).toHaveBeenCalledExactlyOnceWith('')
  })
})

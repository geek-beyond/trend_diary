import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import usePasskeyRegister from './use-passkey-register'

// vi.mockはimport上へ巻き上げられ、モック実体を factory 内で直接参照するため hoisted で初期化する
const startRegistrationMock = vi.hoisted(() => vi.fn())

vi.mock('@simplewebauthn/browser', () => ({ startRegistration: startRegistrationMock }))

const mockApiClient = {
  passkey: {
    register: {
      start: { $post: vi.fn() },
      verify: { $post: vi.fn() },
    },
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

describe('usePasskeyRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
    mockApiClient.passkey.register.start.$post.mockResolvedValue({
      ok: true,
      json: async () => ({ challengeId: 'challenge-1', options: {} }),
    })
    startRegistrationMock.mockResolvedValue({ id: 'credential-1' })
    mockApiClient.passkey.register.verify.$post.mockResolvedValue({ ok: true, status: 201 })
  })

  describe('正常系', () => {
    it('start→ceremony→verifyが成功するとtrueを返し成功トーストを出す', async () => {
      const { result } = renderHook(() => usePasskeyRegister())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.register()
      })

      expect(returned).toBe(true)
      expect(toast.success).toHaveBeenCalledWith('パスキーを登録しました')
    })
  })

  describe('準正常系', () => {
    it('startが非OKならfalseを返し登録失敗トーストを出す', async () => {
      mockApiClient.passkey.register.start.$post.mockResolvedValue({ ok: false, status: 500 })
      const { result } = renderHook(() => usePasskeyRegister())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.register()
      })

      expect(returned).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('パスキーの登録に失敗しました。')
    })

    it('ceremonyがキャンセルされたらfalseを返し中断案内トーストを出す', async () => {
      startRegistrationMock.mockRejectedValue(new Error('canceled'))
      const { result } = renderHook(() => usePasskeyRegister())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.register()
      })

      expect(returned).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('パスキーの操作がキャンセルされました。')
    })

    it('verifyが非OKならfalseを返し登録失敗トーストを出す', async () => {
      mockApiClient.passkey.register.verify.$post.mockResolvedValue({ ok: false, status: 400 })
      const { result } = renderHook(() => usePasskeyRegister())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.register()
      })

      expect(returned).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('パスキーの登録に失敗しました。')
    })
  })
})

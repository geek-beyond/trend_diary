import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import useGithubUnlink from './use-github-unlink'

const mockApiClient = {
  auth: {
    oauth: {
      github: {
        $delete: vi.fn(),
      },
    },
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

describe('useGithubUnlink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  describe('正常系', () => {
    it('解除に成功するとtrueを返し成功トーストを出す', async () => {
      mockApiClient.auth.oauth.github.$delete.mockResolvedValue({ ok: true, status: 204 })

      const { result } = renderHook(() => useGithubUnlink())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.unlink()
      })

      expect(returned).toBe(true)
      expect(toast.success).toHaveBeenCalledWith('GitHub連携を解除しました')
    })
  })

  describe('準正常系', () => {
    it('唯一のログイン手段(400)なら解除不可の案内トーストを出す', async () => {
      mockApiClient.auth.oauth.github.$delete.mockResolvedValue({ ok: false, status: 400 })

      const { result } = renderHook(() => useGithubUnlink())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.unlink()
      })

      expect(returned).toBe(false)
      expect(toast.error).toHaveBeenCalledWith(
        'GitHubが唯一のログイン方法のため、連携を解除できません。',
      )
    })

    it('レスポンスが非OKならfalseを返しエラートーストを出す', async () => {
      mockApiClient.auth.oauth.github.$delete.mockResolvedValue({ ok: false, status: 500 })

      const { result } = renderHook(() => useGithubUnlink())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.unlink()
      })

      expect(returned).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('GitHub連携の解除に失敗しました。')
    })
  })

  describe('異常系', () => {
    it('通信が例外を投げるとfalseを返しエラートーストを出す', async () => {
      mockApiClient.auth.oauth.github.$delete.mockRejectedValue(new Error('network down'))

      const { result } = renderHook(() => useGithubUnlink())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.unlink()
      })

      expect(returned).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('GitHub連携の解除に失敗しました。')
    })
  })
})

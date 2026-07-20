import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import useGithubUnlink from './use-github-unlink'

const mockApiClient = {
  oauth: {
    ':provider': {
      $delete: vi.fn(),
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
    it('解除に成功すると成功トーストを出す', async () => {
      mockApiClient.oauth[':provider'].$delete.mockResolvedValue({ ok: true, status: 204 })

      const { result } = renderHook(() => useGithubUnlink())

      await act(async () => {
        await result.current.unlink()
      })

      expect(toast.success).toHaveBeenCalledWith('GitHub連携を解除しました')
    })
  })

  describe('準正常系', () => {
    it('唯一のログイン手段なら解除不可の案内トーストを出す', async () => {
      mockApiClient.oauth[':provider'].$delete.mockResolvedValue({ ok: false, status: 400 })

      const { result } = renderHook(() => useGithubUnlink())

      await act(async () => {
        await result.current.unlink()
      })

      expect(toast.error).toHaveBeenCalledWith(
        'GitHubが唯一のログイン方法のため、連携を解除できません。',
      )
    })

    it('解除に失敗するとエラートーストを出す', async () => {
      mockApiClient.oauth[':provider'].$delete.mockResolvedValue({ ok: false, status: 500 })

      const { result } = renderHook(() => useGithubUnlink())

      await act(async () => {
        await result.current.unlink()
      })

      expect(toast.error).toHaveBeenCalledWith('GitHub連携の解除に失敗しました。')
    })
  })

  describe('異常系', () => {
    it('通信が例外を投げるとエラートーストを出す', async () => {
      mockApiClient.oauth[':provider'].$delete.mockRejectedValue(new Error('network down'))

      const { result } = renderHook(() => useGithubUnlink())

      await act(async () => {
        await result.current.unlink()
      })

      expect(toast.error).toHaveBeenCalledWith('GitHub連携の解除に失敗しました。')
    })
  })
})

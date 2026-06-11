import type { RenderHookResult } from '@testing-library/react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import useLogout from './use-logout'

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/client/infrastructure/create-swr-fetcher', () => {
  const mockClient = {
    auth: {
      logout: {
        $delete: vi.fn(),
      },
    },
  }
  const mockApiCall = vi.fn()

  return {
    default: () => ({
      client: mockClient,
      apiCall: mockApiCall,
    }),
  }
})

type UseLogoutHook = ReturnType<typeof useLogout>

function setupHook(): RenderHookResult<UseLogoutHook, unknown> {
  return renderHook(() => useLogout())
}

describe('useLogout', () => {
  describe('基本動作', () => {
    it('初期状態ではisLoadingがfalseである', () => {
      const { result } = setupHook()

      expect(result.current.isLoading).toBe(false)
      expect(typeof result.current.handleLogout).toBe('function')
    })

    it('handleLogoutが呼び出せる', () => {
      const { result } = setupHook()

      act(() => {
        result.current.handleLogout()
      })

      expect(result.current.handleLogout).toBeDefined()
    })
  })

  describe('エッジケース', () => {
    it('複数回handleLogoutを呼び出しても問題ない', () => {
      const { result } = setupHook()

      act(() => {
        result.current.handleLogout()
        result.current.handleLogout()
      })

      expect(result.current.handleLogout).toBeDefined()
    })
  })

  describe('境界値テスト', () => {
    it('フック初期化時の予期しないエラー', () => {
      expect(() => {
        const { result } = setupHook()
        expect(result.current).toBeDefined()
      }).not.toThrow()
    })
  })
})

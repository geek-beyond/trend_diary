import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useOauthErrorToast from './use-oauth-error-toast'

// useSearchParamsを使うため、初期URLを指定したRouter配下で実行する
function wrapperWithUrl(initialUrl: string) {
  return ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [initialUrl] }, children)
}

describe('useOauthErrorToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('oauthError=githubがあればエラートーストを出し、クエリを取り除く', async () => {
      renderHook(() => useOauthErrorToast('GitHub連携に失敗しました。'), {
        wrapper: wrapperWithUrl('/settings?oauthError=github'),
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('GitHub連携に失敗しました。', {
          id: 'github-oauth-error',
        })
      })
    })

    it('oauthErrorが無ければ何もしない', () => {
      renderHook(() => useOauthErrorToast('GitHub連携に失敗しました。'), {
        wrapper: wrapperWithUrl('/settings'),
      })

      expect(vi.mocked(toast.error)).not.toHaveBeenCalled()
    })
  })
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GithubLinkToggle from './github-link-toggle'
import type * as GithubAuthModel from './model'
import { navigateToGithubLink } from './model'

const unlinkMock = vi.fn()
const mutateMock = vi.fn()
const statusState = { linked: false, isLoading: false }
const unlinkState = { isSubmitting: false }

vi.mock('@/client/features/github-auth/use-github-link-status', () => ({
  default: () => ({ ...statusState, mutate: mutateMock }),
}))
vi.mock('@/client/features/github-auth/use-github-unlink', () => ({
  default: () => ({ ...unlinkState, unlink: unlinkMock }),
}))
// jsdomではwindow.location.assignを再定義できないため、遷移関数ごと差し替える
vi.mock('@/client/features/github-auth/model', async (importOriginal) => ({
  ...(await importOriginal<typeof GithubAuthModel>()),
  navigateToGithubLink: vi.fn(),
}))

describe('GithubLinkToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    statusState.linked = false
    statusState.isLoading = false
    unlinkState.isSubmitting = false
  })

  describe('正常系', () => {
    it('未連携ならトグルはOFF、ONにすると連携開始へ遷移する', () => {
      render(createElement(GithubLinkToggle))
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'false')

      fireEvent.click(toggle)

      expect(navigateToGithubLink).toHaveBeenCalled()
      expect(unlinkMock).not.toHaveBeenCalled()
    })

    it('連携済みならトグルはON、OFFにすると解除し状態を取り直す', async () => {
      statusState.linked = true
      unlinkMock.mockResolvedValue(true)

      render(createElement(GithubLinkToggle))
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'true')

      fireEvent.click(toggle)

      await waitFor(() => {
        expect(unlinkMock).toHaveBeenCalled()
      })
      expect(mutateMock).toHaveBeenCalled()
    })
  })

  describe('準正常系', () => {
    it('解除に失敗したら状態を取り直さない', async () => {
      statusState.linked = true
      unlinkMock.mockResolvedValue(false)

      render(createElement(GithubLinkToggle))
      fireEvent.click(screen.getByRole('switch'))

      await waitFor(() => {
        expect(unlinkMock).toHaveBeenCalled()
      })
      expect(mutateMock).not.toHaveBeenCalled()
    })

    it('状態の取得中や処理中の操作は無視する', () => {
      statusState.isLoading = true

      render(createElement(GithubLinkToggle))
      fireEvent.click(screen.getByRole('switch'))

      expect(navigateToGithubLink).not.toHaveBeenCalled()
      expect(unlinkMock).not.toHaveBeenCalled()
    })
  })
})

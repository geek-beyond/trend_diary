import { fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PasskeyLoginButton from './passkey-login-button'
import usePasskeyLogin from './use-passkey-login'

const loginMock = vi.fn()
const hookState: { isSubmitting: boolean; formError: string | undefined } = {
  isSubmitting: false,
  formError: undefined,
}

vi.mock('@/client/features/passkey/use-passkey-login', () => ({
  default: vi.fn(() => ({ ...hookState, login: loginMock })),
}))

const mockedUsePasskeyLogin = vi.mocked(usePasskeyLogin)

describe('PasskeyLoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hookState.isSubmitting = false
    hookState.formError = undefined
  })

  describe('正常系', () => {
    it('ボタンを表示し、クリックでloginを呼ぶ', () => {
      render(createElement(PasskeyLoginButton))

      fireEvent.click(screen.getByRole('button', { name: 'パスキーでログイン' }))

      expect(loginMock).toHaveBeenCalled()
    })

    it('送信中はラベルを切り替えてボタンを無効化する', () => {
      hookState.isSubmitting = true
      render(createElement(PasskeyLoginButton))

      expect(screen.getByRole('button', { name: 'パスキーで認証中...' })).toBeDisabled()
    })

    it('redirectToを指定するとフックへ渡す', () => {
      render(createElement(PasskeyLoginButton, { redirectTo: '/diary' }))

      expect(mockedUsePasskeyLogin).toHaveBeenCalledWith('/diary')
    })
  })

  describe('準正常系', () => {
    it('formErrorがあればエラーメッセージを表示する', () => {
      hookState.formError = 'パスキーでのログインに失敗しました。'
      render(createElement(PasskeyLoginButton))

      expect(screen.getByText('パスキーでのログインに失敗しました。')).toBeInTheDocument()
    })
  })
})

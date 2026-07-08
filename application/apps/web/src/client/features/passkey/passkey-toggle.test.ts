import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PasskeyToggle from './passkey-toggle'

const registerMock = vi.fn()
const disableMock = vi.fn()
const mutateMock = vi.fn()
const statusState = { hasPasskey: false, isLoading: false }

vi.mock('@/client/features/passkey/use-passkey-status', () => ({
  default: () => ({ ...statusState, mutate: mutateMock }),
}))
vi.mock('@/client/features/passkey/use-passkey-register', () => ({
  default: () => ({ isSubmitting: false, register: registerMock }),
}))
vi.mock('@/client/features/passkey/use-passkey-disable', () => ({
  default: () => ({ isSubmitting: false, disable: disableMock }),
}))

describe('PasskeyToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    statusState.hasPasskey = false
    statusState.isLoading = false
  })

  describe('正常系', () => {
    it('未登録ならトグルはOFF、ONにすると登録し状態を取り直す', async () => {
      registerMock.mockResolvedValue(true)

      render(createElement(PasskeyToggle))
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'false')

      fireEvent.click(toggle)

      await waitFor(() => {
        expect(registerMock).toHaveBeenCalled()
      })
      expect(disableMock).not.toHaveBeenCalled()
      expect(mutateMock).toHaveBeenCalled()
    })

    it('登録済みならトグルはON、OFFにすると無効化し状態を取り直す', async () => {
      statusState.hasPasskey = true
      disableMock.mockResolvedValue(true)

      render(createElement(PasskeyToggle))
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'true')

      fireEvent.click(toggle)

      await waitFor(() => {
        expect(disableMock).toHaveBeenCalled()
      })
      expect(registerMock).not.toHaveBeenCalled()
      expect(mutateMock).toHaveBeenCalled()
    })
  })

  describe('準正常系', () => {
    it('登録に失敗したら状態を取り直さない', async () => {
      registerMock.mockResolvedValue(false)

      render(createElement(PasskeyToggle))
      fireEvent.click(screen.getByRole('switch'))

      await waitFor(() => {
        expect(registerMock).toHaveBeenCalled()
      })
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })
})

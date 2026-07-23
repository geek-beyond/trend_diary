import { fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ThemeToggle from './theme-toggle'

const setThemeMock = vi.fn()
const themeState: { theme: string | undefined } = { theme: 'system' }

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: themeState.theme, setTheme: setThemeMock }),
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    themeState.theme = 'system'
  })

  describe('正常系', () => {
    it('現在のテーマのボタンにのみ選択スタイルが当たる', () => {
      themeState.theme = 'dark'

      render(createElement(ThemeToggle))

      expect(screen.getByRole('button', { name: 'ダーク' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'システム' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
      expect(screen.getByRole('button', { name: 'ライト' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

    it('ボタンを押すと選択したテーマでsetThemeが呼ばれる', () => {
      render(createElement(ThemeToggle))

      fireEvent.click(screen.getByRole('button', { name: 'ライト' }))

      expect(setThemeMock).toHaveBeenCalledWith('light')
    })
  })
})

import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import SettingsPage from './page'

// トグル本体は各featureのテストで検証するため、ここではセクションの出し分けだけを見る
vi.mock('@/client/features/passkey/passkey-toggle', () => ({
  default: () => createElement('div', { role: 'switch', 'aria-label': 'パスキーを有効にする' }),
}))
vi.mock('@/client/features/theme/theme-toggle', () => ({
  default: () => createElement('div', { 'data-testid': 'theme-toggle' }),
}))
vi.mock('@/client/features/github-auth/github-link-toggle', () => ({
  default: () => createElement('div', { role: 'switch', 'aria-label': 'GitHub連携を有効にする' }),
}))

describe('SettingsPage', () => {
  it('テーマ設定セクションを表示する', () => {
    render(createElement(SettingsPage))

    expect(screen.getByRole('heading', { name: 'テーマ' })).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('パスキートグルを表示する', () => {
    render(createElement(SettingsPage))

    expect(screen.getByRole('switch', { name: 'パスキーを有効にする' })).toBeInTheDocument()
  })

  it('GitHub連携トグルを表示する', () => {
    render(createElement(SettingsPage))

    expect(screen.getByRole('switch', { name: 'GitHub連携を有効にする' })).toBeInTheDocument()
  })
})

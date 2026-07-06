import { render, screen } from '@testing-library/react'
import { type ComponentProps, createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import SettingsPage from './page'

// トグル本体はpasskey-toggle.test.tsで検証するため、ここではセクションの出し分けだけを見る
vi.mock('@/client/features/passkey/passkey-toggle', () => ({
  default: () => createElement('div', { role: 'switch', 'aria-label': 'パスキーを有効にする' }),
}))

type SettingsPageProps = ComponentProps<typeof SettingsPage>

const buildProps = (overrides: Partial<SettingsPageProps> = {}): SettingsPageProps => ({
  isLoggedIn: true,
  passkeyEnabled: true,
  ...overrides,
})

describe('SettingsPage', () => {
  it('ログイン中でpasskey有効ならパスキートグルを表示する', () => {
    render(createElement(SettingsPage, buildProps()))

    expect(screen.getByRole('switch', { name: 'パスキーを有効にする' })).toBeInTheDocument()
  })

  it('passkey無効ならパスキーセクションを表示しない', () => {
    render(createElement(SettingsPage, buildProps({ passkeyEnabled: false })))

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('未ログイン時はログイン要求のみ表示しパスキーセクションを表示しない', () => {
    render(createElement(SettingsPage, buildProps({ isLoggedIn: false })))

    expect(screen.getByText('この機能はログイン時のみ利用できます。')).toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })
})

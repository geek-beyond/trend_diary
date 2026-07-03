import { render, screen } from '@testing-library/react'
import { type ComponentProps, createElement } from 'react'
import SettingsPage from './page'

type SettingsPageProps = ComponentProps<typeof SettingsPage>

const buildProps = (overrides: Partial<SettingsPageProps> = {}): SettingsPageProps => ({
  isLoggedIn: true,
  passkeyEnabled: true,
  ...overrides,
})

describe('SettingsPage', () => {
  it('ログイン中でpasskey有効ならパスキー登録ボタンを表示する', () => {
    render(createElement(SettingsPage, buildProps()))

    expect(screen.getByRole('button', { name: 'パスキーを登録' })).toBeInTheDocument()
  })

  it('passkey無効ならパスキーセクションを表示しない', () => {
    render(createElement(SettingsPage, buildProps({ passkeyEnabled: false })))

    expect(screen.queryByRole('button', { name: 'パスキーを登録' })).not.toBeInTheDocument()
  })

  it('未ログイン時はログイン要求のみ表示しパスキーセクションを表示しない', () => {
    render(createElement(SettingsPage, buildProps({ isLoggedIn: false })))

    expect(screen.getByText('この機能はログイン時のみ利用できます。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'パスキーを登録' })).not.toBeInTheDocument()
  })
})

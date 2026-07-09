import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import SettingsPage from './page'

// トグル本体はpasskey-toggle.test.tsで検証するため、ここではセクションの出し分けだけを見る
vi.mock('@/client/features/passkey/passkey-toggle', () => ({
  default: () => createElement('div', { role: 'switch', 'aria-label': 'パスキーを有効にする' }),
}))

describe('SettingsPage', () => {
  it('パスキートグルを表示する', () => {
    render(createElement(SettingsPage))

    expect(screen.getByRole('switch', { name: 'パスキーを有効にする' })).toBeInTheDocument()
  })
})

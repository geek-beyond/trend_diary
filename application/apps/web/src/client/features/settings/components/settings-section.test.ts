import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import SettingsSection from './settings-section'

describe('SettingsSection', () => {
  it('見出し・説明文・右側コントロールを表示する', () => {
    render(
      createElement(
        SettingsSection,
        {
          title: 'テーマ',
          description: '画面の配色を選べます。',
        },
        createElement('div', { 'data-testid': 'control' }),
      ),
    )

    expect(screen.getByRole('heading', { name: 'テーマ' })).toBeInTheDocument()
    expect(screen.getByText('画面の配色を選べます。')).toBeInTheDocument()
    expect(screen.getByTestId('control')).toBeInTheDocument()
  })

  it('badgeを渡すと見出し横にバッジを表示する', () => {
    render(
      createElement(SettingsSection, {
        title: 'パスキー',
        description: 'パスキーを有効にできます。',
        badge: { label: 'β版' },
      }),
    )

    expect(screen.getByRole('heading', { name: 'パスキー' })).toBeInTheDocument()
    expect(screen.getByText('β版')).toBeInTheDocument()
  })

  it('withDividerを指定すると区切り線のクラスが付く', () => {
    const { container } = render(
      createElement(SettingsSection, {
        title: 'テーマ',
        description: '説明',
        withDivider: true,
      }),
    )

    expect(container.querySelector('section')).toHaveClass('border-t')
  })

  it('withDivider未指定では区切り線のクラスが付かない', () => {
    const { container } = render(
      createElement(SettingsSection, {
        title: 'テーマ',
        description: '説明',
      }),
    )

    expect(container.querySelector('section')).not.toHaveClass('border-t')
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ToggleGroup, type ToggleOption } from './index'

const options: ToggleOption<string>[] = [
  { value: 'all', label: 'すべて' },
  { value: 'unread', label: '未読' },
]

// iconは任意のため、指定したoptionにのみ描画されることを確かめる
const mixedIconOptions: ToggleOption<string>[] = [
  {
    value: 'with-icon',
    label: 'アイコンあり',
    icon: createElement('svg', { 'data-testid': 'option-icon' }),
  },
  { value: 'without-icon', label: 'アイコンなし' },
]

describe('ToggleGroup', () => {
  describe('正常系', () => {
    it('選択中の値のボタンにのみ選択スタイルとaria-pressedが当たる', () => {
      render(
        createElement(ToggleGroup<string>, {
          options,
          selectedValue: 'unread',
          onSelect: vi.fn(),
        }),
      )

      const selected = screen.getByRole('button', { name: '未読' })
      const unselected = screen.getByRole('button', { name: 'すべて' })
      expect(selected).toHaveClass('bg-blue-50')
      expect(selected).toHaveAttribute('aria-pressed', 'true')
      expect(unselected).not.toHaveClass('bg-blue-50')
      expect(unselected).toHaveAttribute('aria-pressed', 'false')
    })

    it('ボタンを押すと該当optionのvalueでonSelectが呼ばれる', () => {
      const onSelect = vi.fn()
      render(
        createElement(ToggleGroup<string>, {
          options,
          selectedValue: 'all',
          onSelect,
        }),
      )

      fireEvent.click(screen.getByRole('button', { name: '未読' }))

      expect(onSelect).toHaveBeenCalledWith('unread')
    })

    it('iconは指定したoptionにのみ描画され、未指定のoptionには描画されない', () => {
      render(
        createElement(ToggleGroup<string>, {
          options: mixedIconOptions,
          selectedValue: 'with-icon',
          onSelect: vi.fn(),
        }),
      )

      expect(screen.getByRole('button', { name: 'アイコンあり' })).toContainElement(
        screen.getByTestId('option-icon'),
      )
      expect(screen.getByRole('button', { name: 'アイコンなし' })).not.toContainElement(
        screen.queryByTestId('option-icon'),
      )
    })
  })
})

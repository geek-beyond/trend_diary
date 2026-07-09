import { fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ToggleGroup, type ToggleOption } from './index'

const options: ToggleOption<string>[] = [
  { value: 'all', label: 'すべて', dataSlot: 'toggle-all' },
  { value: 'unread', label: '未読', dataSlot: 'toggle-unread' },
]

describe('ToggleGroup', () => {
  describe('正常系', () => {
    it('選択中の値のボタンにのみ選択スタイルとaria-pressedが当たる', () => {
      render(
        createElement(ToggleGroup<string>, {
          options,
          selectedValue: 'unread',
          onSelect: vi.fn(),
          dataSlot: 'toggle-group',
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
          dataSlot: 'toggle-group',
        }),
      )

      fireEvent.click(screen.getByRole('button', { name: '未読' }))

      expect(onSelect).toHaveBeenCalledWith('unread')
    })
  })
})

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
    it('選択中の値のボタンにのみ選択スタイルが当たる', () => {
      render(
        createElement(ToggleGroup<string>, {
          options,
          selectedValue: 'unread',
          onSelect: vi.fn(),
          dataSlot: 'toggle-group',
        }),
      )

      expect(screen.getByRole('button', { name: '未読' })).toHaveClass('bg-blue-50')
      expect(screen.getByRole('button', { name: 'すべて' })).not.toHaveClass('bg-blue-50')
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

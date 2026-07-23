import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { ALL_MEDIA } from '../model/media-selection'
import MediaMultiFilter from './media-multi-filter'

const meta: Meta<typeof MediaMultiFilter> = {
  component: MediaMultiFilter,
  parameters: {
    layout: 'centered',
  },
}
export default meta

type Story = StoryObj<typeof MediaMultiFilter>

export const AllSelected: Story = {
  args: {
    selectedMedia: ALL_MEDIA,
    onMediaChange: fn(),
  },
  play: async ({ canvas, step }) => {
    await step('全メディア選択時は各媒体が選択状態で表示される', async () => {
      await expect(canvas.getByRole('button', { name: 'Qiita' })).toHaveClass(/bg-blue-50/)
      await expect(canvas.getByRole('button', { name: 'Zenn' })).toHaveClass(/bg-blue-50/)
      await expect(canvas.getByRole('button', { name: 'はてブ' })).toHaveClass(/bg-blue-50/)
    })
  },
}

export const MultipleSelected: Story = {
  args: {
    selectedMedia: ['qiita', 'zenn'],
    onMediaChange: fn(),
  },
  play: async ({ canvas, step }) => {
    await step('選択中の媒体だけが選択状態で表示される', async () => {
      await expect(canvas.getByRole('button', { name: 'Qiita' })).toHaveClass(/bg-blue-50/)
      await expect(canvas.getByRole('button', { name: 'Zenn' })).toHaveClass(/bg-blue-50/)
      await expect(canvas.getByRole('button', { name: 'はてブ' })).not.toHaveClass(/bg-blue-50/)
    })
  },
}

export const AddMedia: Story = {
  args: {
    selectedMedia: ['qiita'],
    onMediaChange: fn(),
  },
  play: async ({ args, canvas, step }) => {
    await step('未選択の媒体を押すと選択中の媒体に追加して通知する', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Zenn' }))
      await expect(args.onMediaChange).toHaveBeenCalledWith(['qiita', 'zenn'])
    })
  },
}

export const RemoveMedia: Story = {
  args: {
    selectedMedia: ['qiita', 'zenn'],
    onMediaChange: fn(),
  },
  play: async ({ args, canvas, step }) => {
    await step('選択中の媒体を押すと選択から外して通知する', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Qiita' }))
      await expect(args.onMediaChange).toHaveBeenCalledWith(['zenn'])
    })
  },
}

export const CannotDeselectLast: Story = {
  args: {
    selectedMedia: ['qiita'],
    onMediaChange: fn(),
  },
  play: async ({ args, canvas, step }) => {
    await step('選択が1件のときはその媒体を外せない（通知しない）', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Qiita' }))
      await expect(args.onMediaChange).not.toHaveBeenCalled()
    })
  },
}

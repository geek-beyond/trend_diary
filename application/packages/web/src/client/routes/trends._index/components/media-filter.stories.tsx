import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import MediaFilter from './media-filter'

const meta: Meta<typeof MediaFilter> = {
  component: MediaFilter,
  parameters: {
    layout: 'centered',
  },
}
export default meta

type Story = StoryObj<typeof MediaFilter>

export const AllSelected: Story = {
  args: {
    selectedMedia: null,
    onMediaChange: fn(),
  },
  play: async ({ canvas, step }) => {
    await step('「すべて」が選択状態で表示される', async () => {
      await expect(canvas.getByRole('button', { name: 'すべて' })).toHaveClass(/bg-blue-50/)
      await expect(canvas.getByRole('button', { name: 'Qiita' })).not.toHaveClass(/bg-blue-50/)
      await expect(canvas.getByRole('button', { name: 'Zenn' })).not.toHaveClass(/bg-blue-50/)
    })
  },
}

export const QiitaSelected: Story = {
  args: {
    selectedMedia: 'qiita',
    onMediaChange: fn(),
  },
  play: async ({ canvas, step }) => {
    await step('「Qiita」が選択状態で表示される', async () => {
      await expect(canvas.getByRole('button', { name: 'Qiita' })).toHaveClass(/bg-blue-50/)
    })
  },
}

export const ZennSelected: Story = {
  args: {
    selectedMedia: 'zenn',
    onMediaChange: fn(),
  },
  play: async ({ canvas, step }) => {
    await step('「Zenn」が選択状態で表示される', async () => {
      await expect(canvas.getByRole('button', { name: 'Zenn' })).toHaveClass(/bg-blue-50/)
    })
  },
}

export const SelectQiita: Story = {
  args: {
    selectedMedia: null,
    onMediaChange: fn(),
  },
  play: async ({ args, canvas, step }) => {
    await step('Qiitaを押すとコールバックが呼ばれる', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Qiita' }))
      await expect(args.onMediaChange).toHaveBeenCalledWith('qiita')
    })
  },
}

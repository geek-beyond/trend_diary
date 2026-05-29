import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import DiaryLoginRequired from './diary-login-required'

const meta: Meta<typeof DiaryLoginRequired> = {
  component: DiaryLoginRequired,
  args: {
    pageTitle: 'ダイアリー',
  },
}
export default meta

type Story = StoryObj<typeof DiaryLoginRequired>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'ダイアリー' })).toBeInTheDocument()
    await expect(canvas.getByText('この機能はログイン時のみ利用できます。')).toBeInTheDocument()
  },
}

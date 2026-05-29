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
    // ページタイトルが見出しとして表示されることを確認
    await expect(canvas.getByRole('heading', { name: 'ダイアリー' })).toBeInTheDocument()

    // ログイン必須の案内文が表示されることを確認
    await expect(canvas.getByText('この機能はログイン時のみ利用できます。')).toBeInTheDocument()
  },
}

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import LoginRequired from './index'

const meta: Meta<typeof LoginRequired> = {
  component: LoginRequired,
  parameters: {
    layout: 'centered',
  },
  args: {
    pageTitle: 'インボックス',
  },
}
export default meta

type Story = StoryObj<typeof LoginRequired>

export const Default: Story = {
  play: async ({ canvas, step }) => {
    await step('ページタイトルが見出しとして表示されることを確認', async () => {
      await expect(canvas.getByRole('heading', { name: 'インボックス' })).toBeInTheDocument()
    })

    await step('ログイン要求メッセージが表示されることを確認', async () => {
      await expect(canvas.getByText('この機能はログイン時のみ利用できます。')).toBeInTheDocument()
    })
  },
}

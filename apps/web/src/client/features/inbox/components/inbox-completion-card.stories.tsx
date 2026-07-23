import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import InboxCompletionCard from './inbox-completion-card'

const meta: Meta<typeof InboxCompletionCard> = {
  component: InboxCompletionCard,
  parameters: {
    layout: 'centered',
  },
}
export default meta

type Story = StoryObj<typeof InboxCompletionCard>

export const Default: Story = {
  play: async ({ canvas, step }) => {
    await step('完了バッジが表示されることを確認', async () => {
      await expect(canvas.getByText('消化完了')).toBeInTheDocument()
    })

    await step('完了メッセージが表示されることを確認', async () => {
      await expect(
        canvas.getByText('いいペース。次の更新までこのペースをキープしよう。'),
      ).toBeInTheDocument()
    })

    await step('トレンド一覧への導線が表示されることを確認', async () => {
      await expect(canvas.getByRole('link', { name: 'トレンド一覧へ' })).toBeInTheDocument()
    })
  },
}

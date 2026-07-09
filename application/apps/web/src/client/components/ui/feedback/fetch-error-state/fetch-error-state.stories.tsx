import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import FetchErrorState from './index'

const meta: Meta<typeof FetchErrorState> = {
  component: FetchErrorState,
  parameters: {
    layout: 'centered',
  },
  args: {
    onRetry: fn(),
  },
}
export default meta

type Story = StoryObj<typeof FetchErrorState>

export const Default: Story = {
  play: async ({ canvas, args, step }) => {
    await step('エラーメッセージが表示されることを確認', async () => {
      await expect(
        canvas.getByText('エラーが発生しました。時間をおいて再度お試しください。'),
      ).toBeInTheDocument()
    })

    await step('再試行ボタンを押すとonRetryが呼ばれることを確認', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '再試行' }))
      await expect(args.onRetry).toHaveBeenCalledTimes(1)
    })
  },
}

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import InboxBodySkeleton from './inbox-body-skeleton'

const meta: Meta<typeof InboxBodySkeleton> = {
  component: InboxBodySkeleton,
  parameters: {
    layout: 'centered',
  },
}
export default meta

type Story = StoryObj<typeof InboxBodySkeleton>

export const Default: Story = {
  play: async ({ canvas }) => {
    // スクリーンリーダーへ読み込み中を伝える status ロールを持つこと
    await expect(canvas.getByRole('status', { name: '読み込み中' })).toBeInTheDocument()
  },
}

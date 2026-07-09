import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import ArticleCardSkeleton from './article-card-skeleton'

const meta: Meta<typeof ArticleCardSkeleton> = {
  component: ArticleCardSkeleton,
  parameters: {
    layout: 'centered',
  },
}
export default meta

type Story = StoryObj<typeof ArticleCardSkeleton>

export const Default: Story = {
  play: async ({ canvas }) => {
    // ArticleCard と同じ寸法で描画され、切り替え時にレイアウトが揺れないこと
    const skeleton = canvas.getByTestId('article-card-skeleton')
    await expect(skeleton).toBeInTheDocument()
    await expect(skeleton).toHaveClass('h-32')
  },
}

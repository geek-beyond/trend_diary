import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import PageContainer from './index'

const meta: Meta<typeof PageContainer> = {
  component: PageContainer,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    children: <p>本文コンテンツ</p>,
  },
}
export default meta

type Story = StoryObj<typeof PageContainer>

export const Default: Story = {
  play: async ({ canvas }) => {
    const content = canvas.getByText('本文コンテンツ')
    await expect(content).toBeInTheDocument()
    // スクリーンリーダー向けに本文を main ランドマークとして公開することを確認する
    await expect(canvas.getByRole('main')).toContainElement(content)
    // 残り高さを埋める flex-1 が付いていることを確認する
    await expect(content.parentElement).toHaveClass('flex-1')
  },
}

export const WithClassName: Story = {
  args: {
    className: 'relative',
  },
  play: async ({ canvas }) => {
    const content = canvas.getByText('本文コンテンツ')
    // 追加 className が既定クラスと併存することを確認する
    await expect(content.parentElement).toHaveClass('flex-1', 'relative')
  },
}

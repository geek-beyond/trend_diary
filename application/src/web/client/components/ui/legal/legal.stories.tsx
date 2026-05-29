import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Heading1, Heading2, Heading3, Paragraph } from './index'

const meta: Meta = {
  title: 'ui/legal',
}
export default meta

type Story = StoryObj

export const AllElements: Story = {
  render: () => (
    <article>
      <Heading1>利用規約</Heading1>
      <Paragraph>本規約は、サービスの利用条件を定めるものです。</Paragraph>
      <Heading2>第1条 適用</Heading2>
      <Paragraph className='text-slate-600'>本規約はすべての利用者に適用されます。</Paragraph>
      <Heading3>1.1 補足</Heading3>
      <Paragraph>細則については別途定めます。</Paragraph>
    </article>
  ),
  play: async ({ canvas }) => {
    // 各見出しレベルが適切なロールでレンダリングされることを確認
    await expect(canvas.getByRole('heading', { level: 1, name: '利用規約' })).toBeInTheDocument()
    await expect(canvas.getByRole('heading', { level: 2, name: '第1条 適用' })).toBeInTheDocument()
    await expect(canvas.getByRole('heading', { level: 3, name: '1.1 補足' })).toBeInTheDocument()

    // 段落テキストが表示されることを確認
    await expect(
      canvas.getByText('本規約は、サービスの利用条件を定めるものです。'),
    ).toBeInTheDocument()
  },
}

export const ParagraphWithClassName: Story = {
  render: () => <Paragraph className='text-red-500'>注意書きの段落です。</Paragraph>,
  play: async ({ canvas }) => {
    // className が既定クラスとマージされて適用されることを確認
    const paragraph = canvas.getByText('注意書きの段落です。')
    await expect(paragraph).toHaveClass('text-red-500')
    await expect(paragraph).toHaveClass('mb-6', 'leading-relaxed')
  },
}

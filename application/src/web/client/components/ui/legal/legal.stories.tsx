import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Heading1, Heading2, Heading3, Paragraph } from './index'

const meta: Meta = {
  title: 'ui/legal',
}
export default meta

type Story = StoryObj

export const Headings: Story = {
  render: () => (
    <>
      <Heading1>大見出し</Heading1>
      <Heading2>中見出し</Heading2>
      <Heading3>小見出し</Heading3>
    </>
  ),
  play: async ({ canvas }) => {
    // Heading1/2/3 がそれぞれ見出しレベル 1/2/3 の要素として描画される
    await expect(canvas.getByRole('heading', { level: 1, name: '大見出し' })).toBeInTheDocument()
    await expect(canvas.getByRole('heading', { level: 2, name: '中見出し' })).toBeInTheDocument()
    await expect(canvas.getByRole('heading', { level: 3, name: '小見出し' })).toBeInTheDocument()
  },
}

export const ParagraphElement: Story = {
  render: () => <Paragraph>段落テキスト</Paragraph>,
  play: async ({ canvas }) => {
    // Paragraph は子要素を p 要素として描画する
    await expect(canvas.getByText('段落テキスト').tagName).toBe('P')
  },
}

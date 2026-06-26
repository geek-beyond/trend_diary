import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ClipText } from './index'

const meta: Meta<typeof ClipText> = {
  component: ClipText,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    text: {
      control: 'text',
      description: '表示するテキスト',
    },
    className: {
      control: 'text',
      description: '追加のCSSクラス',
    },
  },
}
export default meta

type Story = StoryObj<typeof ClipText>

export const Default: Story = {
  args: {
    text: '効率的に追跡',
  },
  play: async ({ canvas }) => {
    // テキストが正しく表示されることを確認
    await expect(canvas.getByText('効率的に追跡')).toBeInTheDocument()

    // span要素が存在することを確認
    const span = canvas.getByText('効率的に追跡')
    await expect(span.tagName).toBe('SPAN')

    // グラデーションクラスが適用されていることを確認
    await expect(span).toHaveClass('bg-gradient-to-r')
    await expect(span).toHaveClass('from-blue-600')
    await expect(span).toHaveClass('to-purple-600')
    await expect(span).toHaveClass('bg-clip-text')
    await expect(span).toHaveClass('text-transparent')
    await expect(span).toHaveClass('block')
  },
}

export const CustomClassName: Story = {
  args: {
    text: 'カスタムスタイル',
    className: 'text-4xl font-bold',
  },
  play: async ({ canvas }) => {
    const span = canvas.getByText('カスタムスタイル')

    // テキストが正しく表示されることを確認
    await expect(span).toBeInTheDocument()

    // 基本のグラデーションクラスが適用されていることを確認
    await expect(span).toHaveClass('bg-gradient-to-r')
    await expect(span).toHaveClass('from-blue-600')
    await expect(span).toHaveClass('to-purple-600')
    await expect(span).toHaveClass('bg-clip-text')
    await expect(span).toHaveClass('text-transparent')

    // カスタムクラスが適用されていることを確認
    await expect(span).toHaveClass('text-4xl')
    await expect(span).toHaveClass('font-bold')
  },
}

export const LongText: Story = {
  args: {
    text: '技術トレンドを効率的に追跡して、最新の情報をキャッチアップしよう',
  },
  play: async ({ canvas }) => {
    const span = canvas.getByText(
      '技術トレンドを効率的に追跡して、最新の情報をキャッチアップしよう',
    )

    // 長いテキストが正しく表示されることを確認
    await expect(span).toBeInTheDocument()

    // グラデーションクラスが適用されていることを確認
    await expect(span).toHaveClass('bg-gradient-to-r')
    await expect(span).toHaveClass('from-blue-600')
    await expect(span).toHaveClass('to-purple-600')
    await expect(span).toHaveClass('bg-clip-text')
    await expect(span).toHaveClass('text-transparent')
  },
}

export const ShortText: Story = {
  args: {
    text: 'AI',
  },
  play: async ({ canvas }) => {
    const span = canvas.getByText('AI')

    // 短いテキストが正しく表示されることを確認
    await expect(span).toBeInTheDocument()

    // グラデーションクラスが適用されていることを確認
    await expect(span).toHaveClass('bg-gradient-to-r')
    await expect(span).toHaveClass('from-blue-600')
    await expect(span).toHaveClass('to-purple-600')
    await expect(span).toHaveClass('bg-clip-text')
    await expect(span).toHaveClass('text-transparent')
  },
}

export const EmptyText: Story = {
  args: {
    text: '',
  },
  play: async ({ canvas }) => {
    // 空文字列でもspan要素が存在することを確認
    const span = canvas.getByRole('generic')
    await expect(span).toBeInTheDocument()

    // グラデーションクラスが適用されていることを確認
    await expect(span).toHaveClass('bg-gradient-to-r')
    await expect(span).toHaveClass('from-blue-600')
    await expect(span).toHaveClass('to-purple-600')
    await expect(span).toHaveClass('bg-clip-text')
    await expect(span).toHaveClass('text-transparent')
  },
}

export const SpecialCharacters: Story = {
  args: {
    text: '日本語・English・数字123・記号!@#$%',
  },
  play: async ({ canvas }) => {
    const span = canvas.getByText('日本語・English・数字123・記号!@#$%')

    // 特殊文字を含むテキストが正しく表示されることを確認
    await expect(span).toBeInTheDocument()

    // グラデーションクラスが適用されていることを確認
    await expect(span).toHaveClass('bg-gradient-to-r')
    await expect(span).toHaveClass('from-blue-600')
    await expect(span).toHaveClass('to-purple-600')
    await expect(span).toHaveClass('bg-clip-text')
    await expect(span).toHaveClass('text-transparent')
  },
}

export const WithCustomGradient: Story = {
  args: {
    text: 'カスタムグラデーション',
    className: 'bg-gradient-to-r from-green-400 to-blue-500',
  },
  play: async ({ canvas }) => {
    const span = canvas.getByText('カスタムグラデーション')

    // テキストが正しく表示されることを確認
    await expect(span).toBeInTheDocument()

    // tailwind-mergeによりカスタムグラデーションが適用されることを確認
    // （後から渡されたクラスが優先される）
    await expect(span).toHaveClass('from-green-400')
    await expect(span).toHaveClass('to-blue-500')
    await expect(span).toHaveClass('bg-clip-text')
    await expect(span).toHaveClass('text-transparent')
  },
}

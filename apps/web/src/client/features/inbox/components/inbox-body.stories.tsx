import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import type { Article } from '../hooks/use-unread-digestion'
import InboxBody from './inbox-body'

const article: Article = {
  articleId: '1',
  media: 'qiita',
  title: '未読記事タイトル',
  author: 'テスト著者',
  description: 'テストの説明文です',
  url: 'https://example.com',
  ogImageUrl: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

const meta: Meta<typeof InboxBody> = {
  component: InboxBody,
  parameters: {
    layout: 'centered',
  },
  args: {
    onSkip: fn(),
    onRead: fn(),
    onLater: fn(),
  },
}
export default meta

type Story = StoryObj<typeof InboxBody>

// 記事がある場合は記事カードを表示する分岐
export const WithArticle: Story = {
  args: {
    article,
    isJustCompleted: false,
  },
  play: async ({ canvas, step }) => {
    await step('未読記事カードが表示されることを確認', async () => {
      await expect(canvas.getByText(article.title)).toBeInTheDocument()
      await expect(canvas.getByRole('button', { name: '読む' })).toBeInTheDocument()
    })
  },
}

// 記事が無く、消化完了直後は完了カードを表示する分岐
export const JustCompleted: Story = {
  args: {
    article: null,
    isJustCompleted: true,
  },
  play: async ({ canvas, step }) => {
    await step('完了カードが表示され、トレンド一覧への導線があることを確認', async () => {
      await expect(canvas.getByText('消化完了')).toBeInTheDocument()
      await expect(canvas.getByRole('link', { name: 'トレンド一覧へ' })).toBeInTheDocument()
    })
  },
}

// 記事が無く、完了直後でもない場合は空メッセージを表示する分岐
export const Empty: Story = {
  args: {
    article: null,
    isJustCompleted: false,
  },
  play: async ({ canvas, step }) => {
    await step('未読なしメッセージとトレンド一覧への導線が表示されることを確認', async () => {
      await expect(canvas.getByText('未読記事はありません')).toBeInTheDocument()
      await expect(canvas.getByRole('link', { name: 'トレンド一覧へ' })).toBeInTheDocument()
    })
  },
}

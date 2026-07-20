import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import type { Article } from '../hooks/use-unread-digestion'
import InboxArticleCard from './inbox-article-card'

const defaultArticle: Article = {
  articleId: '1',
  media: 'qiita',
  title: 'デフォルトタイトル',
  author: 'デフォルト著者',
  description: 'デフォルトの説明文です',
  url: 'https://example.com',
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

const generateArticle = (params?: Partial<Article>): Article => ({
  ...defaultArticle,
  ...params,
})

const meta: Meta<typeof InboxArticleCard> = {
  component: InboxArticleCard,
  parameters: {
    layout: 'centered',
  },
  args: {
    article: defaultArticle,
    onSkip: fn(),
    onRead: fn(),
    onLater: fn(),
  },
}
export default meta

type Story = StoryObj<typeof InboxArticleCard>

export const Default: Story = {
  play: async ({ canvas, step }) => {
    await step('タイトル・著者・説明が表示されることを確認', async () => {
      await expect(canvas.getByText(defaultArticle.title)).toBeInTheDocument()
      await expect(canvas.getByText(`著者: ${defaultArticle.author}`)).toBeInTheDocument()
      await expect(canvas.getByText(defaultArticle.description)).toBeInTheDocument()
    })

    await step('操作ボタンが3つ表示されることを確認', async () => {
      await expect(canvas.getByRole('button', { name: 'スキップ' })).toBeInTheDocument()
      await expect(canvas.getByRole('button', { name: '読む' })).toBeInTheDocument()
      await expect(canvas.getByRole('button', { name: '後で' })).toBeInTheDocument()
    })
  },
}

export const ZennArticle: Story = {
  args: {
    article: generateArticle({ media: 'zenn' }),
  },
  play: async ({ canvas, step }) => {
    await step('Zennメディアアイコンが表示されることを確認', async () => {
      const mediaIcon = canvas.getByRole('img')
      await expect(mediaIcon).toHaveAttribute('src', '/images/zenn-icon.svg')
    })
  },
}

export const SkipInteraction: Story = {
  play: async ({ canvas, args, step }) => {
    await step('スキップボタンクリックで onSkip が呼ばれることを確認', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'スキップ' }))
      await expect(args.onSkip).toHaveBeenCalledTimes(1)
    })
  },
}

export const ReadInteraction: Story = {
  play: async ({ canvas, args, step }) => {
    await step('読むボタンクリックで onRead が呼ばれることを確認', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '読む' }))
      await expect(args.onRead).toHaveBeenCalledTimes(1)
    })
  },
}

export const LaterInteraction: Story = {
  play: async ({ canvas, args, step }) => {
    await step('後でボタンクリックで onLater が呼ばれることを確認', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '後で' }))
      await expect(args.onLater).toHaveBeenCalledTimes(1)
    })
  },
}

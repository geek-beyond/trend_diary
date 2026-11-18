import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import PageCard from '@/client/components/ui/layout/page-card'
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

const longUrl = `https://example.com/${'a'.repeat(240)}`

export const HatenaRss: Story = {
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className='w-full max-w-80' data-testid='inbox-viewport'>
        <PageCard title='未読消化'>
          <fieldset className='min-w-0'>
            <Story />
          </fieldset>
        </PageCard>
      </div>
    ),
  ],
  args: {
    article: generateArticle({
      media: 'hatena',
      title: '長いタイトル'.repeat(10) + 'X'.repeat(240),
      author: 'はてなブックマーク',
      description: `<blockquote><p>記事の概要 &amp; 詳細</p><a href="${longUrl}">${longUrl}</a><img src="/rss-image.png"><script>非表示</script></blockquote>`,
      url: longUrl,
    }),
  },
  play: async ({ canvas }) => {
    const viewport = await canvas.findByTestId('inbox-viewport')
    const page = canvas.getByRole('main')
    const heading = canvas.getByRole('heading', { level: 2 })
    const card = heading.parentElement!
    const description = card.querySelector('p')!

    const widths = [
      viewport,
      page,
      page.firstElementChild!,
      page.querySelector('fieldset')!,
      card,
      heading,
      heading.lastElementChild!,
      description,
    ].map((element) => ({
      element: element.tagName,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      minWidth: getComputedStyle(element).minWidth,
      overflowWrap: getComputedStyle(element).overflowWrap,
    }))
    await expect(
      widths.filter(({ scrollWidth, clientWidth }) => scrollWidth > clientWidth),
    ).toEqual([])
    await expect(description.childElementCount).toBe(0)
    await expect(description.textContent).toBe(`記事の概要 & 詳細\n${longUrl}`)
  },
}

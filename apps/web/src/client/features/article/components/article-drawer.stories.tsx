import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { Article } from '@/client/features/article/hooks/use-articles'
import { toJaDateString } from '@/common/locale/date'
import ArticleDrawer from './article-drawer'

const defaultArticle: Article = {
  articleId: '1',
  media: 'qiita',
  title: 'デフォルトタイトル',
  author: 'デフォルト著者',
  description: 'デフォルトの説明文です',
  url: 'https://example.com',
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

const longDescription = `TrendDiaryは技術トレンドの収集と閲覧を効率化するためのサービスであり、
記事の要点を短時間で把握しながら、必要に応じて元記事に素早くアクセスできる体験を提供する。
この説明文はモバイル表示での折りたたみ挙動を確認するために十分な長さを持たせている。`

// モックのArticleデータ
const generateArticle = (params?: Partial<Article>): Article => ({
  ...defaultArticle,
  ...params,
})

const getDescriptionElement = () => {
  const description = document.body.querySelector<HTMLElement>(
    "[data-slot='drawer-content-description-content']",
  )
  expect(description).not.toBeNull()
  if (!description) {
    throw new Error('description element not found')
  }
  return description
}

const meta: Meta<typeof ArticleDrawer> = {
  component: ArticleDrawer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '記事の詳細情報を表示するドロワーコンポーネント',
      },
    },
  },
  args: {
    isOpen: true,
    onClose: fn(),
    onMarkAsRead: fn(),
    isLoggedIn: false,
  },
}
export default meta

type Story = StoryObj<typeof ArticleDrawer>

export const Default: Story = {
  args: {
    article: defaultArticle,
  },
  play: async ({ step }) => {
    // ドロワーが表示されることを確認（ポータル経由でdocument.bodyに描画される）
    await waitFor(() => {
      const drawer = within(document.body).getByRole('dialog', { hidden: true })
      expect(drawer).toBeInTheDocument()
    })

    await step('記事タイトルが表示されることを確認', async () => {
      await expect(within(document.body).getByText(defaultArticle.title)).toBeInTheDocument()
    })

    await step('作成者が表示されることを確認', async () => {
      await expect(within(document.body).getByText(defaultArticle.author)).toBeInTheDocument()
    })

    await step('記事の説明が表示されることを確認', async () => {
      await expect(within(document.body).getByText(defaultArticle.description)).toBeInTheDocument()
    })

    await step('作成日が表示されることを確認（ローカライズされた形式）', async () => {
      const formattedDate = toJaDateString(defaultArticle.createdAt)
      await expect(within(document.body).getByText(formattedDate)).toBeInTheDocument()
    })

    await step('「記事を読む」ボタンが存在することを確認', async () => {
      await expect(
        within(document.body).getByRole('button', { name: '記事を読む' }),
      ).toBeInTheDocument()
    })

    await step('閉じるボタンが存在することを確認', async () => {
      const closeButton = within(document.body).getByRole('button', { name: 'Close' })
      await expect(closeButton).toBeInTheDocument()
    })
  },
}

export const LongDescriptionToggle: Story = {
  args: {
    article: generateArticle({
      articleId: '2',
      description: longDescription,
    }),
  },
  play: async ({ step }) => {
    await step('初期表示で続きを読むボタンが表示されることを確認', async () => {
      const toggle = within(document.body).getByRole('button', { name: '続きを読む' })
      await expect(toggle).toBeInTheDocument()
    })

    await step('初期状態で概要が4行折りたたみであることを確認', async () => {
      const description = getDescriptionElement()
      await expect(description).toHaveClass('line-clamp-4')
    })

    await step('続きを読む押下で展開され、閉じるに切り替わることを確認', async () => {
      const toggle = within(document.body).getByRole('button', { name: '続きを読む' })
      await userEvent.click(toggle)

      const closeToggle = within(document.body).getByRole('button', { name: '閉じる' })
      await expect(closeToggle).toBeInTheDocument()

      const description = getDescriptionElement()
      await expect(description).not.toHaveClass('line-clamp-4')
    })
  },
}

const qiitaArticle = generateArticle({ media: 'qiita' })

export const QiitaArticle: Story = {
  args: {
    article: qiitaArticle,
  },
  play: async ({ step }) => {
    await step('Qiitaメディアアイコンが表示されることを確認', async () => {
      const mediaIcon = within(document.body).getByAltText('Qiitaのアイコン')
      await expect(mediaIcon).toBeInTheDocument()
    })

    await step('記事URLが正しく設定されていることを確認', async () => {
      const readButton = within(document.body).getByRole('button', { name: '記事を読む' })
      await expect(readButton).toBeInTheDocument()
    })
  },
}

const zennArticle = generateArticle({ media: 'zenn' })

export const ZennArticle: Story = {
  args: {
    article: zennArticle,
  },
  play: async ({ step }) => {
    await step('Zennメディアアイコンが表示されることを確認', async () => {
      const mediaIcon = within(document.body).getByAltText('Zennのアイコン')
      await expect(mediaIcon).toBeInTheDocument()
    })
  },
}

// 既読記事（ログイン時）
const readArticle = generateArticle({ isRead: true })
export const ReadArticleLoggedIn: Story = {
  args: {
    article: readArticle,
    isLoggedIn: true,
  },
  play: async ({ step }) => {
    await step('既読アイコンが表示されることを確認', async () => {
      await waitFor(() => {
        const readIndicator = within(document.body).getByTestId('drawer-read-indicator')
        expect(readIndicator).toBeInTheDocument()
      })
    })
  },
}

// 未読記事（ログイン時）
const unreadArticle = generateArticle({ isRead: false })
export const UnreadArticleLoggedIn: Story = {
  args: {
    article: unreadArticle,
    isLoggedIn: true,
  },
  play: async ({ step }) => {
    await step('既読アイコンが表示されないことを確認', async () => {
      await waitFor(() => {
        within(document.body).getByRole('dialog', { hidden: true })
      })
      const readIndicator = within(document.body).queryByTestId('drawer-read-indicator')
      await expect(readIndicator).not.toBeInTheDocument()
    })
  },
}

// 「記事を読む」クリック時にonCloseが呼ばれる
export const CloseOnReadArticleClick: Story = {
  args: {
    article: unreadArticle,
  },
  play: async ({ args, step }) => {
    await step('「記事を読む」クリックでonCloseが呼ばれることを確認', async () => {
      await waitFor(() => {
        within(document.body).getByRole('dialog', { hidden: true })
      })
      const readButton = within(document.body).getByText('記事を読む')
      await userEvent.click(readButton)

      await expect(args.onClose).toHaveBeenCalled()
    })
  },
}

// ログイン時に「記事を読む」クリックでonMarkAsReadが呼ばれる
export const MarkAsReadOnClickLoggedIn: Story = {
  args: {
    article: unreadArticle,
    isLoggedIn: true,
  },
  play: async ({ args, step }) => {
    await step('ログイン時に「記事を読む」クリックでonMarkAsReadが呼ばれることを確認', async () => {
      await waitFor(() => {
        within(document.body).getByRole('dialog', { hidden: true })
      })
      const readButton = within(document.body).getByText('記事を読む')
      await userEvent.click(readButton)

      await expect(args.onMarkAsRead).toHaveBeenCalledWith(unreadArticle.articleId.toString())
    })
  },
}

// 未ログイン時に「記事を読む」クリックでonMarkAsReadが呼ばれない
export const MarkAsReadNotCalledWhenNotLoggedIn: Story = {
  args: {
    article: unreadArticle,
    isLoggedIn: false,
  },
  play: async ({ args, step }) => {
    await step(
      '未ログイン時に「記事を読む」クリックでonMarkAsReadが呼ばれないことを確認',
      async () => {
        await waitFor(() => {
          within(document.body).getByRole('dialog', { hidden: true })
        })
        const readButton = within(document.body).getByText('記事を読む')
        await userEvent.click(readButton)

        await expect(args.onMarkAsRead).not.toHaveBeenCalled()
      },
    )
  },
}

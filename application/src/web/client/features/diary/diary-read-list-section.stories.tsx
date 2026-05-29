import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import DiaryReadListSection from './diary-read-list-section'
import type { ReadItem } from './types'

const reads: ReadItem[] = [
  {
    readHistoryId: 'r1',
    articleId: 'a1',
    media: 'qiita',
    title: '安全なURLの記事',
    url: 'https://example.com/article-1',
    readAt: new Date('2026-05-29T10:30:00+09:00'),
  },
  {
    readHistoryId: 'r2',
    articleId: 'a2',
    media: 'zenn',
    title: '不正なURLの記事',
    url: 'javascript:alert(1)',
    readAt: new Date('2026-05-29T12:00:00+09:00'),
  },
]

const meta: Meta<typeof DiaryReadListSection> = {
  component: DiaryReadListSection,
  args: {
    isLoading: false,
    shouldShowDailyDetails: true,
    reads,
  },
}
export default meta

type Story = StoryObj<typeof DiaryReadListSection>

export const WithReads: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('読了した記事一覧')).toBeInTheDocument()

    const safeLink = canvas.getByRole('link', { name: '安全なURLの記事' })
    await expect(safeLink).toHaveAttribute('href', 'https://example.com/article-1')

    // 不正なURLはリンク化せずテキストにフォールバックする
    await expect(canvas.queryByRole('link', { name: '不正なURLの記事' })).not.toBeInTheDocument()
    await expect(canvas.getByText('不正なURLの記事')).toBeInTheDocument()
  },
}

export const Loading: Story = {
  args: {
    isLoading: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('読み込み中...')).toBeInTheDocument()
  },
}

export const Empty: Story = {
  args: {
    reads: [],
    emptyState: <p>読了した記事はありません。</p>,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('読了した記事はありません。')).toBeInTheDocument()
  },
}

export const NoDailyDetails: Story = {
  args: {
    shouldShowDailyDetails: false,
    emptyState: <p>対象日が選択されていません。</p>,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('対象日が選択されていません。')).toBeInTheDocument()
  },
}

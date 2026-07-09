import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import type { ReadItem } from '@/client/features/diary/model/types'
import DiaryReadListSection from './read-list-section'

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

    // 安全なURLの記事は操作可能なリンクとして提示される
    await expect(canvas.getByRole('link', { name: '安全なURLの記事' })).toBeInTheDocument()

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
    await expect(canvas.getByRole('status', { name: '読み込み中' })).toBeInTheDocument()
  },
}

export const Empty: Story = {
  args: {
    reads: [],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('読了した記事はまだありません。')).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: 'トレンド一覧へ' })).toBeInTheDocument()
  },
}

export const NoDailyDetails: Story = {
  args: {
    shouldShowDailyDetails: false,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('グラフの日付をクリックすると、読了記事一覧を表示します。'),
    ).toBeInTheDocument()
  },
}

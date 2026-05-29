import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import DiaryPageLayout from './diary-page-layout'

const meta: Meta<typeof DiaryPageLayout> = {
  component: DiaryPageLayout,
  args: {
    pageTitle: 'ダイアリー',
    dateResolveError: false,
    children: <p>本文コンテンツ</p>,
  },
}
export default meta

type Story = StoryObj<typeof DiaryPageLayout>

export const Default: Story = {
  play: async ({ canvas }) => {
    // ページタイトルと子要素が表示されることを確認
    await expect(canvas.getByRole('heading', { name: 'ダイアリー' })).toBeInTheDocument()
    await expect(canvas.getByText('本文コンテンツ')).toBeInTheDocument()

    // エラーが無い場合はエラーメッセージが表示されないことを確認
    await expect(canvas.queryByText(/JST日付の解決に失敗した/)).not.toBeInTheDocument()
  },
}

export const DateResolveError: Story = {
  args: {
    dateResolveError: true,
  },
  play: async ({ canvas }) => {
    // 日付解決エラー時にエラーメッセージが表示されることを確認
    await expect(canvas.getByText(/JST日付の解決に失敗した/)).toBeInTheDocument()

    // エラー時でも子要素は引き続き表示されることを確認
    await expect(canvas.getByText('本文コンテンツ')).toBeInTheDocument()
  },
}

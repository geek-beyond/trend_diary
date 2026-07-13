import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import DiaryPageLayout from './page-layout'

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
    await expect(canvas.getByRole('heading', { name: 'ダイアリー' })).toBeInTheDocument()
    await expect(canvas.getByText('本文コンテンツ')).toBeInTheDocument()
    await expect(canvas.queryByText(/JST日付の解決に失敗しました/)).not.toBeInTheDocument()
  },
}

export const DateResolveError: Story = {
  args: {
    dateResolveError: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/JST日付の解決に失敗しました/)).toBeInTheDocument()
    await expect(canvas.getByText('本文コンテンツ')).toBeInTheDocument()
  },
}

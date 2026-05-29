import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import DiaryReadPagination from './diary-read-pagination'

const meta: Meta<typeof DiaryReadPagination> = {
  component: DiaryReadPagination,
  args: {
    onNextPage: fn(),
    onPrevPage: fn(),
    shouldShowDailyDetails: true,
    readPagination: {
      page: 2,
      totalPages: 5,
      hasNext: true,
      hasPrev: true,
    },
  },
}
export default meta

type Story = StoryObj<typeof DiaryReadPagination>

export const Default: Story = {
  play: async ({ canvas, args }) => {
    // ページ番号ラベルが表示されることを確認
    await expect(canvas.getByText('2 / 5')).toBeInTheDocument()

    // 前へ・次へボタンが有効でクリックハンドラが呼ばれることを確認
    const prev = canvas.getByRole('button', { name: '前へ' })
    const next = canvas.getByRole('button', { name: '次へ' })
    await expect(prev).toBeEnabled()
    await expect(next).toBeEnabled()

    await userEvent.click(prev)
    await expect(args.onPrevPage).toHaveBeenCalled()

    await userEvent.click(next)
    await expect(args.onNextPage).toHaveBeenCalled()
  },
}

export const FirstPage: Story = {
  args: {
    readPagination: {
      page: 1,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    },
  },
  play: async ({ canvas }) => {
    // 最初のページでは前へボタンが無効化されることを確認
    await expect(canvas.getByRole('button', { name: '前へ' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: '次へ' })).toBeEnabled()
  },
}

export const NoDailyDetails: Story = {
  args: {
    shouldShowDailyDetails: false,
    readPagination: {
      page: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
  },
  play: async ({ canvas }) => {
    // 日次詳細が無い場合はプレースホルダーラベルが表示され、両ボタンが無効化されることを確認
    await expect(canvas.getByText('- / -')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: '前へ' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: '次へ' })).toBeDisabled()
  },
}

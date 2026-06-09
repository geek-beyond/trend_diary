import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import DiaryReadPagination from './read-pagination'

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
    await expect(canvas.getByText('2 / 5')).toBeInTheDocument()

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
    await expect(canvas.getByText('- / -')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: '前へ' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: '次へ' })).toBeDisabled()
  },
}

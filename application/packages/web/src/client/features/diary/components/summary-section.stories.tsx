import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import type { Source } from '@/client/features/diary/model/types'
import DiarySummarySection from './summary-section'

const sources: Source[] = [
  { media: 'qiita', read: 3, skip: 1 },
  { media: 'zenn', read: 2, skip: 0 },
  { media: 'hatena', read: 1, skip: 2 },
]

const meta: Meta<typeof DiarySummarySection> = {
  component: DiarySummarySection,
  args: {
    sources,
    displaySummary: { read: 6, skip: 3 },
  },
}
export default meta

type Story = StoryObj<typeof DiarySummarySection>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('集計')).toBeInTheDocument()
    await expect(canvas.getByText('Qiita')).toBeInTheDocument()
    await expect(canvas.getByText('Zenn')).toBeInTheDocument()
    await expect(canvas.getByText('はてブ')).toBeInTheDocument()
    await expect(canvas.getByText('合計')).toBeInTheDocument()
    await expect(canvas.getByText('6件')).toBeInTheDocument()
  },
}

export const WithTargetDate: Story = {
  args: {
    targetDate: '2026-05-29',
  },
  play: async ({ canvas }) => {
    const targetDate = canvas.getByText(/対象日:/)
    await expect(targetDate).toBeInTheDocument()
  },
}

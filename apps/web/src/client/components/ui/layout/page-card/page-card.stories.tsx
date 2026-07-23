import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import PageCard from './index'

const meta: Meta<typeof PageCard> = {
  component: PageCard,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    title: 'ページタイトル',
    children: <p>本文コンテンツ</p>,
  },
}
export default meta

type Story = StoryObj<typeof PageCard>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'ページタイトル' })).toBeInTheDocument()
    await expect(canvas.getByText('本文コンテンツ')).toBeInTheDocument()
  },
}

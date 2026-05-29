import type { Meta, StoryObj } from '@storybook/react-vite'
import { Inbox, TrendingUp } from 'lucide-react'
import { expect } from 'storybook/test'
import { Sheet } from '../../shadcn/sheet'
import { SidebarProvider } from '../../shadcn/sidebar'
import type { MenuItem } from '../sidebar'
import NavMenu from './index'

const menuItems: MenuItem[] = [
  { title: 'トレンド記事', url: '/trends', icon: TrendingUp },
  { title: '未読消化', url: '/inbox', icon: Inbox },
]

const meta: Meta<typeof NavMenu> = {
  component: NavMenu,
  args: {
    menuItems,
  },
}
export default meta

type Story = StoryObj<typeof NavMenu>

export const SidebarVariant: Story = {
  args: {
    variant: 'sidebar',
  },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <Story />
      </SidebarProvider>
    ),
  ],
  play: async ({ canvas }) => {
    const trendsLink = canvas.getByRole('link', { name: 'トレンド記事' })
    await expect(trendsLink).toHaveAttribute('href', '/trends')

    const inboxLink = canvas.getByRole('link', { name: '未読消化' })
    await expect(inboxLink).toHaveAttribute('href', '/inbox')
  },
}

export const SheetVariant: Story = {
  args: {
    variant: 'sheet',
  },
  decorators: [
    // SheetClose は Dialog のコンテキストを必要とするため Sheet(Root) でラップする。
    // SheetContent は使わず、ポータルを避けて canvas 内に直接レンダリングする。
    (Story) => (
      <Sheet open={true}>
        <Story />
      </Sheet>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Application')).toBeInTheDocument()

    const trendsLink = canvas.getByRole('link', { name: 'トレンド記事' })
    await expect(trendsLink).toHaveAttribute('href', '/trends')
    await expect(trendsLink).toHaveClass('hover:bg-gray-100')
  },
}

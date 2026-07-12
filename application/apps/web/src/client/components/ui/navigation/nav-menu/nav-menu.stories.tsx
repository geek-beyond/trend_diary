import type { Meta, StoryObj } from '@storybook/react-vite'
import { Inbox, TrendingUp } from 'lucide-react'
import { expect } from 'storybook/test'
import { Sheet } from '@/client/components/shadcn/sheet'
import { SidebarProvider } from '@/client/components/shadcn/sidebar'
import type { MenuItem } from '@/client/entities/navigation'
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
    // sidebar バリアントで各メニュー項目が操作可能なリンクとして提示される
    await expect(canvas.getByRole('link', { name: 'トレンド記事' })).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: '未読消化' })).toBeInTheDocument()
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
    // sheet バリアントでも見出しと操作可能なメニューリンクが提示される
    await expect(canvas.getByText('Application')).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: 'トレンド記事' })).toBeInTheDocument()
  },
}

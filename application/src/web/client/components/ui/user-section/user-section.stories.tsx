import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { SidebarProvider } from '../../shadcn/sidebar'
import UserSection from './index'

const meta: Meta<typeof UserSection> = {
  component: UserSection,
  args: {
    onLogout: fn(),
    isLoading: false,
  },
}
export default meta

type Story = StoryObj<typeof UserSection>

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
  play: async ({ canvas, args }) => {
    // ログアウトボタンが表示され、クリックで onLogout が呼ばれることを確認
    const button = canvas.getByText('ログアウト')
    await expect(button).toBeInTheDocument()

    await userEvent.click(button)
    await expect(args.onLogout).toHaveBeenCalled()
  },
}

export const SheetVariant: Story = {
  args: {
    variant: 'sheet',
  },
  play: async ({ canvas, args }) => {
    // sheet バリアントでもログアウトボタンが動作することを確認
    const button = canvas.getByRole('button', { name: 'ログアウト' })
    await expect(button).toBeInTheDocument()

    await userEvent.click(button)
    await expect(args.onLogout).toHaveBeenCalled()
  },
}

export const Loading: Story = {
  args: {
    variant: 'sheet',
    isLoading: true,
  },
  play: async ({ canvas }) => {
    // ローディング中はラベルが変化し、ボタンが無効化されることを確認
    const button = canvas.getByRole('button', { name: 'ログアウト中...' })
    await expect(button).toBeDisabled()
  },
}

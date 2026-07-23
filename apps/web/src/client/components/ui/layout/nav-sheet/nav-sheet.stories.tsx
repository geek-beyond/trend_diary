import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { vi } from 'vitest'
import NavSheet from './index'

vi.mock('@/client/features/logout/use-logout', () => ({
  default: vi.fn(() => ({
    handleLogout: vi.fn(),
    isLoading: false,
  })),
}))

const meta: Meta<typeof NavSheet> = {
  component: NavSheet,
  parameters: {
    layout: 'centered',
  },
}
export default meta

type Story = StoryObj<typeof NavSheet>

export const LoggedOut: Story = {
  args: {
    isLoggedIn: false,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'メニューを開く' })).toBeInTheDocument()
  },
}

export const LoggedIn: Story = {
  args: {
    isLoggedIn: true,
  },
  play: async ({ canvas }) => {
    // ログイン分岐を通し、メニュー項目生成・LogoutButton 生成のコードを網羅する
    await expect(canvas.getByRole('button', { name: 'メニューを開く' })).toBeInTheDocument()
  },
}

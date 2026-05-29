import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { vi } from 'vitest'
import AppHeader from './index'

// useSidebar フックをモックし、ログアウト処理の副作用（ログアウトAPI呼び出し）を無効化する
vi.mock('../sidebar/use-sidebar', () => ({
  default: vi.fn(() => ({
    handleLogout: vi.fn(),
    isLoading: false,
  })),
}))

const meta: Meta<typeof AppHeader> = {
  component: AppHeader,
  parameters: {
    layout: 'fullscreen',
  },
}
export default meta

type Story = StoryObj<typeof AppHeader>

// AppHeader は `md:hidden` のモバイル専用ヘッダーで、デスクトップ幅の
// テスト環境では `display: none` となりアクセシビリティツリーから除外される。
// そのため role 取得時は `hidden: true` を指定して非表示要素も対象に含める。

export const LoggedOut: Story = {
  args: {
    isLoggedIn: false,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('banner', { hidden: true })).toBeInTheDocument()
    await expect(canvas.getByText('TrendDiary')).toBeInTheDocument()

    const homeLink = canvas
      .getAllByRole('link', { hidden: true })
      .find((link) => link.getAttribute('href') === '/')
    await expect(homeLink).toBeInTheDocument()

    await expect(
      canvas.getByRole('button', { name: 'メニューを開く', hidden: true }),
    ).toBeInTheDocument()
  },
}

export const LoggedIn: Story = {
  args: {
    isLoggedIn: true,
  },
  play: async ({ canvas }) => {
    // ログイン分岐を通すことでメニュー項目生成・UserSection 生成のコードを網羅する
    await expect(canvas.getByRole('banner', { hidden: true })).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: 'メニューを開く', hidden: true }),
    ).toBeInTheDocument()
  },
}

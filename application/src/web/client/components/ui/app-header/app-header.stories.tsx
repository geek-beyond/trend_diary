import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { vi } from 'vitest'
import useSidebar from '../sidebar/use-sidebar'
import AppHeader from './index'

// useSidebar フックをモックし、ログアウト処理の副作用を無効化する
vi.mock('../sidebar/use-sidebar', () => ({
  default: vi.fn(() => ({
    handleLogout: vi.fn(),
    isLoading: false,
  })),
}))

const setDefaultMock = () => {
  vi.mocked(useSidebar).mockReturnValue({
    handleLogout: vi.fn(),
    isLoading: false,
  })
}

const meta: Meta<typeof AppHeader> = {
  component: AppHeader,
  parameters: {
    layout: 'fullscreen',
  },
  beforeEach: setDefaultMock,
}
export default meta

type Story = StoryObj<typeof AppHeader>

export const Default: Story = {
  args: {
    isLoggedIn: false,
  },
  play: async ({ canvas }) => {
    // ヘッダーとサイトタイトルが表示されることを確認
    const header = canvas.getByRole('banner')
    await expect(header).toBeInTheDocument()
    await expect(canvas.getByText('TrendDiary')).toBeInTheDocument()

    // TOPページへのリンクが存在することを確認
    const homeLink = canvas.getAllByRole('link').find((link) => link.getAttribute('href') === '/')
    await expect(homeLink).toBeInTheDocument()

    // メニューを開くボタンが存在することを確認
    await expect(canvas.getByRole('button', { name: 'メニューを開く' })).toBeInTheDocument()
  },
}

export const OpenMenuLoggedIn: Story = {
  args: {
    isLoggedIn: true,
  },
  play: async ({ canvas }) => {
    // メニューボタンをクリックして Sheet を開く
    const menuButton = canvas.getByRole('button', { name: 'メニューを開く' })
    await userEvent.click(menuButton)

    // Sheet はポータル経由で body に描画されるため document 全体から検索する
    const screen = within(document.body)

    await waitFor(async () => {
      await expect(screen.getByText('メニュー')).toBeInTheDocument()
    })

    // ログイン時のみ表示されるメニュー項目を確認
    await expect(screen.getByRole('link', { name: 'ダイアリー' })).toBeInTheDocument()

    // ログイン時はログアウトボタンが表示されることを確認
    await expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
  },
}

export const OpenMenuLoggedOut: Story = {
  args: {
    isLoggedIn: false,
  },
  play: async ({ canvas }) => {
    const menuButton = canvas.getByRole('button', { name: 'メニューを開く' })
    await userEvent.click(menuButton)

    const screen = within(document.body)

    await waitFor(async () => {
      await expect(screen.getByText('メニュー')).toBeInTheDocument()
    })

    // 未ログイン時はログアウトボタンが表示されないことを確認
    await expect(screen.queryByRole('button', { name: 'ログアウト' })).not.toBeInTheDocument()

    // 未ログイン時はトレンド記事メニューのみ表示されることを確認
    await expect(screen.getByRole('link', { name: 'トレンド記事' })).toBeInTheDocument()
    await expect(screen.queryByRole('link', { name: 'ダイアリー' })).not.toBeInTheDocument()
  },
}

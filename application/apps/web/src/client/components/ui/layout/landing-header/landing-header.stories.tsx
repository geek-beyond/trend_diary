import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { vi } from 'vitest'
import LandingHeader from './index'

vi.mock('@/client/features/logout/use-logout', () => ({
  default: vi.fn(() => ({
    handleLogout: vi.fn(),
    isLoading: false,
  })),
}))

const meta: Meta<typeof LandingHeader> = {
  component: LandingHeader,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isLoggedIn: false,
  },
}
export default meta

type Story = StoryObj<typeof LandingHeader>

export const LoggedOut: Story = {
  play: async ({ canvas }) => {
    // ヘッダー要素が存在することを確認
    const header = canvas.getByRole('banner')
    await expect(header).toBeInTheDocument()

    // サイトタイトルが表示されることを確認
    await expect(canvas.getByText('TrendDiary')).toBeInTheDocument()

    // ロゴアイコンが存在することを確認（TrendingUpアイコン）
    const logo = canvas.getByRole('heading', { level: 1 })
    await expect(logo).toBeInTheDocument()

    // 未ログイン時はログイン導線を表示する
    await expect(canvas.getByRole('link', { name: 'ログイン' })).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: 'アカウント作成' })).toBeInTheDocument()

    // 未ログイン時はメニューを表示しない
    await expect(canvas.queryByRole('button', { name: 'メニューを開く' })).not.toBeInTheDocument()

    // TOPページへのリンクが存在することを確認
    const homeLink = canvas.getAllByRole('link').find((link) => link.getAttribute('href') === '/')
    await expect(homeLink).toBeInTheDocument()
  },
}

export const LoggedIn: Story = {
  args: {
    isLoggedIn: true,
  },
  play: async ({ canvas }) => {
    // ログイン時はログイン/アカウント作成の導線を隠す
    await expect(canvas.queryByRole('link', { name: 'ログイン' })).not.toBeInTheDocument()
    await expect(canvas.queryByRole('link', { name: 'アカウント作成' })).not.toBeInTheDocument()

    // 一覧と同様のメニューを表示する
    await expect(canvas.getByRole('button', { name: 'メニューを開く' })).toBeInTheDocument()
  },
}

export const HoverInteraction: Story = {
  play: async ({ canvas }) => {
    // サイトロゴにホバーした時の動作を確認
    const homeLink = canvas.getAllByRole('link').find((link) => link.getAttribute('href') === '/')

    if (homeLink) {
      await userEvent.hover(homeLink)
      // ホバー効果が適用されることを確認（opacity変化）
      await expect(homeLink).toHaveClass('hover:opacity-80')
    }

    // ログインボタンにホバーした時の動作を確認
    const loginLink = canvas.getByRole('link', { name: 'ログイン' })
    await userEvent.hover(loginLink)
    await expect(loginLink).toHaveClass('hover:bg-accent')

    // アカウント作成ボタンにホバーした時の動作を確認
    const signupLink = canvas.getByRole('link', { name: 'アカウント作成' })
    await userEvent.hover(signupLink)
    await expect(signupLink).toHaveClass('hover:bg-blue-700')
  },
}

export const LinkValidation: Story = {
  play: async ({ canvas }) => {
    // リンクのhref属性が正しく設定されていることを確認
    const homeLink = canvas.getAllByRole('link').find((link) => link.getAttribute('href') === '/')
    await expect(homeLink).toHaveAttribute('href', '/')

    const loginLink = canvas.getByRole('link', { name: 'ログイン' })
    await expect(loginLink).toHaveAttribute('href', '/sessions')

    const signupLink = canvas.getByRole('link', { name: 'アカウント作成' })
    await expect(signupLink).toHaveAttribute('href', '/registrations')
  },
}

export const ResponsiveLayout: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  play: async ({ canvas }) => {
    // モバイル表示でも要素が正しく表示されることを確認
    await expect(canvas.getByText('TrendDiary')).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: 'ログイン' })).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: 'アカウント作成' })).toBeInTheDocument()

    // レスポンシブクラスが適用されていることを確認
    const container = canvas.getByRole('banner').querySelector('.max-w-7xl')
    await expect(container).toBeInTheDocument()
  },
}

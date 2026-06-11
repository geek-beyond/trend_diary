import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { vi } from 'vitest'
import { SidebarProvider } from '@/client/components/shadcn/sidebar'
import useLogout from '@/client/features/authenticate/hooks/use-logout'
import AppSidebar from './index'

// ログアウト処理は LogoutButton 内部の useLogout が担うため、ここをモックする
vi.mock('@/client/features/authenticate/hooks/use-logout', () => ({
  default: vi.fn(() => ({
    handleLogout: vi.fn(),
    isLoading: false,
  })),
}))

const setDefaultMock = () => {
  vi.mocked(useLogout).mockReturnValue({
    handleLogout: vi.fn(),
    isLoading: false,
  })
}

const meta: Meta<typeof AppSidebar> = {
  component: AppSidebar,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <div style={{ height: '100vh', width: '300px' }}>
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof AppSidebar>

export const Default: Story = {
  args: {
    isLoggedIn: true,
  },
  beforeEach: setDefaultMock,
  play: async ({ canvas }) => {
    // サイドバーのヘッダー要素が存在することを確認
    await expect(canvas.getByText('TrendDiary')).toBeInTheDocument()

    // メニュー項目が表示されることを確認
    await expect(canvas.getByText('トレンド記事')).toBeInTheDocument()

    // ログアウトボタンが表示されることを確認
    await expect(canvas.getByText('ログアウト')).toBeInTheDocument()
  },
}

export const InteractiveLogout: Story = {
  args: {
    isLoggedIn: true,
  },
  beforeEach: setDefaultMock,
  play: async ({ canvas }) => {
    // ログアウトボタンをクリック
    const logoutButton = canvas.getByText('ログアウト')
    await expect(logoutButton).toBeInTheDocument()

    // ボタンがクリック可能であることを確認
    await userEvent.click(logoutButton)
  },
}

export const LoadingState: Story = {
  args: {
    isLoggedIn: true,
  },
  beforeEach: () => {
    // ローディング状態のモックを設定
    vi.mocked(useLogout).mockReturnValue({
      handleLogout: vi.fn(),
      isLoading: true,
    })
  },
  play: async ({ canvas }) => {
    // ローディング状態のテキストが表示されることを確認
    await expect(canvas.getByText('ログアウト中...')).toBeInTheDocument()

    // ボタンが無効化されていることを確認
    const logoutButton = canvas.getByText('ログアウト中...')
    await expect(logoutButton).toBeDisabled()
  },
}

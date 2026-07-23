import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { vi } from 'vitest'
import { SidebarProvider } from '@/client/components/shadcn/sidebar'
import useLogout from '@/client/features/logout/use-logout'
import AppSidebar from './index'

vi.mock('@/client/features/logout/use-logout', () => ({
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
    await expect(canvas.getByText('TrendDiary')).toBeInTheDocument()
    await expect(canvas.getByText('トレンド記事')).toBeInTheDocument()
    await expect(canvas.getByText('ログアウト')).toBeInTheDocument()
  },
}

export const InteractiveLogout: Story = {
  args: {
    isLoggedIn: true,
  },
  beforeEach: setDefaultMock,
  play: async ({ canvas }) => {
    const logoutButton = canvas.getByText('ログアウト')
    await expect(logoutButton).toBeInTheDocument()

    await userEvent.click(logoutButton)
  },
}

export const LoadingState: Story = {
  args: {
    isLoggedIn: true,
  },
  beforeEach: () => {
    vi.mocked(useLogout).mockReturnValue({
      handleLogout: vi.fn(),
      isLoading: true,
    })
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('ログアウト中...')).toBeInTheDocument()

    const logoutButton = canvas.getByText('ログアウト中...')
    await expect(logoutButton).toBeDisabled()
  },
}

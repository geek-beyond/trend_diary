import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { vi } from 'vitest'
import { SidebarProvider } from '@/client/components/shadcn/sidebar'
import SidebarLogoutButton from './sidebar-logout-button'
import useLogout from './use-logout'

vi.mock('./use-logout', () => ({
  default: vi.fn(),
}))

const handleLogout = fn()

const meta: Meta<typeof SidebarLogoutButton> = {
  component: SidebarLogoutButton,
  beforeEach: () => {
    handleLogout.mockClear()
    vi.mocked(useLogout).mockReturnValue({ handleLogout, isLoading: false })
  },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <Story />
      </SidebarProvider>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof SidebarLogoutButton>

export const Default: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByText('ログアウト')
    await userEvent.click(button)
    await expect(handleLogout).toHaveBeenCalled()
  },
}

export const Loading: Story = {
  beforeEach: () => {
    vi.mocked(useLogout).mockReturnValue({ handleLogout, isLoading: true })
  },
  play: async ({ canvas }) => {
    const button = canvas.getByText('ログアウト中...')
    await expect(button).toBeDisabled()
  },
}

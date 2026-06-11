import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { vi } from 'vitest'
import { SidebarProvider } from '@/client/components/shadcn/sidebar'
import useLogout from '@/client/features/authenticate/hooks/use-logout'
import LogoutButton from './logout-button'

vi.mock('@/client/features/authenticate/hooks/use-logout', () => ({
  default: vi.fn(() => ({
    handleLogout: vi.fn(),
    isLoading: false,
  })),
}))

const meta: Meta<typeof LogoutButton> = {
  component: LogoutButton,
}
export default meta

type Story = StoryObj<typeof LogoutButton>

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
  beforeEach: () => {
    const handleLogout = fn()
    vi.mocked(useLogout).mockReturnValue({ handleLogout, isLoading: false })
  },
  play: async ({ canvas }) => {
    const button = canvas.getByText('ログアウト')
    await expect(button).toBeInTheDocument()

    await userEvent.click(button)
    await expect(vi.mocked(useLogout).mock.results[0]?.value.handleLogout).toHaveBeenCalled()
  },
}

export const SheetVariant: Story = {
  args: {
    variant: 'sheet',
  },
  beforeEach: () => {
    const handleLogout = fn()
    vi.mocked(useLogout).mockReturnValue({ handleLogout, isLoading: false })
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'ログアウト' })
    await expect(button).toBeInTheDocument()

    await userEvent.click(button)
    await expect(vi.mocked(useLogout).mock.results[0]?.value.handleLogout).toHaveBeenCalled()
  },
}

export const Loading: Story = {
  args: {
    variant: 'sheet',
  },
  beforeEach: () => {
    vi.mocked(useLogout).mockReturnValue({ handleLogout: fn(), isLoading: true })
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'ログアウト中...' })
    await expect(button).toBeDisabled()
  },
}

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { vi } from 'vitest'
import { SidebarProvider } from '@/client/components/shadcn/sidebar'
import useLogout from '@/client/features/authenticate/hooks/use-logout'
import LogoutButton from './logout-button'

vi.mock('@/client/features/authenticate/hooks/use-logout', () => ({
  default: vi.fn(),
}))

const handleLogout = fn()

const meta: Meta<typeof LogoutButton> = {
  component: LogoutButton,
  beforeEach: () => {
    handleLogout.mockClear()
    vi.mocked(useLogout).mockReturnValue({ handleLogout, isLoading: false })
  },
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
  play: async ({ canvas }) => {
    const button = canvas.getByText('ログアウト')
    await userEvent.click(button)
    await expect(handleLogout).toHaveBeenCalled()
  },
}

export const SheetVariant: Story = {
  args: {
    variant: 'sheet',
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'ログアウト' })
    await userEvent.click(button)
    await expect(handleLogout).toHaveBeenCalled()
  },
}

export const Loading: Story = {
  args: {
    variant: 'sheet',
  },
  beforeEach: () => {
    vi.mocked(useLogout).mockReturnValue({ handleLogout, isLoading: true })
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'ログアウト中...' })
    await expect(button).toBeDisabled()
  },
}

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import SettingsSection from './settings-section'

const meta: Meta<typeof SettingsSection> = {
  component: SettingsSection,
  args: {
    title: 'テーマ',
    description: '画面の配色を選べます。「システム」はお使いの端末の設定に追従します。',
    children: (
      <button type='button' className='rounded-md border border-border px-3 py-1 text-sm'>
        コントロール
      </button>
    ),
  },
}
export default meta

type Story = StoryObj<typeof SettingsSection>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'テーマ' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'コントロール' })).toBeInTheDocument()
  },
}

export const WithBadgeAndDivider: Story = {
  args: {
    title: 'パスキー',
    description:
      'パスキーを有効にすると、次回から生体認証やデバイスのロックだけでログインできます。',
    badge: { label: 'β版', variant: 'secondary' },
    withDivider: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'パスキー' })).toBeInTheDocument()
    await expect(canvas.getByText('β版')).toBeInTheDocument()
  },
}

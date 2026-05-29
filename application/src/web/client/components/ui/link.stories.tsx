import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { AnchorLink, LinkAsButton } from './link'

const meta: Meta<typeof AnchorLink> = {
  component: AnchorLink,
}
export default meta

type Story = StoryObj<typeof AnchorLink>

export const Internal: Story = {
  args: {
    to: '/trends',
    children: '内部リンク',
  },
  play: async ({ canvas }) => {
    // 内部リンクはReact RouterのLinkとしてレンダリングされることを確認
    const link = canvas.getByRole('link', { name: '内部リンク' })
    await expect(link).toBeInTheDocument()
    await expect(link).toHaveAttribute('href', '/trends')

    // 内部リンクは新しいタブで開かないことを確認
    await expect(link).not.toHaveAttribute('target', '_blank')
  },
}

export const External: Story = {
  args: {
    to: 'https://example.com',
    children: '外部リンク',
  },
  play: async ({ canvas }) => {
    // 外部リンクはaタグとしてレンダリングされることを確認
    const link = canvas.getByRole('link', { name: '外部リンク' })
    await expect(link).toHaveAttribute('href', 'https://example.com')

    // 外部リンクは新しいタブで開き、安全な rel 属性が付与されることを確認
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow')
  },
}

export const WithClassName: Story = {
  args: {
    to: '/diary',
    className: 'text-blue-600 underline',
    children: 'スタイル付きリンク',
  },
  play: async ({ canvas }) => {
    // className が正しく適用されることを確認
    const link = canvas.getByRole('link', { name: 'スタイル付きリンク' })
    await expect(link).toHaveClass('text-blue-600', 'underline')
  },
}

type ButtonStory = StoryObj<typeof LinkAsButton>

export const AsButtonInternal: ButtonStory = {
  render: (args) => <LinkAsButton {...args} />,
  args: {
    to: '/login',
    children: 'ボタン風内部リンク',
  },
  play: async ({ canvas }) => {
    // ボタン風リンクが内部リンクとしてレンダリングされることを確認
    const link = canvas.getByRole('link', { name: 'ボタン風内部リンク' })
    await expect(link).toHaveAttribute('href', '/login')
  },
}

export const AsButtonExternal: ButtonStory = {
  render: (args) => <LinkAsButton {...args} />,
  args: {
    to: 'https://example.com/docs',
    children: 'ボタン風外部リンク',
  },
  play: async ({ canvas }) => {
    // ボタン風リンクが外部リンクとして新しいタブで開くことを確認
    const link = canvas.getByRole('link', { name: 'ボタン風外部リンク' })
    await expect(link).toHaveAttribute('href', 'https://example.com/docs')
    await expect(link).toHaveAttribute('target', '_blank')
  },
}

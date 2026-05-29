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
    const link = canvas.getByRole('link', { name: '内部リンク' })
    await expect(link).toBeInTheDocument()
    await expect(link).toHaveAttribute('href', '/trends')
    await expect(link).not.toHaveAttribute('target', '_blank')
  },
}

export const External: Story = {
  args: {
    to: 'https://example.com',
    children: '外部リンク',
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: '外部リンク' })
    await expect(link).toHaveAttribute('href', 'https://example.com')
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
    const link = canvas.getByRole('link', { name: 'スタイル付きリンク' })
    await expect(link).toHaveClass('text-blue-600', 'underline')
  },
}

type ButtonStory = StoryObj<typeof LinkAsButton>

// LinkAsButton 自体には内部/外部の分岐がない（AnchorLink に委譲）ため、
// 代表として内部リンクのケースのみ検証する。外部リンクの分岐は上記 External で網羅済み。
export const AsButton: ButtonStory = {
  render: (args) => <LinkAsButton {...args} />,
  args: {
    to: '/login',
    children: 'ボタン風リンク',
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'ボタン風リンク' })
    await expect(link).toHaveAttribute('href', '/login')
  },
}

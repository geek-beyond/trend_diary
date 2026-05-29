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
    // 内部リンクがアクセシブルネームで辿れる操作可能なリンクとして提示される
    await expect(canvas.getByRole('link', { name: '内部リンク' })).toBeInTheDocument()
  },
}

export const External: Story = {
  args: {
    to: 'https://example.com',
    children: '外部リンク',
  },
  play: async ({ canvas }) => {
    // 外部リンクもアクセシブルネームで辿れる操作可能なリンクとして提示される
    await expect(canvas.getByRole('link', { name: '外部リンク' })).toBeInTheDocument()
  },
}

type ButtonStory = StoryObj<typeof LinkAsButton>

// LinkAsButton 自体には内部/外部の分岐がなく AnchorLink に委譲するため、代表ケースのみ検証する。
export const AsButton: ButtonStory = {
  render: (args) => <LinkAsButton {...args} />,
  args: {
    to: '/login',
    children: 'ボタン風リンク',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'ボタン風リンク' })).toBeInTheDocument()
  },
}

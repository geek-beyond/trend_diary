import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { AnchorLink, LinkAsButton } from './index'

const meta: Meta<typeof AnchorLink> = {
  component: AnchorLink,
  parameters: {
    layout: 'centered',
  },
}
export default meta

type Story = StoryObj<typeof AnchorLink>

// 外部リンクは別タブで開く生の <a> として描画される
export const ExternalAnchor: Story = {
  args: {
    to: 'https://example.com',
    children: '外部リンク',
  },
  play: async ({ canvas, step }) => {
    await step('外部リンクが別タブ用の属性を持つことを確認', async () => {
      const link = canvas.getByRole('link', { name: '外部リンク' })
      await expect(link).toHaveAttribute('href', 'https://example.com')
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow')
    })
  },
}

// 内部リンクは React Router の Link として描画される
export const InternalAnchor: Story = {
  args: {
    to: '/',
    children: 'トップへ',
  },
  play: async ({ canvas, step }) => {
    await step('内部リンクが描画されることを確認', async () => {
      const link = canvas.getByRole('link', { name: 'トップへ' })
      await expect(link).toHaveAttribute('href', '/')
      await expect(link).not.toHaveAttribute('target', '_blank')
    })
  },
}

type ButtonStory = StoryObj<typeof LinkAsButton>

// LinkAsButton はボタン見た目で内部/外部リンクとして振る舞う
export const AsButtonExternal: ButtonStory = {
  render: (args) => <LinkAsButton {...args} />,
  args: {
    to: 'https://example.com',
    children: 'ボタン風外部リンク',
  },
  play: async ({ canvas, step }) => {
    await step('ボタン見た目の外部リンクが別タブ用の属性を持つことを確認', async () => {
      const link = canvas.getByRole('link', { name: 'ボタン風外部リンク' })
      await expect(link).toHaveAttribute('href', 'https://example.com')
      await expect(link).toHaveAttribute('target', '_blank')
      // 別タブ遷移時の reverse tabnabbing を防ぐ rel が引き継がれることを担保する
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow')
    })
  },
}

export const AsButtonInternal: ButtonStory = {
  render: (args) => <LinkAsButton {...args} />,
  args: {
    to: '/',
    children: 'ボタン風内部リンク',
  },
  play: async ({ canvas, step }) => {
    await step('ボタン見た目の内部リンクが描画されることを確認', async () => {
      const link = canvas.getByRole('link', { name: 'ボタン風内部リンク' })
      await expect(link).toHaveAttribute('href', '/')
    })
  },
}

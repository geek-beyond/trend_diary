import type { Meta, StoryObj } from '@storybook/react-vite'
import { useLocation } from 'react-router'
import { expect, userEvent } from 'storybook/test'
import { AnchorLink, LinkAsButton } from './link'

const meta: Meta<typeof AnchorLink> = {
  component: AnchorLink,
}
export default meta

type Story = StoryObj<typeof AnchorLink>

// 現在地を可視化し、クリックでSPAルーティングが起きたか（=内部リンクの振る舞い）を検証する。
function CurrentPath() {
  const { pathname } = useLocation()
  return <p>現在地: {pathname}</p>
}

export const Internal: Story = {
  render: () => (
    <div>
      <AnchorLink to='/login'>ログインへ</AnchorLink>
      <CurrentPath />
    </div>
  ),
  play: async ({ canvas }) => {
    // 内部リンクのクリックでSPA内ルーティングが発生し、現在地が変わる
    await expect(canvas.getByText('現在地: /')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('link', { name: 'ログインへ' }))
    await expect(await canvas.findByText('現在地: /login')).toBeInTheDocument()
  },
}

export const External: Story = {
  render: () => <AnchorLink to='https://example.com'>外部サイトへ</AnchorLink>,
  play: async ({ canvas }) => {
    // 外部リンクは新規タブ遷移のため遷移自体は検証せず、操作可能なリンクとして提示されることを確認する
    await expect(canvas.getByRole('link', { name: '外部サイトへ' })).toBeInTheDocument()
  },
}

type ButtonStory = StoryObj<typeof LinkAsButton>

export const AsButton: ButtonStory = {
  render: () => (
    <div>
      <LinkAsButton to='/signup'>登録へ</LinkAsButton>
      <CurrentPath />
    </div>
  ),
  play: async ({ canvas }) => {
    // ボタン外観でも内部リンクとしてSPAルーティングが機能する
    await userEvent.click(canvas.getByRole('link', { name: '登録へ' }))
    await expect(await canvas.findByText('現在地: /signup')).toBeInTheDocument()
  },
}

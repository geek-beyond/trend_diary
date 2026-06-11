import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import AppHeader from './index'

const meta: Meta<typeof AppHeader> = {
  component: AppHeader,
  parameters: {
    layout: 'fullscreen',
  },
}
export default meta

type Story = StoryObj<typeof AppHeader>

// AppHeader は `md:hidden` のモバイル専用ヘッダーで、デスクトップ幅の
// テスト環境では `display: none` となりアクセシビリティツリーから除外される。
// そのため role 取得時は `hidden: true` を指定して非表示要素も対象に含める。
// なお描画のみの検証でログアウト操作は行わないため useLogout のモックは不要。

export const LoggedOut: Story = {
  args: {
    isLoggedIn: false,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('banner', { hidden: true })).toBeInTheDocument()

    // サイトロゴ兼TOPリンクとメニュー開閉ボタンが操作対象として提示される
    await expect(canvas.getByRole('link', { name: 'TrendDiary', hidden: true })).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: 'メニューを開く', hidden: true }),
    ).toBeInTheDocument()
  },
}

export const LoggedIn: Story = {
  args: {
    isLoggedIn: true,
  },
  play: async ({ canvas }) => {
    // ログイン分岐を通すことでメニュー項目生成・LogoutButton 生成のコードを網羅する
    await expect(canvas.getByRole('banner', { hidden: true })).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: 'メニューを開く', hidden: true }),
    ).toBeInTheDocument()
  },
}

import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import TopPage from './page'

function renderTopPage(isLoggedIn: boolean) {
  return render(createElement(MemoryRouter, null, createElement(TopPage, { isLoggedIn })))
}

describe('TopPage', () => {
  it('スクリーンリーダー向けに本文を main ランドマークとして公開する', () => {
    renderTopPage(false)

    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  describe('未ログイン時', () => {
    it('ヘッダーにログイン・アカウント作成の導線を表示しメニューは表示しない', () => {
      renderTopPage(false)

      const loginLinks = screen.getAllByRole('link', { name: 'ログイン' })
      expect(loginLinks.length).toBeGreaterThan(0)
      for (const link of loginLinks) {
        expect(link).toHaveAttribute('href', '/login')
      }
      expect(screen.getByRole('link', { name: 'アカウント作成' })).toHaveAttribute(
        'href',
        '/signup',
      )
      expect(screen.queryByRole('button', { name: 'メニューを開く' })).not.toBeInTheDocument()
    })

    it('コンテンツのアカウント作成ボタンはサインアップへ遷移する', () => {
      renderTopPage(false)

      expect(screen.getByRole('link', { name: '無料でアカウントを作成' })).toHaveAttribute(
        'href',
        '/signup',
      )
      expect(screen.queryByRole('link', { name: 'トレンド一覧へ' })).not.toBeInTheDocument()
    })
  })

  describe('ログイン時', () => {
    it('ヘッダーのログイン・アカウント作成の導線を隠し一覧同様のメニューを表示する', () => {
      renderTopPage(true)

      expect(screen.queryByRole('link', { name: 'ログイン' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'アカウント作成' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'メニューを開く' })).toBeInTheDocument()
    })

    it('コンテンツのログイン・アカウント関連ボタンはトレンド一覧へ遷移する', () => {
      renderTopPage(true)

      const trendLinks = screen.getAllByRole('link', { name: 'トレンド一覧へ' })
      expect(trendLinks.length).toBeGreaterThan(0)
      for (const link of trendLinks) {
        expect(link).toHaveAttribute('href', '/trends')
      }
      expect(screen.queryByRole('link', { name: '無料でアカウントを作成' })).not.toBeInTheDocument()
    })
  })
})

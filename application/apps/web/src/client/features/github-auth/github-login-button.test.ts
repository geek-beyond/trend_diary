import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import GithubLoginButton from './github-login-button'

// React RouterのLinkを使うため、Router配下で描画する
function renderButton(props?: { label?: string; redirectTo?: string }) {
  return render(createElement(MemoryRouter, null, createElement(GithubLoginButton, props)))
}

describe('GithubLoginButton', () => {
  describe('正常系', () => {
    it('OAuth開始URLへのリンクとして描画する', () => {
      renderButton()

      const link = screen.getByRole('link', { name: 'GitHubでログイン' })
      expect(link).toHaveAttribute('href', '/api/oauth/github/login')
    })

    it('label指定時はその文言でリンクを描画する', () => {
      renderButton({ label: 'GitHubで登録' })

      const link = screen.getByRole('link', { name: 'GitHubで登録' })
      expect(link).toHaveAttribute('href', '/api/oauth/github/login')
    })

    it('redirectTo指定時はredirectクエリを付与する', () => {
      renderButton({ redirectTo: '/diary?page=2' })

      const link = screen.getByRole('link', { name: 'GitHubでログイン' })
      expect(link).toHaveAttribute('href', '/api/oauth/github/login?redirect=%2Fdiary%3Fpage%3D2')
    })
  })
})

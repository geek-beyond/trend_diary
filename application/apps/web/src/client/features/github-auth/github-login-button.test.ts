import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import GithubLoginButton from './github-login-button'

describe('GithubLoginButton', () => {
  describe('正常系', () => {
    it('既定ラベルのリンクとしてOAuth開始URLへ遷移する', () => {
      render(createElement(GithubLoginButton))

      const link = screen.getByRole('link', { name: 'GitHubでログイン' })
      expect(link).toHaveAttribute('href', '/api/auth/oauth/github/login')
    })

    it('redirectTo指定時はredirectクエリを付与する', () => {
      render(createElement(GithubLoginButton, { redirectTo: '/diary?page=2' }))

      const link = screen.getByRole('link', { name: 'GitHubでログイン' })
      expect(link).toHaveAttribute(
        'href',
        '/api/auth/oauth/github/login?redirect=%2Fdiary%3Fpage%3D2',
      )
    })

    it('label指定時は文言を差し替える', () => {
      render(createElement(GithubLoginButton, { label: 'GitHubで登録' }))

      expect(screen.getByRole('link', { name: 'GitHubで登録' })).toBeInTheDocument()
    })
  })
})

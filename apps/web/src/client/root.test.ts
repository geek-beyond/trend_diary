import { render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ErrorBoundary } from './root'

function renderWithLoaderError(loader: () => never) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        loader,
        Component: () => null,
        ErrorBoundary,
      },
    ],
    { initialEntries: ['/'] },
  )
  render(createElement(RouterProvider, { router }))
}

describe('ErrorBoundary', () => {
  it('ルートエラーレスポンスの場合はステータスとトップへ戻る導線を表示する', async () => {
    renderWithLoaderError(() => {
      throw new Response('見つかりません', { status: 404, statusText: 'Not Found' })
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '404 Not Found' })).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'トップへ戻る' })).toHaveAttribute('href', '/')
  })

  it('Errorの場合はメッセージとトップへ戻る導線を表示する', async () => {
    renderWithLoaderError(() => {
      throw new Error('想定外のエラー')
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Error' })).toBeInTheDocument()
    })
    expect(screen.getByText('想定外のエラー')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'トップへ戻る' })).toHaveAttribute('href', '/')
  })

  it('Error以外がスローされた場合はUnknown Errorとトップへ戻る導線を表示する', async () => {
    // oxlint-disable-next-line no-throw-literal -- Error以外がthrowされるケースの再現のため
    renderWithLoaderError(() => {
      throw 'string error'
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Unknown Error' })).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'トップへ戻る' })).toHaveAttribute('href', '/')
  })
  it('本番ではErrorの内部メッセージとスタックを公開せず、診断ログと戻る導線を残す', async () => {
    vi.stubEnv('PROD', true)
    const logging = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = new Error('internal-secret-message')
    try {
      renderWithLoaderError(() => {
        throw error
      })
      await waitFor(() => {
        expect(
          screen.getByText('予期しないエラーが発生しました。時間をおいて再度お試しください。'),
        ).toBeInTheDocument()
      })
      expect(document.body.textContent).not.toContain(error.message)
      expect(screen.queryByText('The stack trace is:')).toBeNull()
      expect(logging).toHaveBeenCalledWith(error)
      expect(screen.getByRole('link', { name: 'トップへ戻る' })).toHaveAttribute('href', '/')
    } finally {
      logging.mockRestore()
      vi.unstubAllEnvs()
    }
  })
})

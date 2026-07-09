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
})

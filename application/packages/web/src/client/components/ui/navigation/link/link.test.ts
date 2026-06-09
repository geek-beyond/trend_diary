import { fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AnchorLink } from '@/client/components/ui/navigation/link'

describe('AnchorLink', () => {
  it('内部リンクでonClickを渡したときにクリック時に実行される', () => {
    const onClick = vi.fn()

    render(
      createElement(
        MemoryRouter,
        null,
        createElement(AnchorLink, { to: '/trends', onClick }, 'トレンド記事'),
      ),
    )

    fireEvent.click(screen.getByRole('link', { name: 'トレンド記事' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('外部リンクでonClickを渡したときにクリック時に実行される', () => {
    const onClick = vi.fn()

    render(createElement(AnchorLink, { to: 'https://example.com', onClick }, '公式サイト'))

    fireEvent.click(screen.getByRole('link', { name: '公式サイト' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

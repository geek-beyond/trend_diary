import { act, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { useIsMobile } from './hooks/use-mobile'
import { SidebarProvider, useSidebar } from './sidebar'

vi.mock('./hooks/use-mobile', () => ({ useIsMobile: vi.fn(() => false) }))

function State() {
  const { open, openMobile } = useSidebar()
  return createElement('output', {}, `${open}:${openMobile}`)
}

describe('サイドバーのショートカット', () => {
  it('Cmd/Ctrl+B は最新の開閉状態・モバイル状態を使い、購読は再作成せず解除する', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const view = render(createElement(SidebarProvider, {}, createElement(State)))
    const subscriptions = () => add.mock.calls.filter(([type]) => String(type) === 'keydown')
    expect(subscriptions()).toHaveLength(1)
    const listener = subscriptions()[0][1]
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(screen.getByRole('status')).toHaveTextContent('false:false')
    fireEvent.keyDown(window, { key: 'b', metaKey: true })
    expect(screen.getByRole('status')).toHaveTextContent('true:false')
    vi.mocked(useIsMobile).mockReturnValue(true)
    view.rerender(createElement(SidebarProvider, {}, createElement(State)))
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(screen.getByRole('status')).toHaveTextContent('true:true')
    fireEvent.keyDown(window, { key: 'b' })
    expect(screen.getByRole('status')).toHaveTextContent('true:true')
    expect(subscriptions()).toHaveLength(1)
    act(() => view.unmount())
    expect(remove).toHaveBeenCalledWith('keydown', listener)
    vi.restoreAllMocks()
  })
})

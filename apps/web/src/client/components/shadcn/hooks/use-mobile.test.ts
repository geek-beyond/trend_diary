import { act, renderHook } from '@testing-library/react'
import { useIsMobile } from './use-mobile'

type MediaQueryListener = (event: MediaQueryListEvent) => void

// matchMedia の change を発火できるよう、登録されたリスナーを保持するモックを用意する
function mockMatchMedia() {
  const listeners = new Set<MediaQueryListener>()

  // jsdom は matchMedia を実装しないため、フックが購読するAPIを差し替える
  vi.stubGlobal('matchMedia', (query: string) => {
    return {
      matches: window.innerWidth < 768,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: MediaQueryListener) => {
        listeners.add(listener)
      },
      removeEventListener: (_type: string, listener: MediaQueryListener) => {
        listeners.delete(listener)
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  })

  return {
    // 実際の viewport 変更を模して innerWidth を書き換えてから change を通知する
    resize(width: number) {
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
      for (const listener of listeners) {
        listener({} as MediaQueryListEvent)
      }
    },
  }
}

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true })
  })

  describe('正常系', () => {
    it.each([
      { width: 375, expected: true, label: 'モバイル幅ではtrueを返す' },
      { width: 767, expected: true, label: 'ブレークポイント未満ではtrueを返す' },
      { width: 768, expected: false, label: 'ブレークポイント以上ではfalseを返す' },
      { width: 1280, expected: false, label: 'デスクトップ幅ではfalseを返す' },
    ])('$label', ({ width, expected }) => {
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
      mockMatchMedia()

      const { result } = renderHook(() => useIsMobile())

      // 初回レンダーで確定し、副作用後の再レンダー（ちらつき）を伴わない
      expect(result.current).toBe(expected)
    })

    it('viewportの変化に追従して値を更新する', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
      const { resize } = mockMatchMedia()

      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(false)

      act(() => {
        resize(375)
      })
      expect(result.current).toBe(true)

      act(() => {
        resize(1024)
      })
      expect(result.current).toBe(false)
    })
  })
})

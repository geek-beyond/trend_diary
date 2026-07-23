import { afterEach, describe, expect, it, vi } from 'vitest'
import { scrollToTop } from './scroll'

describe('scrollToTop', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ページ最上部へスムーズスクロールする', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    scrollToTop()

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})

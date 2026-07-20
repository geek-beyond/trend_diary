import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsRoute from './route'

// ページ本体は page.test.ts で検証するため、ここではroute層の通知制御だけを見る
vi.mock('./page', () => ({
  default: () => createElement('div', { 'data-testid': 'settings-page' }),
}))

function renderAt(url: string) {
  return render(
    createElement(MemoryRouter, { initialEntries: [url] }, createElement(SettingsRoute)),
  )
}

describe('SettingsRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('oauthError=github付きで開くと連携失敗トーストを出す', () => {
      renderAt('/settings?oauthError=github')

      expect(toast.error).toHaveBeenCalledWith(
        'GitHub連携に失敗しました。もう一度お試しください。',
        { id: 'github-oauth-error' },
      )
    })

    it('oauthErrorが無ければトーストを出さない', () => {
      renderAt('/settings')

      expect(screen.getByTestId('settings-page')).toBeInTheDocument()
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled()
    })
  })
})

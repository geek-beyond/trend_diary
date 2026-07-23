import { afterAll, describe, expect, it, vi } from 'vitest'
import { fetchOgImageUrl } from './og-image'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

afterAll(() => {
  vi.unstubAllGlobals()
})

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, { status, headers: { 'content-type': 'text/html' } })
}

function pageHtml(headContent: string): string {
  return `<!DOCTYPE html><html><head><title>タイトル</title>${headContent}</head><body>本文</body></html>`
}

function ogImageMeta(content: string): string {
  return `<meta property="og:image" content="${content}" />`
}

describe('fetchOgImageUrl', () => {
  describe('正常系', () => {
    it('記事ページの og:image の URL を返す', async () => {
      fetchMock.mockResolvedValueOnce(
        htmlResponse(pageHtml(ogImageMeta('https://example.com/image.png'))),
      )

      const result = await fetchOgImageUrl('https://example.com/article')

      expect(result).toBe('https://example.com/image.png')
    })

    it('og:image が複数ある場合は最初の1つを返す', async () => {
      fetchMock.mockResolvedValueOnce(
        htmlResponse(
          pageHtml(
            ogImageMeta('https://example.com/first.png') +
              ogImageMeta('https://example.com/second.png'),
          ),
        ),
      )

      const result = await fetchOgImageUrl('https://example.com/article')

      expect(result).toBe('https://example.com/first.png')
    })

    it('相対 URL の og:image は記事 URL 基準の絶対 URL に解決して返す', async () => {
      fetchMock.mockResolvedValueOnce(htmlResponse(pageHtml(ogImageMeta('/images/og.png'))))

      const result = await fetchOgImageUrl('https://example.com/article')

      expect(result).toBe('https://example.com/images/og.png')
    })
  })

  describe('準正常系', () => {
    const nullCases: { name: string; headContent: string }[] = [
      { name: 'og:image が無いページ', headContent: '' },
      {
        name: 'og:image の content が URL として不正',
        headContent: ogImageMeta('http://'),
      },
      {
        name: 'og:image が最大長を超える（切り詰めると壊れるため null にする）',
        headContent: ogImageMeta(`https://example.com/${'a'.repeat(2100)}`),
      },
    ]

    it.each(nullCases)('$name の場合は null を返す', async ({ headContent }) => {
      fetchMock.mockResolvedValueOnce(htmlResponse(pageHtml(headContent)))

      const result = await fetchOgImageUrl('https://example.com/article')

      expect(result).toBeNull()
    })

    it('レスポンスが ok でない場合は null を返す', async () => {
      fetchMock.mockResolvedValueOnce(htmlResponse('Internal Server Error', 500))

      const result = await fetchOgImageUrl('https://example.com/article')

      expect(result).toBeNull()
    })
  })

  describe('異常系', () => {
    it('fetch が例外を投げた場合は null を返す', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network error'))

      const result = await fetchOgImageUrl('https://example.com/article')

      expect(result).toBeNull()
    })
  })
})

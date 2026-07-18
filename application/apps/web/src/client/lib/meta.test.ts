import { describe, expect, it } from 'vitest'
import { mergeMeta, type MetaMatches, pageMeta, SITE_URL } from './meta'

function buildMatch(meta: MetaMatches[number]['meta']): MetaMatches[number] {
  return { id: 'test', pathname: '/', loaderData: undefined, params: {}, meta }
}

describe('pageMeta', () => {
  it('title/descriptionからtitle・description・OGP・Twitter Card用のmetaを組み立てる', () => {
    expect(
      pageMeta({ title: 'ログイン | TrendDiary', description: 'ログイン説明', path: '/login' }),
    ).toEqual([
      { title: 'ログイン | TrendDiary' },
      { name: 'description', content: 'ログイン説明' },
      { property: 'og:title', content: 'ログイン | TrendDiary' },
      { property: 'og:description', content: 'ログイン説明' },
      { property: 'og:url', content: `${SITE_URL}/login` },
      { name: 'twitter:title', content: 'ログイン | TrendDiary' },
      { name: 'twitter:description', content: 'ログイン説明' },
    ])
  })
})

describe('mergeMeta', () => {
  it('overridesと同じキー（title/name/property）を持たない親metaはそのまま継承する', () => {
    const matches = [
      buildMatch([
        { charSet: 'utf-8' as const },
        { property: 'og:site_name', content: 'TrendDiary' },
        { title: '親のtitle' },
      ]),
    ]

    expect(mergeMeta(matches, [{ title: '子のtitle' }])).toEqual([
      { charSet: 'utf-8' },
      { property: 'og:site_name', content: 'TrendDiary' },
      { title: '子のtitle' },
    ])
  })

  it('複数マッチ分のmetaを結合してから同じキーを上書きする', () => {
    const matches = [
      buildMatch([{ title: 'root' }, { name: 'description', content: 'root説明' }]),
      buildMatch([{ property: 'og:url', content: `${SITE_URL}/` }]),
    ]

    expect(
      mergeMeta(matches, [{ title: 'leaf' }, { name: 'description', content: 'leaf説明' }]),
    ).toEqual([
      { property: 'og:url', content: `${SITE_URL}/` },
      { title: 'leaf' },
      { name: 'description', content: 'leaf説明' },
    ])
  })

  it('overridesが空のときは親metaをそのまま返す', () => {
    const matches = [buildMatch([{ title: '親のtitle' }])]

    expect(mergeMeta(matches, [])).toEqual([{ title: '親のtitle' }])
  })

  it('metaを持たない中間レイアウトがrootのmetaを複製して継承していても重複させない', () => {
    const rootMeta = [
      { charSet: 'utf-8' as const },
      { property: 'og:site_name', content: 'TrendDiary' },
    ]
    const matches = [buildMatch(rootMeta), buildMatch(rootMeta)]

    expect(mergeMeta(matches, [{ title: '子のtitle' }])).toEqual([
      { charSet: 'utf-8' },
      { property: 'og:site_name', content: 'TrendDiary' },
      { title: '子のtitle' },
    ])
  })

  it('rel違いのlinkタグ（favicon/apple-touch-icon）は別キーとして両方継承する', () => {
    const matches = [
      buildMatch([
        { tagName: 'link', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { tagName: 'link', rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ]),
    ]

    expect(mergeMeta(matches, [{ title: '子のtitle' }])).toEqual([
      { tagName: 'link', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { tagName: 'link', rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { title: '子のtitle' },
    ])
  })
})

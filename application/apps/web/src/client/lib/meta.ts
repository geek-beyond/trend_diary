import type { MetaDescriptor, MetaFunction } from 'react-router'

export const SITE_URL = 'https://trend-diary.gtms.workers.dev'

export type MetaMatches = Parameters<MetaFunction>[0]['matches']

function metaKey(meta: MetaDescriptor): string {
  if ('title' in meta) return 'title'
  if ('charSet' in meta) return 'charSet'
  if ('name' in meta) return `name:${meta.name}`
  if ('property' in meta) return `property:${meta.property}`
  if ('httpEquiv' in meta) return `httpEquiv:${meta.httpEquiv}`
  if ('tagName' in meta) return `tagName:${meta.tagName}:${'rel' in meta ? meta.rel : ''}`
  return JSON.stringify(meta)
}

/**
 * 親ルート（root等）のmetaを継承しつつ、同じキー（title/name/property等）を持つものだけを
 * overridesで上書きする。React Routerは子ルートがmetaを返すと親のmetaを丸ごと破棄するため、
 * charSetやfaviconなど共通タグを維持したまま画面固有のtitle/descriptionだけ差し替えるために使う。
 * 独自のmetaを持たない中間レイアウト（app-layout等）はrootのmetaをそのまま複製して引き継ぐため、
 * matchesを平坦化すると同じキーが複数回出現しうる。overridesとの重複除去に加え、継承分どうしの
 * 重複も取り除く。
 */
export function mergeMeta(matches: MetaMatches, overrides: MetaDescriptor[]): MetaDescriptor[] {
  const parentMeta = matches.flatMap((match) => match.meta)
  const overrideKeys = new Set(overrides.map(metaKey))
  const seenKeys = new Set<string>()
  const inherited = parentMeta.filter((meta) => {
    const key = metaKey(meta)
    if (overrideKeys.has(key) || seenKeys.has(key)) return false
    seenKeys.add(key)
    return true
  })
  return [...inherited, ...overrides]
}

/**
 * title/descriptionから、OGP・Twitter Card用のmetaを含めた画面共通のセットを組み立てる。
 * og:urlはSNSシェア時に絶対URLが要求されるため、pathをSITE_URLと結合して生成する。
 */
export function pageMeta({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}): MetaDescriptor[] {
  const url = `${SITE_URL}${path}`

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ]
}

import type { MetaDescriptor, MetaFunction } from 'react-router'

export const SITE_URL = 'https://trend-diary.gtms.workers.dev'

export type MetaMatches = Parameters<MetaFunction>[0]['matches']

function metaKey(meta: MetaDescriptor): string {
  if ('title' in meta) return 'title'
  if ('charSet' in meta) return 'charSet'
  if ('name' in meta) return `name:${meta.name}`
  if ('property' in meta) return `property:${meta.property}`
  if ('tagName' in meta) return `tagName:${meta.tagName}:${'rel' in meta ? meta.rel : ''}`
  return JSON.stringify(meta)
}

/**
 * React Routerは子ルートがmetaを返すと親のmetaを丸ごと破棄するため、charSetやfaviconなど
 * 共通タグを維持したまま画面固有のtitle/descriptionだけ差し替えるために使う。
 * 独自のmetaを持たない中間レイアウト（app-layout等）はrootのmetaをそのまま複製して引き継ぐため、
 * matchesを平坦化すると同じキーが複数回出現しうる。
 */
export function mergeMeta(matches: MetaMatches, overrides: MetaDescriptor[]): MetaDescriptor[] {
  const parentMeta = matches.flatMap((match) => match.meta)
  const claimedKeys = new Set(overrides.map(metaKey))
  const inherited = parentMeta.filter((meta) => {
    const key = metaKey(meta)
    if (claimedKeys.has(key)) return false
    claimedKeys.add(key)
    return true
  })
  return [...inherited, ...overrides]
}

/**
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

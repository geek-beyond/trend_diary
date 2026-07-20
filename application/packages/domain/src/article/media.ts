import { assert } from '@trend-diary/std/contract'

export const ARTICLE_MEDIA = ['qiita', 'zenn', 'hatena'] as const

export type ArticleMedia = (typeof ARTICLE_MEDIA)[number]

export const ARTICLE_MEDIA_LABELS: Record<ArticleMedia, string> = {
  qiita: 'Qiita',
  zenn: 'Zenn',
  hatena: 'はてブ',
}

const ARTICLE_MEDIA_SET: ReadonlySet<string> = new Set(ARTICLE_MEDIA)

export function isArticleMedia(value: string): value is ArticleMedia {
  return ARTICLE_MEDIA_SET.has(value)
}

// DBのmediaカラムは任意文字列のため、未知の値＝データ破損は補完せず契約違反として送出する。
// 検証＋送出の定型を読み取り経路ごとに手書きすると、経路間で検証の有無が非対称になりやすいため集約する
export function assertArticleMedia(value: string, subject: string): asserts value is ArticleMedia {
  assert(isArticleMedia(value), `${subject} has unknown media: ${value}`)
}

import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'

// 媒体フィルタの選択状態。「すべて」は全メディアを選択した状態で表す。
// use-articles（swr / react-router に依存）とは分離し、Storybook 等の軽量な描画からも読めるようにする
export type SelectedMedia = ArticleMedia[]

// 「すべて」を表す既定値。フィルタ無しと同義
export const ALL_MEDIA: SelectedMedia = [...ARTICLE_MEDIA]

// 全メディア選択はフィルタ無し（すべて）と同義なので、クエリ・URL からは省く判定に使う
export const isAllMediaSelected = (media: SelectedMedia): boolean =>
  media.length === ARTICLE_MEDIA.length

// ArticleCard と ArticleCardSkeleton が同一寸法であることを構造的に保証するための共有クラス定義。
// 寸法がずれるとローディング前後でレイアウトシフトが起きるため、両者はここだけを参照する
export const ARTICLE_CARD_FRAME_CLASS =
  'h-56 w-full gap-0 sm:w-64 rounded-3xl border border-border bg-card/30 py-0 shadow-2xl backdrop-blur-xl'

// カード自体に overflow-hidden を付けるとフォーカスリングが切れるため、角丸のクリップはサムネイル枠側で行う
export const ARTICLE_THUMBNAIL_FRAME_CLASS = 'h-28 w-full shrink-0 overflow-hidden rounded-t-3xl'

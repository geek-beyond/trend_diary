import { ArticleNotFoundError } from '@trend-diary/domain/article'
import { HTTPException } from 'hono/http-exception'

// 記事集約のドメインエラーを対応する HTTPException として送出する。どのドメインエラーがどのステータスかは
// ハンドラ層(HTTP 境界)の責務とする。リポジトリ障害等の想定外エラーはサーバ起因として errorHandler の
// 5xx 処理に委ねる。
export default function throwArticleHttpError(error: Error): never {
  if (error instanceof ArticleNotFoundError) {
    throw new HTTPException(404, { message: error.message })
  }
  throw error
}

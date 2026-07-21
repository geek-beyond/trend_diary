import { ArticleNotFoundError } from '@trend-diary/domain/article'
import throwHttpErrorByTable, { type ErrorStatusTable } from './throw-http-error'

const ERROR_STATUS_TABLE: ErrorStatusTable = [[ArticleNotFoundError, 404]]

// 記事集約のドメインエラーを HTTPException へ写像して送出する。
export default function throwHttpError(error: Error): never {
  return throwHttpErrorByTable(error, ERROR_STATUS_TABLE)
}

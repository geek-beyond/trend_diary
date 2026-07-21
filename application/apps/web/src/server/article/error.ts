import { ArticleNotFoundError } from '@trend-diary/domain/article'
import throwHttpErrorByTable, { type ErrorStatusTable } from '@/server/throw-http-error'

const ERROR_STATUS_TABLE: ErrorStatusTable = [[ArticleNotFoundError, 404]]

export default function throwHttpError(error: Error): never {
  return throwHttpErrorByTable(error, ERROR_STATUS_TABLE)
}

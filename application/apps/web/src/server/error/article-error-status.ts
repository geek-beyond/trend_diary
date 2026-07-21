import { ArticleNotFoundError } from '@trend-diary/domain/article'
import type { ErrorStatusTable } from './throw-http-error'

// 記事集約のドメインエラー → HTTP ステータス対応表。
export const ARTICLE_ERROR_STATUS_TABLE: ErrorStatusTable = [[ArticleNotFoundError, 404]]

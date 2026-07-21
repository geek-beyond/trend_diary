import { ActiveUserNotFoundError } from '@trend-diary/domain/account'
import type { ErrorStatusTable } from './throw-http-error'

// アカウント集約のドメインエラー → HTTP ステータス対応表。
export const ACCOUNT_ERROR_STATUS_TABLE: ErrorStatusTable = [[ActiveUserNotFoundError, 404]]

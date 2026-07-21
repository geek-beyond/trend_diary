import { ActiveUserNotFoundError } from '@trend-diary/domain/account'
import throwHttpErrorByTable, { type ErrorStatusTable } from './throw-http-error'

const ERROR_STATUS_TABLE: ErrorStatusTable = [[ActiveUserNotFoundError, 404]]

export default function throwHttpError(error: Error): never {
  return throwHttpErrorByTable(error, ERROR_STATUS_TABLE)
}

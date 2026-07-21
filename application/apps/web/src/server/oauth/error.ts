import { NoSessionError } from '@trend-diary/authentication'
import throwHttpErrorByTable, { type ErrorStatusTable } from '@/server/error/throw-http-error'

const ERROR_STATUS_TABLE: ErrorStatusTable = [[NoSessionError, 401]]

export default function throwHttpError(error: Error): never {
  return throwHttpErrorByTable(error, ERROR_STATUS_TABLE)
}

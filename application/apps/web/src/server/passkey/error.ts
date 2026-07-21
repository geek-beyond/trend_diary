import { PasskeyRegistrationError, PasskeyVerificationError } from '@trend-diary/authentication'
import { ActiveUserNotFoundError } from '@trend-diary/domain/account'
import throwHttpErrorByTable, { type ErrorStatusTable } from '@/server/error/throw-http-error'

const ERROR_STATUS_TABLE: ErrorStatusTable = [
  [PasskeyRegistrationError, 400],
  [PasskeyVerificationError, 401],
  [ActiveUserNotFoundError, 404],
]

export default function throwHttpError(error: Error): never {
  return throwHttpErrorByTable(error, ERROR_STATUS_TABLE)
}

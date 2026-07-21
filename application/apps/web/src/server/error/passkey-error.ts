import { PasskeyRegistrationError, PasskeyVerificationError } from '@trend-diary/authentication'
import throwHttpErrorByTable, { type ErrorStatusTable } from './throw-http-error'

const ERROR_STATUS_TABLE: ErrorStatusTable = [
  [PasskeyRegistrationError, 400],
  [PasskeyVerificationError, 401],
]

export default function throwHttpError(error: Error): never {
  return throwHttpErrorByTable(error, ERROR_STATUS_TABLE)
}

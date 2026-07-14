import type { RdbClient } from '@trend-diary/datastore/rdb'
import CommandImpl from './infrastructure/command-impl'
import QueryImpl from './infrastructure/query-impl'
import { AccountUseCase } from './use-case'

export function createAccountUseCase(db: RdbClient): AccountUseCase {
  const userCommand = new CommandImpl(db)
  const userQuery = new QueryImpl(db)
  return new AccountUseCase(userCommand, userQuery)
}

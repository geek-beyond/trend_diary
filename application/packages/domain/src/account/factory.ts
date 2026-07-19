import type { RdbClient } from '@trend-diary/datastore/rdb'
import CommandImpl from './infrastructure/command-impl'
import QueryImpl from './infrastructure/query-impl'
import type { Notifier } from './repository'
import { AccountUseCase } from './use-case'

export function createAccountUseCase(db: RdbClient, notifier: Notifier): AccountUseCase {
  const userCommand = new CommandImpl(db, notifier)
  const userQuery = new QueryImpl(db)
  return new AccountUseCase(userCommand, userQuery)
}

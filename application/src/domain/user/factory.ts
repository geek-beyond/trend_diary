import { SupabaseClient } from '@supabase/supabase-js'
import { RdbClient } from '@trend-diary/datastore/rdb'
import CommandImpl from './infrastructure/command-impl'
import QueryImpl from './infrastructure/query-impl'
import { SupabaseAuthRepository } from './infrastructure/supabase-auth-repository'
import { AuthUseCase } from './use-case'

export function createAuthUseCase(client: SupabaseClient, db: RdbClient): AuthUseCase {
  const repository = new SupabaseAuthRepository(client)
  const userCommand = new CommandImpl(db)
  const userQuery = new QueryImpl(db)
  return new AuthUseCase(repository, userCommand, userQuery)
}

import { SupabaseClient } from '@supabase/supabase-js'
import { RdbClient } from '@trend-diary/datastore/rdb'
import CommandImpl from './infrastructure/command-impl'
import QueryImpl from './infrastructure/query-impl'
import { SupabaseAuthRepository } from './infrastructure/supabase-auth-repository'
import { TurnstileCaptchaVerifier } from './infrastructure/turnstile-captcha-verifier'
import { AuthUseCase } from './use-case'

// captchaSecret未指定の経路ではCAPTCHA検証をスキップする(secret未設定の検証器を注入)
export function createAuthUseCase(
  client: SupabaseClient,
  db: RdbClient,
  captchaSecret?: string,
): AuthUseCase {
  const repository = new SupabaseAuthRepository(client)
  const userCommand = new CommandImpl(db)
  const userQuery = new QueryImpl(db)
  const captchaVerifier = new TurnstileCaptchaVerifier(captchaSecret)
  return new AuthUseCase(repository, userCommand, userQuery, captchaVerifier)
}

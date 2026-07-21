import type { Nullable } from '@trend-diary/std/types/utility'
import { type Result } from 'neverthrow'
import type { CurrentUser } from './schema/active-user-schema'

export interface Query {
  findActiveById(id: bigint): Promise<Result<Nullable<CurrentUser>, Error>>
  findActiveByEmail(email: string): Promise<Result<Nullable<CurrentUser>, Error>>
  findActiveByAuthenticationId(
    authenticationId: string,
  ): Promise<Result<Nullable<CurrentUser>, Error>>
}

/**
 * 任意のメッセージを外部へ送信する通知ポート
 */
export interface Notifier {
  sendMessage(content: string): Promise<void>
}

export interface Command {
  createActiveWithAuthenticationId(
    email: string,
    authenticationId: string,
    notifier: Notifier,
    displayName?: string | null,
  ): Promise<Result<CurrentUser, Error>>
}

import { ClientError } from '@trend-diary/std/errors'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { TOAST_ID } from './toast-id'
import { SESSION_SWR_KEY } from './use-session'

export const SESSION_EXPIRED_MESSAGE =
  'セッションの有効期限が切れました。再度ログインしてください。'

// 認証必須APIの401はセッション切れとして扱う。ログイン自体の401（認証情報不一致）は
// createSWRFetcher を経由しないため、ここでは対象にならない
// oxlint-disable-next-line typescript/no-restricted-types -- 任意の値を受けて ClientError か絞り込む型ガードの役割のため
export const isSessionExpiredError = (error: unknown): boolean =>
  error instanceof ClientError && error.statusCode === 401

// 同時に複数のAPIが401を返しても、案内トーストは1つに集約する。
// セッションキャッシュも未ログインへ揃え、保護ページ側のルートガードに波及させる
export function notifySessionExpired() {
  toast.error(SESSION_EXPIRED_MESSAGE, { id: TOAST_ID.SESSION_EXPIRED })
  void mutate(SESSION_SWR_KEY, false, { revalidate: false })
}

// セッション切れの案内はnotifySessionExpired側で表示済みのため、
// 呼び出し側の汎用エラートーストと重複させないための共通ガード
export function notifyErrorUnlessSessionExpired(
  // oxlint-disable-next-line typescript/no-restricted-types -- JS は任意の値を throw でき、受け取る失敗値の型を確定できないため
  error: unknown,
  message: string,
  toastOptions?: Parameters<typeof toast.error>[1],
) {
  if (isSessionExpiredError(error)) return

  if (toastOptions) {
    toast.error(message, toastOptions)
  } else {
    toast.error(message)
  }
}

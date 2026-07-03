interface PasskeyContext {
  cloudflare?: {
    env?: { PASSKEY_ENABLED?: string }
  }
}

/**
 * フラグが'true'のときのみpasskeyを有効とみなす。
 * Supabase passkeyはBeta、かつローカルのsupa-emuが未対応のため、既定は無効とする。
 */
export function resolvePasskeyEnabled(context: PasskeyContext): boolean {
  return context.cloudflare?.env?.PASSKEY_ENABLED === 'true'
}

const PASSKEY_LOGIN_FAILED_MESSAGE = 'passkeyでのログインに失敗しました。'
const PASSKEY_REGISTER_FAILED_MESSAGE = 'passkeyの登録に失敗しました。'
// ユーザーがOSのダイアログをキャンセルした場合など、操作中断は失敗として強く表示しない
const PASSKEY_CANCELED_MESSAGE = 'passkeyの操作がキャンセルされました。'

export const PASSKEY_MESSAGES = {
  loginFailed: PASSKEY_LOGIN_FAILED_MESSAGE,
  registerFailed: PASSKEY_REGISTER_FAILED_MESSAGE,
  canceled: PASSKEY_CANCELED_MESSAGE,
}

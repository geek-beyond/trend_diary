interface PasskeyContext {
  cloudflare?: {
    env?: { PASSKEY_ENABLED?: string }
  }
}

// サーバーのゲート(PASSKEY_ENABLED)と判定をそろえるため、厳密に'true'のときだけ有効とみなす
export function resolvePasskeyEnabled(context: PasskeyContext): boolean {
  return context.cloudflare?.env?.PASSKEY_ENABLED === 'true'
}

const PASSKEY_LOGIN_FAILED_MESSAGE = 'パスキーでのログインに失敗しました。'
const PASSKEY_REGISTER_FAILED_MESSAGE = 'パスキーの登録に失敗しました。'
const PASSKEY_REGISTERED_MESSAGE = 'パスキーを登録しました'
// ユーザーがOSのダイアログをキャンセルした場合など、操作中断は失敗として強く表示しない
const PASSKEY_CANCELED_MESSAGE = 'パスキーの操作がキャンセルされました。'

export const PASSKEY_MESSAGES = {
  loginFailed: PASSKEY_LOGIN_FAILED_MESSAGE,
  registerFailed: PASSKEY_REGISTER_FAILED_MESSAGE,
  registered: PASSKEY_REGISTERED_MESSAGE,
  canceled: PASSKEY_CANCELED_MESSAGE,
}

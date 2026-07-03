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
// ユーザーがOSのダイアログをキャンセルした場合など、操作中断は失敗として強く表示しない
const PASSKEY_CANCELED_MESSAGE = 'パスキーの操作がキャンセルされました。'

export const PASSKEY_MESSAGES = {
  loginFailed: PASSKEY_LOGIN_FAILED_MESSAGE,
  canceled: PASSKEY_CANCELED_MESSAGE,
}

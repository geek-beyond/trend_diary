const PASSKEY_LOGIN_FAILED_MESSAGE = 'パスキーでのログインに失敗しました。'
const PASSKEY_REGISTER_FAILED_MESSAGE = 'パスキーの登録に失敗しました。'
const PASSKEY_REGISTERED_MESSAGE = 'パスキーを登録しました'
// ユーザーがOSのダイアログをキャンセルした場合など、操作中断は失敗として強く表示しない
const PASSKEY_CANCELED_MESSAGE = 'パスキーの操作がキャンセルされました。'
const PASSKEY_DISABLE_FAILED_MESSAGE = 'パスキーの無効化に失敗しました。'
const PASSKEY_DISABLED_MESSAGE = 'パスキーを無効にしました'

export const PASSKEY_MESSAGES = {
  loginFailed: PASSKEY_LOGIN_FAILED_MESSAGE,
  registerFailed: PASSKEY_REGISTER_FAILED_MESSAGE,
  registered: PASSKEY_REGISTERED_MESSAGE,
  canceled: PASSKEY_CANCELED_MESSAGE,
  disableFailed: PASSKEY_DISABLE_FAILED_MESSAGE,
  disabled: PASSKEY_DISABLED_MESSAGE,
}
